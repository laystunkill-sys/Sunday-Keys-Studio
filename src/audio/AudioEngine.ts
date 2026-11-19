import { INSTRUMENT_MAP, KEY_TO_SEMITONE } from '../data/instruments';
import {
  DelaySubdivision,
  InstrumentPreset,
  LayerConfig,
  MasterEffectsConfig,
  MusicalKey,
  TimeSignature,
  TonicPadConfig,
  TonicPresetId,
} from '../types/worship';

interface SlotChannel {
  filter: BiquadFilterNode;
  pan: StereoPannerNode;
  gain: GainNode;
  reverbSend: GainNode;
  delaySend: GainNode;
  analyser: AnalyserNode;
  analyserData: Uint8Array<ArrayBuffer>;
}

interface ActiveVoice {
  note: number;
  slotIndex: number;
  stop: (releaseScale?: number) => void;
}

interface TonicVoiceSet {
  oscillators: OscillatorNode[];
  gains: GainNode[];
  lfo: OscillatorNode;
  lfoGain: GainNode;
  filter: BiquadFilterNode;
  masterGain: GainNode;
  reverbSend: GainNode;
}

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function getSubdivisionFactor(sub: DelaySubdivision): number {
  switch (sub) {
    case '1/4':
      return 1;
    case '1/8.':
      return 0.75;
    case '1/8':
      return 0.5;
    case '1/16':
      return 0.25;
  }
}

export class WorshipAudioEngine {
  private ctx: AudioContext | null = null;
  private slotChannels: SlotChannel[] = [];

  private masterWarmthFilter: BiquadFilterNode | null = null;
  private masterCompressor: DynamicsCompressorNode | null = null;
  private masterGain: GainNode | null = null;
  private masterAnalyser: AnalyserNode | null = null;
  private masterData: Uint8Array<ArrayBuffer> = new Uint8Array(new ArrayBuffer(256));

  private reverbInput: GainNode | null = null;
  private convolver: ConvolverNode | null = null;
  private reverbWetGain: GainNode | null = null;
  private shimmerGain: GainNode | null = null;

  private delayInput: GainNode | null = null;
  private delayL: DelayNode | null = null;
  private delayR: DelayNode | null = null;
  private delayDampL: BiquadFilterNode | null = null;
  private delayDampR: BiquadFilterNode | null = null;
  private delayFeedbackL: GainNode | null = null;
  private delayFeedbackR: GainNode | null = null;
  private delayWetGain: GainNode | null = null;

  private layers: LayerConfig[] = [];
  private effects: MasterEffectsConfig | null = null;
  private tonicConfig: TonicPadConfig | null = null;
  private tonicVoice: TonicVoiceSet | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private activeVoices: Map<string, ActiveVoice> = new Map();
  private activePreviewGain: GainNode | null = null;
  private customInstruments: Map<string, InstrumentPreset> = new Map();
  private rawSampleBuffers: Map<string, ArrayBuffer> = new Map();
  private decodedSampleBuffers: Map<string, AudioBuffer> = new Map();
  private pressedNotes: Map<number, number> = new Map(); // midi -> velocity
  private sustainedNotes: Set<number> = new Set();
  private sustainDown = false;
  private modWheel = 0.25; // 0..1
  private transpose = 0;
  private bpm = 72;
  private timeSignature: TimeSignature = '4/4';

  // Metronome & Arp Scheduler
  private clickEnabled = false;
  private schedulerTimer: number | null = null;
  private nextClickTime = 0;
  private currentBeat = 0;
  private nextArpTime = 0;
  private arpStep = 0;
  private onBeatCallback: ((beat: number) => void) | null = null;

  public resolveInstrument(id: string): InstrumentPreset | undefined {
    return this.customInstruments.get(id) || INSTRUMENT_MAP[id];
  }

