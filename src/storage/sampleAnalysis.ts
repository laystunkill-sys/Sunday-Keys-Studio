/**
 * sampleAnalysis.ts
 * Drop next to customSoundStore.ts (src/storage/).
 *
 * Replaces "guess from filename" with real analysis:
 *   - detectRootFromAudio : YIN pitch detection -> MIDI root note (+ cents off)
 *   - findLoopPoints      : finds a seamless sustain loop region (or null)
 *   - validateImportFile  : size / duration limits with friendly messages
 */

export const MAX_IMPORT_BYTES = 25 * 1024 * 1024; // 25 MB
export const MAX_IMPORT_SECONDS = 60;

export interface PitchResult {
  midi: number; // nearest MIDI note
  cents: number; // how far the sample is from that note (-50..+50)
  confidence: number; // 0..1
}

export interface LoopPoints {
  startSec: number;
  endSec: number;
}

function toMono(buffer: AudioBuffer): Float32Array {
  const n = buffer.length;
  const ch = buffer.numberOfChannels;
  const out = new Float32Array(n);
  for (let c = 0; c < ch; c++) {
    const d = buffer.getChannelData(c);
    for (let i = 0; i < n; i++) out[i] += d[i] / ch;
  }
  return out;
}

/** One YIN pitch estimate over a 4096-sample window. */
function yinFrame(
  data: Float32Array,
  start: number,
  sampleRate: number,
  minHz: number,
  maxHz: number,
): { freq: number; confidence: number } | null {
  const W = 4096;
  const minLag = Math.max(2, Math.floor(sampleRate / maxHz));
  const maxLag = Math.min(Math.ceil(sampleRate / minHz), 4096);
  if (start < 0 || start + W + maxLag >= data.length) return null;

  // Difference function
  const d = new Float32Array(maxLag + 1);
  for (let tau = 1; tau <= maxLag; tau++) {
    let sum = 0;
    for (let i = 0; i < W; i++) {
      const diff = data[start + i] - data[start + i + tau];
      sum += diff * diff;
    }
    d[tau] = sum;
  }

  // Cumulative mean normalised difference
  const cmnd = new Float32Array(maxLag + 1);
  cmnd[0] = 1;
  let running = 0;
  for (let tau = 1; tau <= maxLag; tau++) {
    running += d[tau];
    cmnd[tau] = running === 0 ? 1 : (d[tau] * tau) / running;
  }

  // First dip under threshold, walk to its local minimum
  const threshold = 0.15;
  let best = -1;
  for (let tau = minLag; tau < maxLag; tau++) {
    if (cmnd[tau] < threshold) {
      while (tau + 1 < maxLag && cmnd[tau + 1] < cmnd[tau]) tau++;
      best = tau;
      break;
    }
  }
  // Fallback: global minimum, but only if reasonably periodic
  if (best < 0) {
    let min = Infinity;
    for (let tau = minLag; tau < maxLag; tau++) {
      if (cmnd[tau] < min) {
        min = cmnd[tau];
        best = tau;
      }
    }
    if (best < 0 || min > 0.35) return null;
  }

  // Parabolic interpolation for sub-sample accuracy
  let refined = best;
  if (best > 1 && best < maxLag) {
    const a = cmnd[best - 1];
    const b = cmnd[best];
    const c = cmnd[best + 1];
    const denom = a - 2 * b + c;
    if (denom !== 0) refined = best + (a - c) / (2 * denom);
  }

  return { freq: sampleRate / refined, confidence: 1 - cmnd[best] };
}

/**
 * Detects the fundamental pitch of a sample. Returns null for noise,
 * drums or anything without a clear pitch (caller should fall back to
 * the filename guess / manual selection).
 */
export function detectRootFromAudio(
  buffer: AudioBuffer,
  onsetSec = 0,
): PitchResult | null {
  const data = toMono(buffer);
  const sr = buffer.sampleRate;
  const onset = Math.floor(onsetSec * sr);
  const usable = data.length - onset;
  if (usable < 4096 * 2) return null;

  // Sample the pitch at several points after the attack transient
  const offsets = [0.04 * sr, usable * 0.15, usable * 0.3, usable * 0.45];
  const freqs: number[] = [];
  for (const off of offsets) {
    const r = yinFrame(data, onset + Math.floor(off), sr, 27.5, 2100);
    if (r && r.confidence > 0.8) freqs.push(r.freq);
  }
  if (freqs.length === 0) return null;

  freqs.sort((a, b) => a - b);
  const median = freqs[Math.floor(freqs.length / 2)];
  const midiFloat = 69 + 12 * Math.log2(median / 440);
  const midi = Math.round(midiFloat);
  return {
    midi,
    cents: Math.round((midiFloat - midi) * 100),
    confidence: freqs.length / offsets.length,
  };
}

/** Moves idx forward to the next rising zero crossing so loops don't click. */
function snapToZeroCrossing(data: Float32Array, idx: number, maxSearch = 2000): number {
  const end = Math.min(data.length - 1, idx + maxSearch);
  for (let i = idx; i < end; i++) {
    if (data[i] <= 0 && data[i + 1] > 0) return i + 1;
  }
  return idx;
}

