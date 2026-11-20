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

  for (let s0 = startMin; s0 < startMax; s0 += 512) {
    const s = snapToZeroCrossing(data, s0);
    if (s - win < 0) continue;
    let energy = 1e-9;
    for (let i = 0; i < win; i++) energy += data[s - win + i] * data[s - win + i];

    for (let e0 = endMin; e0 < endMax; e0 += 128) {
      const e = snapToZeroCrossing(data, e0);
      if (e >= data.length || e - win < 0) continue;
      let diff = 0;
      for (let i = 0; i < win; i++) {
        const delta = data[e - win + i] - data[s - win + i];
        diff += delta * delta;
      }
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