  public async decodeAudioDataSafe(raw: ArrayBuffer): Promise<AudioBuffer> {
    const copy = raw.slice(0);
    if (this.ctx) {
      return await this.ctx.decodeAudioData(copy);
    }
    const OfflineCtx =
      window.OfflineAudioContext ||
      (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext })
        .webkitOfflineAudioContext;
    const offline = new OfflineCtx(1, 1, 48000);
    return await offline.decodeAudioData(copy);
  }

  public async registerCustomSound(
    preset: InstrumentPreset,
    rawAudioData?: ArrayBuffer,
    decodedBuffer?: AudioBuffer,
  ): Promise<void> {
    this.customInstruments.set(preset.id, preset);
    if (rawAudioData) {
      this.rawSampleBuffers.set(preset.id, rawAudioData.slice(0));
    }
    if (decodedBuffer) {
      this.decodedSampleBuffers.set(preset.id, decodedBuffer);
    } else if (rawAudioData && !this.decodedSampleBuffers.has(preset.id)) {
      try {
        const decoded = await this.decodeAudioDataSafe(rawAudioData);
        this.decodedSampleBuffers.set(preset.id, decoded);
      } catch {
        // will retry on init
      }
    }
  }

  public updateCustomInstrumentMeta(preset: InstrumentPreset): void {
    this.customInstruments.set(preset.id, preset);
    this.syncLayerStrips();
  }

  public removeCustomSound(id: string): void {
    this.customInstruments.delete(id);
    this.rawSampleBuffers.delete(id);
    this.decodedSampleBuffers.delete(id);
  }

  public isRunning(): boolean {
    return this.ctx !== null && this.ctx.state === 'running';
  }

  public getState(): AudioContextState | 'uninitialized' {
    return this.ctx ? this.ctx.state : 'uninitialized';
  }

  public getSampleRate(): number {
    return this.ctx ? this.ctx.sampleRate : 48000;
  }

  public getActiveVoiceCount(): number {
    return this.activeVoices.size;
  }

  public async init(): Promise<void> {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx({ latencyHint: 'interactive' });
      this.noiseBuffer = this.createNoiseBuffer();
      this.buildGraph();
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    // Ensure all registered custom audio samples are decoded
    for (const [id, raw] of this.rawSampleBuffers.entries()) {
      if (!this.decodedSampleBuffers.has(id)) {
        try {
          const decoded = await this.ctx.decodeAudioData(raw.slice(0));
          this.decodedSampleBuffers.set(id, decoded);
        } catch {
          // ignore corrupted sample
        }
      }
    }
    this.syncAllParameters();
  }

  private buildGraph(): void {
    if (!this.ctx) return;
    const ctx = this.ctx;

    this.masterWarmthFilter = ctx.createBiquadFilter();
    this.masterWarmthFilter.type = 'lowpass';
    this.masterWarmthFilter.frequency.value = 14000;
    this.masterWarmthFilter.Q.value = 0.5;

    this.masterCompressor = ctx.createDynamicsCompressor();
    this.masterCompressor.threshold.value = -12;
    this.masterCompressor.knee.value = 18;
    this.masterCompressor.ratio.value = 4;
    this.masterCompressor.attack.value = 0.005;
    this.masterCompressor.release.value = 0.15;

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0.85;

    this.masterAnalyser = ctx.createAnalyser();
    this.masterAnalyser.fftSize = 256;
    this.masterData = new Uint8Array(new ArrayBuffer(this.masterAnalyser.frequencyBinCount));

    this.masterWarmthFilter.connect(this.masterCompressor);
    this.masterCompressor.connect(this.masterGain);
    this.masterGain.connect(this.masterAnalyser);
    this.masterAnalyser.connect(ctx.destination);

    // Build Cathedral Shimmer Reverb
    this.reverbInput = ctx.createGain();
    this.convolver = ctx.createConvolver();
    this.convolver.buffer = this.createImpulseResponse(4.0, 2.4);

    const reverbHighCut = ctx.createBiquadFilter();
    reverbHighCut.type = 'lowpass';
    reverbHighCut.frequency.value = 5200;

    this.reverbWetGain = ctx.createGain();
    this.reverbWetGain.gain.value = 0.42;

    // Shimmer feedback loop (bandpass bright texture delay fed back softly into reverb)
    const shimmerBand = ctx.createBiquadFilter();
    shimmerBand.type = 'bandpass';
    shimmerBand.frequency.value = 1760;
    shimmerBand.Q.value = 0.7;
    const shimmerDelay = ctx.createDelay(0.5);
    shimmerDelay.delayTime.value = 0.085;
    this.shimmerGain = ctx.createGain();
    this.shimmerGain.gain.value = 0.16;

    this.reverbInput.connect(this.convolver);
    this.convolver.connect(reverbHighCut);
    reverbHighCut.connect(this.reverbWetGain);
    this.reverbWetGain.connect(this.masterWarmthFilter);

    reverbHighCut.connect(shimmerBand);
    shimmerBand.connect(shimmerDelay);
    shimmerDelay.connect(this.shimmerGain);
    this.shimmerGain.connect(this.convolver);

    // Build Stereo Ping-Pong Delay
    this.delayInput = ctx.createGain();
    this.delayL = ctx.createDelay(2.5);
    this.delayR = ctx.createDelay(2.5);
    this.delayDampL = ctx.createBiquadFilter();
    this.delayDampR = ctx.createBiquadFilter();
    this.delayDampL.type = 'lowpass';
    this.delayDampR.type = 'lowpass';
    this.delayDampL.frequency.value = 2800;
    this.delayDampR.frequency.value = 2400;

    this.delayFeedbackL = ctx.createGain();
    this.delayFeedbackR = ctx.createGain();
    this.delayFeedbackL.gain.value = 0.35;
    this.delayFeedbackR.gain.value = 0.35;

    const merger = ctx.createChannelMerger(2);
    this.delayWetGain = ctx.createGain();
    this.delayWetGain.gain.value = 0.25;

    this.delayInput.connect(this.delayL);
    this.delayL.connect(this.delayDampL);
    this.delayDampL.connect(this.delayFeedbackL);
    this.delayFeedbackL.connect(this.delayR);

    this.delayR.connect(this.delayDampR);
    this.delayDampR.connect(this.delayFeedbackR);
    this.delayFeedbackR.connect(this.delayL);

    this.delayDampL.connect(merger, 0, 0);
    this.delayDampR.connect(merger, 0, 1);
    merger.connect(this.delayWetGain);
    this.delayWetGain.connect(this.masterWarmthFilter);

    // Build 5 Layer Channel Strips
    this.slotChannels = Array.from({ length: 5 }, () => {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 4000;
      filter.Q.value = 0.7;

      const pan = ctx.createStereoPanner();
      const gain = ctx.createGain();
      gain.gain.value = 0.7;

      const reverbSend = ctx.createGain();
      reverbSend.gain.value = 0.4;

      const delaySend = ctx.createGain();
      delaySend.gain.value = 0.2;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      const analyserData = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));

      filter.connect(pan);
      pan.connect(gain);
      gain.connect(analyser);
      analyser.connect(this.masterWarmthFilter!);

      gain.connect(reverbSend);
      reverbSend.connect(this.reverbInput!);

      gain.connect(delaySend);
      delaySend.connect(this.delayInput!);

      return { filter, pan, gain, reverbSend, delaySend, analyser, analyserData };
    });

    this.startSchedulerLoop();
  }

  private createImpulseResponse(durationSec: number, decay: number): AudioBuffer {
    const ctx = this.ctx!;
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * durationSec);
    const impulse = ctx.createBuffer(2, length, sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      let prev = 0;
      for (let i = 0; i < length; i++) {
        const t = i / length;
        // Soft attack fade-in over first 25ms to avoid reverb slap
        const fadeIn = Math.min(1, i / (sampleRate * 0.025));
        const envelope = fadeIn * Math.pow(1 - t, decay);
        const white = Math.random() * 2 - 1;
        // One-pole lowpass smoothing for warm dark hall character
        prev = prev * 0.65 + white * 0.35;
        data[i] = prev * envelope * 0.6;
      }
    }
    return impulse;
  }

  public updateLayers(layers: LayerConfig[]): void {
    this.layers = layers.map((l) => ({ ...l }));
    this.syncLayerStrips();
  }

  public updateEffects(effects: MasterEffectsConfig): void {
    this.effects = { ...effects };
    this.syncMasterEffects();
  }

  public updateTempo(bpm: number, timeSignature: TimeSignature): void {
    this.bpm = Math.max(40, Math.min(220, bpm));
    this.timeSignature = timeSignature;
    this.syncMasterEffects();
  }

  public setModWheel(val: number): void {
    this.modWheel = Math.max(0, Math.min(1, val));
    this.syncLayerStrips();
  }

  public setTranspose(semitones: number): void {
    this.transpose = Math.max(-12, Math.min(12, semitones));
  }

  public setClickEnabled(enabled: boolean): void {
    this.clickEnabled = enabled;
    if (this.ctx && enabled) {
      this.nextClickTime = this.ctx.currentTime + 0.05;
      this.currentBeat = 0;
    }
  }

  public setOnBeatCallback(cb: ((beat: number) => void) | null): void {
    this.onBeatCallback = cb;
  }

  private syncAllParameters(): void {
    this.syncLayerStrips();
    this.syncMasterEffects();
    if (this.tonicConfig) {
      this.updateTonicPad(this.tonicConfig);
    }
  }

  private syncLayerStrips(): void {
    if (!this.ctx || this.slotChannels.length === 0 || this.layers.length === 0) return;
    const now = this.ctx.currentTime;
    const anySoloed = this.layers.some((l) => l.soloed);

    this.layers.forEach((layer, idx) => {
      const strip = this.slotChannels[idx];
      if (!strip) return;

      const isAudible = layer.enabled && !layer.muted && (!anySoloed || layer.soloed);
      const inst = this.resolveInstrument(layer.instrumentId);
      const baseCut = inst ? inst.baseCutoffHz : 2500;

      // Mod wheel smoothly opens filter cutoff and adds subtle swell boost
      const modBoost = this.modWheel * layer.modWheelSensitivity;
      const targetCutoff = Math.min(
        18000,
        Math.max(180, baseCut * (0.32 + layer.brightness * 1.1 + modBoost * 1.45)),
      );
      const swellGain = 1 - layer.modWheelSensitivity * 0.25 + modBoost * 0.35;
      const targetGain = isAudible ? Math.max(0, Math.min(1.2, layer.volume * swellGain)) : 0;

      strip.gain.gain.setTargetAtTime(targetGain, now, 0.025);
      strip.filter.frequency.setTargetAtTime(targetCutoff, now, 0.03);
      strip.pan.pan.setTargetAtTime(layer.pan, now, 0.02);
      strip.reverbSend.gain.setTargetAtTime(layer.reverbSend * 0.9, now, 0.03);
      strip.delaySend.gain.setTargetAtTime(layer.delaySend * 0.85, now, 0.03);
    });
  }

  private syncMasterEffects(): void {
    if (!this.ctx || !this.effects) return;
    const now = this.ctx.currentTime;
    const fx = this.effects;

    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(fx.masterVolume * 0.95, now, 0.025);
    }
    if (this.masterWarmthFilter) {
      // Warmth 0 = brighter (17kHz), Warmth 1 = warmer (3.2kHz)
      const freq = 17500 - fx.warmth * 12500;
      this.masterWarmthFilter.frequency.setTargetAtTime(freq, now, 0.04);
    }
    if (this.masterCompressor) {
      this.masterCompressor.ratio.setTargetAtTime(fx.compressorEnabled ? 4.5 : 1, now, 0.05);
    }
    if (this.reverbWetGain) {
      this.reverbWetGain.gain.setTargetAtTime(fx.reverbMix * 1.15, now, 0.04);
    }
    if (this.shimmerGain) {
      this.shimmerGain.gain.setTargetAtTime(fx.shimmerAmount * 0.26, now, 0.05);
    }
    if (this.delayWetGain && this.delayL && this.delayR && this.delayFeedbackL && this.delayFeedbackR) {
      const quarterSec = 60 / this.bpm;
      const delayTime = Math.min(2.2, Math.max(0.06, quarterSec * getSubdivisionFactor(fx.delaySubdivision)));
      this.delayL.delayTime.setTargetAtTime(delayTime, now, 0.06);
      this.delayR.delayTime.setTargetAtTime(delayTime * 1.015, now, 0.06);
      this.delayFeedbackL.gain.setTargetAtTime(fx.delayFeedback, now, 0.04);
      this.delayFeedbackR.gain.setTargetAtTime(fx.delayFeedback, now, 0.04);
      this.delayWetGain.gain.setTargetAtTime(fx.delayMix * 0.9, now, 0.04);
    }
  }

  public async noteOn(midiNote: number, velocity = 0.8): Promise<void> {
    if (!this.ctx) {
      await this.init();
    } else if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    if (!this.ctx) return;

    this.pressedNotes.set(midiNote, velocity);
    this.sustainedNotes.delete(midiNote);

    const anySoloed = this.layers.some((l) => l.soloed);

    this.layers.forEach((layer, slotIdx) => {
      if (!layer.enabled || layer.muted || (anySoloed && !layer.soloed)) return;
      if (midiNote < layer.lowNote || midiNote > layer.highNote) return;

      const inst = this.resolveInstrument(layer.instrumentId);
      if (!inst) return;
      if (inst.isArp) return; // Arp notes are driven by the BPM scheduler while held in pressedNotes/sustainedNotes

      this.triggerVoice(midiNote, velocity, layer, slotIdx);
    });
  }

  public noteOff(midiNote: number): void {
    this.pressedNotes.delete(midiNote);
    if (this.sustainDown) {
      this.sustainedNotes.add(midiNote);
      return;
    }
    this.releaseVoicesForNote(midiNote);
  }

  public setSustain(down: boolean): void {
    this.sustainDown = down;
    if (!down) {
      const toRelease = Array.from(this.sustainedNotes);
      this.sustainedNotes.clear();
      toRelease.forEach((n) => {
        if (!this.pressedNotes.has(n)) {
          this.releaseVoicesForNote(n);
        }
      });
    }
  }

  public panic(): void {
    this.pressedNotes.clear();
    this.sustainedNotes.clear();
    this.sustainDown = false;
    this.activeVoices.forEach((voice) => voice.stop(0.05));
    this.activeVoices.clear();
  }

  private releaseVoicesForNote(midiNote: number): void {
    for (let slotIdx = 0; slotIdx < 5; slotIdx++) {
      const key = `${slotIdx}:${midiNote}`;
      const voice = this.activeVoices.get(key);
      if (voice) {
        voice.stop();
        this.activeVoices.delete(key);
      }
    }
  }

  private createNoiseBuffer(): AudioBuffer {
    const ctx = this.ctx!;
    const length = Math.floor(ctx.sampleRate * 0.25);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private createDriveCurve(amount: number): Float32Array<ArrayBuffer> {
    const samples = 256;
    const curve = new Float32Array(new ArrayBuffer(samples * 4));
    const k = 1 + amount * 14;
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = Math.tanh(x * k) / Math.tanh(k);
    }
    return curve;
  }

  private spawnInstrumentVoice(
    inst: InstrumentPreset,
    freq: number,
    velocity: number,
    startTime: number,
    destination: AudioNode,
    attackScale = 1,
    releaseScale = 1,
    autoHoldSec?: number,
  ): { stop: (releaseOverride?: number) => void } {
    const ctx = this.ctx!;
    const velGain = 0.3 + velocity * 0.7;
    const peakGain = (inst.isCustomSample ? 0.44 : 0.28) * velGain;

    const envGain = ctx.createGain();
    envGain.gain.setValueAtTime(0.0001, startTime);

    const voiceFilter = ctx.createBiquadFilter();
    voiceFilter.type = 'lowpass';
    voiceFilter.frequency.setValueAtTime(
      Math.min(18000, inst.baseCutoffHz * (0.65 + velocity * 0.75)),
      startTime,
    );
    voiceFilter.Q.value = inst.resonance;

    // Optional Amplitude Tremolo Stage
    const tremoloGain = ctx.createGain();
    tremoloGain.gain.value = 1;

    // Optional Warm Saturation Drive Stage
    let postFilterNode: AudioNode = voiceFilter;
    if (inst.warmDrive && inst.warmDrive > 0) {
      const shaper = ctx.createWaveShaper();
      shaper.curve = this.createDriveCurve(inst.warmDrive);
      shaper.oversample = '2x';
      voiceFilter.connect(shaper);
      postFilterNode = shaper;
    }

    postFilterNode.connect(tremoloGain);
    tremoloGain.connect(envGain);
    envGain.connect(destination);

    const attack = Math.max(0.004, inst.attack * attackScale);
    const decay = Math.max(0.04, inst.decay);
    const sustainLevel = Math.max(0.001, inst.sustain);
    const release = Math.max(0.04, inst.release * releaseScale);

    envGain.gain.linearRampToValueAtTime(peakGain, startTime + attack);
    envGain.gain.exponentialRampToValueAtTime(
      Math.max(0.001, peakGain * sustainLevel),
      startTime + attack + decay,
    );

    const oscs: AudioScheduledSourceNode[] = [];

    // Pitch Wow/Flutter LFO (shared across voice oscillators)
    let pitchLfo: OscillatorNode | null = null;
    let pitchLfoGain: GainNode | null = null;
    if (inst.pitchLfoRateHz && inst.pitchLfoCents) {
      pitchLfo = ctx.createOscillator();
      pitchLfo.type = 'sine';
      pitchLfo.frequency.value = inst.pitchLfoRateHz;
      pitchLfoGain = ctx.createGain();
      pitchLfoGain.gain.value = inst.pitchLfoCents;
      pitchLfo.connect(pitchLfoGain);
      pitchLfo.start(startTime);
    }

    // Custom Imported Audio Sample Playback (chromatically pitch-shifted)
    const sampleBuffer = inst.isCustomSample
      ? this.decodedSampleBuffers.get(inst.id)
      : undefined;

    if (inst.isCustomSample && sampleBuffer) {
      const sampleSrc = ctx.createBufferSource();
      sampleSrc.buffer = sampleBuffer;

      const rootFreq = midiToFreq(inst.sampleRootMidi ?? 60);
      sampleSrc.playbackRate.setValueAtTime(freq / rootFreq, startTime);

      const trimStart = Math.min(
        Math.max(0, inst.sampleTrimStartSec ?? 0),
        Math.max(0, sampleBuffer.duration - 0.03),
      );

      if (inst.sampleLoop) {
        sampleSrc.loop = true;
        sampleSrc.loopStart = trimStart;
        sampleSrc.loopEnd = sampleBuffer.duration;
      }

      if (pitchLfoGain) {
        pitchLfoGain.connect(sampleSrc.detune);
      }

      sampleSrc.connect(voiceFilter);
      sampleSrc.start(startTime, trimStart);
      oscs.push(sampleSrc);
    } else {
      // Optional FM Modulator (for DX7 / Bell / Synth Keys)
      let fmModOsc: OscillatorNode | null = null;
      let fmModGain: GainNode | null = null;
      if (inst.fmModRatio && inst.fmModDepthHz) {
        fmModOsc = ctx.createOscillator();
        fmModOsc.type = 'sine';
        fmModOsc.frequency.setValueAtTime(freq * inst.fmModRatio, startTime);
        fmModGain = ctx.createGain();
        const fmDepth = inst.fmModDepthHz * (0.45 + velocity * 0.75);
        fmModGain.gain.setValueAtTime(fmDepth, startTime);
        fmModGain.gain.exponentialRampToValueAtTime(
          Math.max(1, fmDepth * 0.08),
          startTime + (inst.fmDecaySec || 0.75),
        );
        fmModOsc.connect(fmModGain);
        fmModOsc.start(startTime);
        oscs.push(fmModOsc);
      }

      inst.oscillators.forEach((oscDef, idx) => {
        const osc = ctx.createOscillator();
        osc.type = oscDef.type;
        osc.frequency.setValueAtTime(freq * Math.pow(2, oscDef.octaveOffset), startTime);
        osc.detune.setValueAtTime(oscDef.detuneCents, startTime);

        if (pitchLfoGain) {
          pitchLfoGain.connect(osc.detune);
        }
        if (fmModGain && idx === 0) {
          fmModGain.connect(osc.frequency);
        }

        const oscGain = ctx.createGain();
        oscGain.gain.value = oscDef.gain;

        osc.connect(oscGain);
        oscGain.connect(voiceFilter);
        osc.start(startTime);
        oscs.push(osc);
      });
    }

    // Optional Felt Mechanical Hammer Thump Noise (for Felt Piano & Flannel Swarm)
    if (inst.feltNoiseAmount && inst.feltNoiseAmount > 0 && this.noiseBuffer) {
      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = this.noiseBuffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(310, startTime);
      noiseFilter.Q.value = 1.2;

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.18 * inst.feltNoiseAmount * velGain, startTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.055);

      noiseSrc.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(envGain);
      noiseSrc.start(startTime);
      noiseSrc.stop(startTime + 0.065);
    }

    // Optional crisp acoustic hammer strike transient
    if (inst.hammerTransient && inst.hammerTransient > 0) {
      const clickOsc = ctx.createOscillator();
      clickOsc.type = 'triangle';
      clickOsc.frequency.setValueAtTime(freq * 4.5, startTime);
      clickOsc.frequency.exponentialRampToValueAtTime(freq * 1.4, startTime + 0.024);

      const clickGain = ctx.createGain();
      clickGain.gain.setValueAtTime(0.09 * inst.hammerTransient * velGain, startTime);
      clickGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.032);

      clickOsc.connect(clickGain);
      clickGain.connect(voiceFilter);
      clickOsc.start(startTime);
      clickOsc.stop(startTime + 0.04);
    }

    // Optional Filter LFO
    let lfoOsc: OscillatorNode | null = null;
    if (inst.lfoRateHz && inst.lfoDepthHz) {
      lfoOsc = ctx.createOscillator();
      lfoOsc.type = 'sine';
      lfoOsc.frequency.value = inst.lfoRateHz;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = inst.lfoDepthHz;
      lfoOsc.connect(lfoGain);
      lfoGain.connect(voiceFilter.frequency);
      lfoOsc.start(startTime);
    }

    // Optional Amplitude Tremolo LFO (Rhodes / Wurli / Vibes)
    let tremLfo: OscillatorNode | null = null;
    if (inst.tremoloRateHz && inst.tremoloDepth) {
      tremLfo = ctx.createOscillator();
      tremLfo.type = 'sine';
      tremLfo.frequency.value = inst.tremoloRateHz;
      const tremGain = ctx.createGain();
      tremGain.gain.value = inst.tremoloDepth * 0.45;
      tremLfo.connect(tremGain);
      tremGain.connect(tremoloGain.gain);
      tremLfo.start(startTime);
    }

    // Optional Swarm / Shimmer Secondary Bloom Layer (Flannel Swarm & Ambient Shimmer)
    let swarmGain: GainNode | null = null;
    if (inst.swarmMode) {
      swarmGain = ctx.createGain();
      swarmGain.gain.setValueAtTime(0.0001, startTime);
      swarmGain.gain.linearRampToValueAtTime(
        inst.swarmMode === 'suspense' ? 0.19 * velGain : 0.14 * velGain,
        startTime + 0.34,
      );
      swarmGain.connect(voiceFilter);

      const swarmRatios =
        inst.swarmMode === 'fragile'
          ? [
              { mult: 2, detune: -14, type: 'sine' as OscillatorType, gain: 0.45 },
              { mult: 2, detune: 14, type: 'sine' as OscillatorType, gain: 0.45 },
              { mult: 3, detune: 5, type: 'sine' as OscillatorType, gain: 0.25 },
            ]
          : inst.swarmMode === 'suspense'
            ? [
                { mult: 0.5, detune: -10, type: 'triangle' as OscillatorType, gain: 0.5 },
                { mult: 1, detune: -24, type: 'sawtooth' as OscillatorType, gain: 0.25 },
                { mult: 1, detune: 24, type: 'sawtooth' as OscillatorType, gain: 0.25 },
              ]
            : [
                { mult: 2, detune: -10, type: 'sine' as OscillatorType, gain: 0.45 },
                { mult: 4, detune: 10, type: 'sine' as OscillatorType, gain: 0.25 },
              ];

      swarmRatios.forEach((sr) => {
        const sOsc = ctx.createOscillator();
        sOsc.type = sr.type;
        sOsc.frequency.setValueAtTime(freq * sr.mult, startTime);
        sOsc.detune.setValueAtTime(sr.detune, startTime);
        const sg = ctx.createGain();
        sg.gain.value = sr.gain;
        sOsc.connect(sg);
        sg.connect(swarmGain!);
        sOsc.start(startTime);
        oscs.push(sOsc);
      });
    }

    let stopped = false;
    const stop = (releaseScaleOverride?: number) => {
      if (stopped) return;
      stopped = true;
      const stopTime = Math.max(ctx.currentTime, startTime);
      const rel = releaseScaleOverride !== undefined ? releaseScaleOverride : release;
      envGain.gain.cancelScheduledValues(stopTime);
      envGain.gain.setValueAtTime(Math.max(0.0001, envGain.gain.value), stopTime);
      envGain.gain.exponentialRampToValueAtTime(0.0001, stopTime + rel);

      if (swarmGain) {
        swarmGain.gain.cancelScheduledValues(stopTime);
        swarmGain.gain.setValueAtTime(Math.max(0.0001, swarmGain.gain.value), stopTime);
        swarmGain.gain.exponentialRampToValueAtTime(0.0001, stopTime + rel * 1.15);
      }

      const end = stopTime + rel * 1.2 + 0.05;
      oscs.forEach((o) => {
        try {
          o.stop(end);
        } catch {
          // ignore
        }
      });
      [lfoOsc, pitchLfo, tremLfo].forEach((mod) => {
        if (mod) {
          try {
            mod.stop(end);
          } catch {
            // ignore
          }
        }
      });

      const cleanupDelayMs = Math.max(200, (end - ctx.currentTime + 0.1) * 1000);
      window.setTimeout(() => {
        try {
          envGain.disconnect();
          voiceFilter.disconnect();
        } catch {
          // ignore
        }
      }, cleanupDelayMs);
    };

    if (autoHoldSec !== undefined) {
      const holdUntil = startTime + autoHoldSec;
      const tPeak = startTime + attack;
      const vPeak = peakGain;
      const vSustain = Math.max(0.001, vPeak * sustainLevel);
      let vAtHold = vSustain;
      if (holdUntil > tPeak && holdUntil < tPeak + decay) {
        const frac = (holdUntil - tPeak) / decay;
        vAtHold = vPeak * Math.pow(vSustain / vPeak, frac);
      } else if (holdUntil <= tPeak) {
        vAtHold = Math.max(0.001, vPeak * ((holdUntil - startTime) / attack));
      }

      envGain.gain.cancelScheduledValues(holdUntil);
      envGain.gain.setValueAtTime(vAtHold, holdUntil);
      envGain.gain.exponentialRampToValueAtTime(0.0001, holdUntil + release);

      if (swarmGain) {
        const swarmTarget = inst.swarmMode === 'suspense' ? 0.19 * velGain : 0.14 * velGain;
        swarmGain.gain.cancelScheduledValues(holdUntil);
        swarmGain.gain.setValueAtTime(swarmTarget, holdUntil);
        swarmGain.gain.exponentialRampToValueAtTime(0.0001, holdUntil + release * 1.15);
      }

      const end = holdUntil + release * 1.2 + 0.06;
      oscs.forEach((o) => {
        try {
          o.stop(end);
        } catch {
          // ignore
        }
      });
      [lfoOsc, pitchLfo, tremLfo].forEach((mod) => {
        try {
          mod?.stop(end);
        } catch {
          // ignore
        }
      });
      window.setTimeout(() => {
        try {
          envGain.disconnect();
          voiceFilter.disconnect();
        } catch {
          // ignore
        }
      }, (end - ctx.currentTime + 0.15) * 1000);
    }

    return { stop };
  }

  private triggerVoice(
    midiNote: number,
    velocity: number,
    layer: LayerConfig,
    slotIdx: number,
    customDurationSec?: number,
  ): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const strip = this.slotChannels[slotIdx];
    const inst = this.resolveInstrument(layer.instrumentId);
    if (!strip || !inst) return;

    const voiceKey = `${slotIdx}:${midiNote}`;
    const existing = this.activeVoices.get(voiceKey);
    if (existing && !customDurationSec) {
      existing.stop(0.04);
      this.activeVoices.delete(voiceKey);
    }

    const now = ctx.currentTime;
    const shiftedNote = midiNote + this.transpose + layer.octave * 12;
    const freq = midiToFreq(shiftedNote);

    const voiceHandle = this.spawnInstrumentVoice(
      inst,
      freq,
      velocity,
      now,
      strip.filter,
      layer.attackScale,
      layer.releaseScale,
    );

    if (customDurationSec) {
      window.setTimeout(() => voiceHandle.stop(), customDurationSec * 1000);
      return;
    }

    this.activeVoices.set(voiceKey, {
      note: midiNote,
      slotIndex: slotIdx,
      stop: voiceHandle.stop,
    });
  }

  // TONIC PAD DRONE ENGINE
  public async updateTonicPad(config: TonicPadConfig): Promise<void> {
    const prevKey = this.tonicConfig?.key;
    const prevPreset = this.tonicConfig?.preset;
    const wasActive = this.tonicConfig?.active ?? false;
    this.tonicConfig = { ...config };

    if (config.active && !this.ctx) {
      await this.init();
    }
    if (!this.ctx || !this.masterWarmthFilter || !this.reverbInput) return;

    const now = this.ctx.currentTime;

    if (!config.active) {
      if (this.tonicVoice) {
        this.fadeOutTonicVoice(this.tonicVoice, 1.4);
        this.tonicVoice = null;
      }
      return;
    }

    // Key or preset changed while active -> smooth crossfade
    if (!wasActive || !this.tonicVoice || prevKey !== config.key || prevPreset !== config.preset) {
      if (this.tonicVoice) {
        this.fadeOutTonicVoice(this.tonicVoice, 1.3);
        this.tonicVoice = null;
      }
      this.tonicVoice = this.createTonicVoice(config.key, config.preset, config.volume, config.brightness);
      return;
    }

    // Live parameter tweaks (volume & brightness)
    const targetVol = config.volume * 0.24;
    this.tonicVoice.masterGain.gain.setTargetAtTime(targetVol, now, 0.06);
    const cutoff = this.getTonicCutoff(config.preset, config.brightness);
    this.tonicVoice.filter.frequency.setTargetAtTime(cutoff, now, 0.08);
  }

  private getTonicCutoff(preset: TonicPresetId, brightness: number): number {
    switch (preset) {
      case 'warm-analog':
        return 260 + brightness * 1400;
      case 'shimmer-cathedral':
        return 420 + brightness * 2400;
      case 'deep-sub':
        return 180 + brightness * 700;
      case 'glassy-air':
        return 600 + brightness * 2800;
    }
  }

  private createTonicVoice(
    key: MusicalKey,
    preset: TonicPresetId,
    volume: number,
    brightness: number,
  ): TonicVoiceSet {
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const baseMidi = 36 + KEY_TO_SEMITONE[key]; // C2 range

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(this.getTonicCutoff(preset, brightness), now);
    filter.Q.value = preset === 'shimmer-cathedral' ? 1.4 : 0.8;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.gain.linearRampToValueAtTime(Math.max(0.001, volume * 0.24), now + 1.2);

    const reverbSend = ctx.createGain();
    reverbSend.gain.value = preset === 'deep-sub' ? 0.45 : 0.85;

    filter.connect(masterGain);
    masterGain.connect(this.masterWarmthFilter!);
    masterGain.connect(reverbSend);
    reverbSend.connect(this.reverbInput!);

    // LFO breathing filter sweep
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.14;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = preset === 'deep-sub' ? 90 : 240;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start(now);

    const partials: { semi: number; detune: number; type: OscillatorType; gain: number }[] =
      preset === 'deep-sub'
        ? [
            { semi: 0, detune: 0, type: 'sine', gain: 0.55 },
            { semi: 12, detune: -6, type: 'triangle', gain: 0.3 },
            { semi: 12, detune: 6, type: 'sawtooth', gain: 0.18 },
            { semi: 19, detune: 0, type: 'sine', gain: 0.2 },
          ]
        : preset === 'glassy-air'
          ? [
              { semi: 12, detune: -8, type: 'triangle', gain: 0.35 },
              { semi: 12, detune: 8, type: 'triangle', gain: 0.35 },
              { semi: 19, detune: 3, type: 'sine', gain: 0.28 },
              { semi: 24, detune: -4, type: 'sine', gain: 0.25 },
            ]
          : preset === 'shimmer-cathedral'
            ? [
                { semi: 0, detune: 0, type: 'sine', gain: 0.38 },
                { semi: 12, detune: -10, type: 'sawtooth', gain: 0.26 },
                { semi: 12, detune: 10, type: 'sawtooth', gain: 0.26 },
                { semi: 19, detune: 4, type: 'triangle', gain: 0.24 },
                { semi: 24, detune: -5, type: 'sine', gain: 0.22 },
              ]
            : [
                { semi: 0, detune: 0, type: 'sine', gain: 0.42 },
                { semi: 12, detune: -9, type: 'sawtooth', gain: 0.26 },
                { semi: 12, detune: 9, type: 'sawtooth', gain: 0.26 },
                { semi: 19, detune: 0, type: 'triangle', gain: 0.22 },
              ];

    const oscillators: OscillatorNode[] = [];
    const gains: GainNode[] = [];

    partials.forEach((p) => {
      const osc = ctx.createOscillator();
      osc.type = p.type;
      osc.frequency.setValueAtTime(midiToFreq(baseMidi + p.semi), now);
      osc.detune.setValueAtTime(p.detune, now);
      const g = ctx.createGain();
      g.gain.value = p.gain;
      osc.connect(g);
      g.connect(filter);
      osc.start(now);
      oscillators.push(osc);
      gains.push(g);
    });

    return { oscillators, gains, lfo, lfoGain, filter, masterGain, reverbSend };
  }

  private fadeOutTonicVoice(voice: TonicVoiceSet, fadeSec: number): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    voice.masterGain.gain.cancelScheduledValues(now);
    voice.masterGain.gain.setValueAtTime(Math.max(0.0001, voice.masterGain.gain.value), now);
    voice.masterGain.gain.exponentialRampToValueAtTime(0.0001, now + fadeSec);
    const stopAt = now + fadeSec + 0.05;
    voice.oscillators.forEach((o) => {
      try {
        o.stop(stopAt);
      } catch {
        // ignore
      }
    });
    try {
      voice.lfo.stop(stopAt);
    } catch {
      // ignore
    }
    window.setTimeout(() => {
      try {
        voice.masterGain.disconnect();
        voice.filter.disconnect();
        voice.reverbSend.disconnect();
      } catch {
        // ignore
      }
    }, (fadeSec + 0.15) * 1000);
  }

  // SCHEDULER FOR CLICK & TEMPO-SYNCED ARP
  private startSchedulerLoop(): void {
    if (this.schedulerTimer !== null) return;
    this.nextClickTime = this.ctx!.currentTime + 0.05;
    this.nextArpTime = this.ctx!.currentTime + 0.05;

    this.schedulerTimer = window.setInterval(() => {
      if (!this.ctx || this.ctx.state !== 'running') return;
      const now = this.ctx.currentTime;
      const lookahead = 0.09;

      // 1. Metronome Click
      const beatSec = 60 / this.bpm;
      const beatsPerBar = this.timeSignature === '3/4' ? 3 : this.timeSignature === '6/8' ? 6 : 4;
      while (this.nextClickTime < now + lookahead) {
        if (this.clickEnabled) {
          this.scheduleClick(this.nextClickTime, this.currentBeat === 0);
        }
        if (this.onBeatCallback) {
          const beatToNotify = this.currentBeat;
          const delayMs = Math.max(0, (this.nextClickTime - now) * 1000);
          window.setTimeout(() => this.onBeatCallback?.(beatToNotify), delayMs);
        }
        this.currentBeat = (this.currentBeat + 1) % beatsPerBar;
        this.nextClickTime += this.timeSignature === '6/8' ? beatSec * 0.5 : beatSec;
      }

      // 2. Arpeggiator / 16th Pulse
      const sixteenthSec = beatSec / 4;
      while (this.nextArpTime < now + lookahead) {
        this.processArpStep(this.arpStep, sixteenthSec);
        this.arpStep = (this.arpStep + 1) % 16;
        this.nextArpTime += sixteenthSec;
      }
    }, 25);
  }

  private scheduleClick(time: number, accent: boolean): void {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(accent ? 1320 : 880, time);
    g.gain.setValueAtTime(accent ? 0.16 : 0.09, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.055);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.06);
  }

  private processArpStep(step: number, sixteenthSec: number): void {
    const heldSet = new Set<number>([
      ...Array.from(this.pressedNotes.keys()),
      ...Array.from(this.sustainedNotes.values()),
    ]);
    if (heldSet.size === 0) return;

    const sortedNotes = Array.from(heldSet).sort((a, b) => a - b);
    const anySoloed = this.layers.some((l) => l.soloed);

    this.layers.forEach((layer, slotIdx) => {
      if (!layer.enabled || layer.muted || (anySoloed && !layer.soloed)) return;
      const inst = this.resolveInstrument(layer.instrumentId);
      if (!inst || !inst.isArp) return;

      if (inst.arpSubdivision === '1/8' && step % 2 !== 0) return;

      const validNotes = sortedNotes.filter((n) => n >= layer.lowNote && n <= layer.highNote);
      if (validNotes.length === 0) return;

      const noteIdx = (inst.arpSubdivision === '1/8' ? Math.floor(step / 2) : step) % validNotes.length;
      const patternOffsets = inst.arpPattern || [0];
      const offset = patternOffsets[step % patternOffsets.length];
      const baseNote = validNotes[noteIdx];
      const dur = inst.arpSubdivision === '1/8' ? sixteenthSec * 1.4 : sixteenthSec * 0.72;

      this.triggerVoice(baseNote + offset, 0.72, layer, slotIdx, dur);
    });
  }

  // LIVE METERING
  public getMeterLevels(): { master: number; layers: number[] } {
    if (!this.ctx || this.ctx.state !== 'running' || !this.masterAnalyser) {
      return { master: 0, layers: [0, 0, 0, 0, 0] };
    }

    const computeRms = (analyser: AnalyserNode, data: Uint8Array<ArrayBuffer>): number => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      return Math.min(1, rms * 3.8);
    };

    const master = computeRms(this.masterAnalyser, this.masterData);
    const layers = this.slotChannels.map((ch) => computeRms(ch.analyser, ch.analyserData));
    return { master, layers };
  }

  public async previewInstrument(instrumentId: string): Promise<void> {
    if (!this.ctx) {
      await this.init();
    } else if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    if (!this.ctx || !this.masterWarmthFilter || !this.reverbInput) return;
    if (!this.noiseBuffer) this.noiseBuffer = this.createNoiseBuffer();

    const inst = this.resolveInstrument(instrumentId);
    if (!inst) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Gracefully fade out previous preview so A/B auditioning sounds crisp and unmistakable
    if (this.activePreviewGain) {
      const prevGain = this.activePreviewGain;
      try {
        prevGain.gain.cancelScheduledValues(now);
        prevGain.gain.setValueAtTime(Math.max(0.0001, prevGain.gain.value), now);
        prevGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);
        window.setTimeout(() => {
          try {
            prevGain.disconnect();
          } catch {
            // ignore
          }
        }, 80);
      } catch {
        // ignore
      }
    }

    const notes =
      inst.category === 'bass'
        ? [36, 48]
        : inst.category === 'arp'
          ? [48, 55, 60, 64]
          : [48, 55, 60, 62, 64];

    const previewGain = ctx.createGain();
    previewGain.gain.setValueAtTime(0.82, now);
    this.activePreviewGain = previewGain;

    const spaceAmount =
      inst.space === 'dry'
        ? 0.04
        : inst.space === 'room'
          ? 0.14
          : inst.space === 'ambient'
            ? 0.95
            : inst.space === 'hall'
              ? 0.56
              : inst.category === 'bass'
                ? 0.06
                : 0.4;

    const previewReverb = ctx.createGain();
    previewReverb.gain.value = spaceAmount;

    previewGain.connect(this.masterWarmthFilter);
    previewGain.connect(previewReverb);
    previewReverb.connect(this.reverbInput);

    notes.forEach((midi, idx) => {
      const stride = inst.isArp ? 0.12 : 0.085;
      const startTime = now + idx * stride;
      const holdSec = inst.category === 'pad' ? 1.25 : 0.85;
      this.spawnInstrumentVoice(
        inst,
        midiToFreq(midi),
        0.82,
        startTime,
        previewGain,
        1,
        1,
        holdSec,
      );
    });
  }
}

export const audioEngine = new WorshipAudioEngine();