/**
 * Searches the sustained part of a sample for two points whose preceding
 * waveform matches, so looping between them is (nearly) seamless.
 * Returns null when the sound decays too much / isn't loopable.
 */
export function findLoopPoints(buffer: AudioBuffer, onsetSec = 0): LoopPoints | null {
  const data = toMono(buffer);
  const sr = buffer.sampleRate;
  const onset = Math.floor(onsetSec * sr);
  const usable = data.length - onset;
  if (usable < sr * 1.0) return null;

  const win = 512;
  const startMin = onset + Math.floor(usable * 0.35);
  const startMax = onset + Math.floor(usable * 0.5);
  const endMin = onset + Math.floor(usable * 0.8);
  const endMax = data.length - Math.floor(sr * 0.02);

  let bestScore = Infinity;
  let bestS = -1;
  let bestE = -1;

  const sStep = Math.max(512, Math.floor((startMax - startMin) / 60));
  const eStep = Math.max(128, Math.floor((endMax - endMin) / 300));

  for (let s0 = startMin; s0 < startMax; s0 += sStep) {
    const s = snapToZeroCrossing(data, s0);
    if (s - win < 0) continue;
    let energy = 1e-9;
    for (let i = 0; i < win; i++) energy += data[s - win + i] * data[s - win + i];

    for (let e0 = endMin; e0 < endMax; e0 += eStep) {
      const e = snapToZeroCrossing(data, e0);
      if (e >= data.length || e - win < 0) continue;
      let diff = 0;
      let energyE = 0;
      for (let i = 0; i < win; i++) {
        const b = data[e - win + i];
        const delta = b - data[s - win + i];
        diff += delta * delta;
        energyE += b * b;
      }
      // Reject loops whose end is quieter/louder than their start (> ~0.5 dB):
      // those audibly "pop" back up on every repeat.
      const level = Math.sqrt(energyE / energy);
      if (level < 0.94 || level > 1.06) continue;
      const score = diff / energy;
      if (score < bestScore) {
        bestScore = score;
        bestS = s;
        bestE = e;
      }
    }
  }

  if (bestS < 0 || bestScore > 0.25) return null;
  return { startSec: bestS / sr, endSec: bestE / sr };
}

/**
 * For decaying sounds (piano, keys, plucks) that have no steady sustain:
 * finds a short region in the tail (0.12-0.6 s) that can repeat smoothly,
 * so a held key keeps sounding instead of stopping when the sample ends.
 * The engine's envelope then fades it out like a real instrument.
 */
export function findTailLoop(buffer: AudioBuffer, onsetSec = 0): LoopPoints | null {
  const data = toMono(buffer);
  const sr = buffer.sampleRate;
  const onset = Math.floor(onsetSec * sr);
  const usable = data.length - onset;
  if (usable < sr * 0.8) return null;

  const win = 512;
  const minLen = Math.floor(sr * 0.12);
  const maxLen = Math.floor(sr * 0.6);
  const hardEnd = data.length - Math.floor(sr * 0.03);
  const startMin = onset + Math.floor(usable * 0.45);
  const startMax = onset + Math.floor(usable * 0.7);
  const sStep = Math.max(256, Math.floor((startMax - startMin) / 120));

  let bestScore = Infinity;
  let bestS = -1;
  let bestE = -1;

  for (let s0 = startMin; s0 < startMax; s0 += sStep) {
    const s = snapToZeroCrossing(data, s0);
    if (s - win < 0) continue;
    let energyS = 0;
    for (let i = 0; i < win; i++) energyS += data[s - win + i] * data[s - win + i];
    if (energyS < 1e-6) continue; // too quiet to loop

    for (let len = minLen; len <= maxLen; len += 64) {
      const e = snapToZeroCrossing(data, s + len, 200);
      if (e >= hardEnd) break;
      let diff = 0;
      let energyE = 0;
      for (let i = 0; i < win; i++) {
        const b = data[e - win + i];
        const delta = b - data[s - win + i];
        diff += delta * delta;
        energyE += b * b;
      }
      const level = Math.sqrt(energyE / energyS);
      if (level < 0.65 || level > 1.5) continue; // avoid audible volume jumps
      const score = diff / energyS;
      if (score < bestScore) {
        bestScore = score;
        bestS = s;
        bestE = e;
      }
    }
  }

  if (bestS < 0 || bestScore > 0.5) return null;
  return { startSec: bestS / sr, endSec: bestE / sr };
}

export interface ExtensionLoop extends LoopPoints {
  score: number; // 0 = perfect match, ~2 = unrelated
}

/**
 * Finds a longer region (0.5-1.4 s) in the tail of a sound whose end blends
 * cleanly back into its start. buildExtendedChannels() then repeats it with
 * crossfades and a continuing natural decay, so a held note keeps sounding
 * without audible "re-triggering". Returns null only for very short sounds.
 */
export function findExtensionLoop(buffer: AudioBuffer, onsetSec = 0): ExtensionLoop | null {
  const data = toMono(buffer);
  const sr = buffer.sampleRate;
  const onset = Math.floor(onsetSec * sr);
  const usable = data.length - onset;
  if (usable < sr * 0.5) return null;

  const minLen = Math.floor(Math.min(0.5 * sr, usable * 0.25));
  const maxLen = Math.floor(Math.min(1.4 * sr, usable * 0.5));
  const hardEnd = data.length - Math.floor(0.03 * sr);
  const startMin = onset + Math.floor(usable * 0.3);
  const startMax = onset + Math.floor(usable * 0.6);
  const sStep = Math.max(256, Math.floor((startMax - startMin) / 60));
  const lenStep = Math.max(64, Math.floor((maxLen - minLen) / 200));

  let bestScore = Infinity;
  let bestS = -1;
  let bestE = -1;

  for (let s0 = startMin; s0 < startMax; s0 += sStep) {
    const s = snapToZeroCrossing(data, s0);
    for (let len = minLen; len <= maxLen; len += lenStep) {
      const e = snapToZeroCrossing(data, s + len, 200);
      if (e >= hardEnd) break;
      const F = Math.max(1, Math.min(Math.floor(0.15 * sr), Math.floor((e - s) / 3), s));
      const stride = Math.max(1, Math.floor(F / 512));
      let ea = 0;
      let eb = 0;
      for (let i = 0; i < F; i += stride) {
        const a = data[s - F + i];
        const b = data[e - F + i];
        ea += a * a;
        eb += b * b;
      }
      if (ea < 1e-9 || eb < 1e-9) continue;
      const na = Math.sqrt(ea);
      const nb = Math.sqrt(eb);
      let diff = 0;
      let count = 0;
      for (let i = 0; i < F; i += stride) {
        const d = data[s - F + i] / na - data[e - F + i] / nb;
        diff += d * d;
        count++;
      }
      const score = diff / count;
      if (score < bestScore) {
        bestScore = score;
        bestS = s;
        bestE = e;
      }
    }
  }

  if (bestS < 0) return null;
  return { startSec: bestS / sr, endSec: bestE / sr, score: bestScore };
}

/**
 * Builds a long (default 30 s) version of a sound by repeating loop region
 * [loopStart, loopEnd) with equal crossfades. Each repeat is scaled so the
 * level continues the sound's natural decay instead of jumping back up.
 */
export function buildExtendedChannels(
  channels: Float32Array[],
  sampleRate: number,
  loopStartSec: number,
  loopEndSec: number,
  targetSec = 30,
): Float32Array[] {
  const ls = Math.floor(loopStartSec * sampleRate);
  const le = Math.min(Math.floor(loopEndSec * sampleRate), channels[0].length);
  const L = le - ls;
  if (L < 64 || ls < 1) return channels;
  const N = Math.max(le, Math.floor(targetSec * sampleRate));
  const F = Math.max(1, Math.min(Math.floor(0.15 * sampleRate), Math.floor(L / 3), ls));

  const rmsOf = (from: number, len: number): number => {
    let sum = 0;
    for (const c of channels) for (let i = 0; i < len; i++) sum += c[from + i] * c[from + i];
    return Math.sqrt(sum / (len * channels.length));
  };
  const ratio = Math.min(1, Math.max(0.05, rmsOf(le - F, F) / Math.max(1e-9, rmsOf(ls - F, F))));

  const out = channels.map((c) => {
    const o = new Float32Array(N);
    o.set(c.subarray(0, le));
    return o;
  });

  let w0 = le;
  let g = 1;
  while (w0 < N) {
    g *= ratio;
    for (let ch = 0; ch < channels.length; ch++) {
      const src = channels[ch];
      const o = out[ch];
      for (let i = 0; i < F; i++) {
        const w = i / F;
        o[w0 - F + i] = o[w0 - F + i] * (1 - w) + src[ls - F + i] * g * w;
      }
      const n = Math.min(L, N - w0);
      for (let i = 0; i < n; i++) o[w0 + i] = src[ls + i] * g;
    }
    w0 += L;
  }

  const tail = Math.floor(0.05 * sampleRate);
  for (const o of out) for (let i = 0; i < tail; i++) o[N - 1 - i] *= i / tail;
  return out;
}

/** Returns an error message, or null if the file is acceptable. */
export function validateImportFile(file: File): string | null {
  if (file.size > MAX_IMPORT_BYTES) {
    return `"${file.name}" is ${(file.size / 1048576).toFixed(1)} MB. Maximum is ${MAX_IMPORT_BYTES / 1048576} MB.`;
  }
  return null;
}

export function validateImportDuration(buffer: AudioBuffer, fileName: string): string | null {
  if (buffer.duration > MAX_IMPORT_SECONDS) {
    return `"${fileName}" is ${buffer.duration.toFixed(0)} s long. Trim it to ${MAX_IMPORT_SECONDS} s or less.`;
  }
  return null;
}