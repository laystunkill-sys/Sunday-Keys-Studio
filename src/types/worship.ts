export type MusicalKey =
  | 'C'
  | 'C#'
  | 'D'
  | 'Eb'
  | 'E'
  | 'F'
  | 'F#'
  | 'G'
  | 'Ab'
  | 'A'
  | 'Bb'
  | 'B';

export type TimeSignature = '4/4' | '3/4' | '6/8';

export type DelaySubdivision = '1/4' | '1/8.' | '1/8' | '1/16';

export type InstrumentCategory = 'piano' | 'pad' | 'synth' | 'bass' | 'arp';

export type TonicPresetId = string; // ids live in data/tonicPresets.ts

export type WorkspaceTab = 'perform' | 'builder' | 'library' | 'import' | 'midi';

export type PatchCategory =
  | 'Layered Worship'
  | 'Piano + Pad'
  | 'Synth & Lead'
  | 'Ambient'
  | 'Custom';

export type FactoryLibraryName =
  | 'Sunday Keys Core'
  | 'Ballad & Felt'
  | 'Worship Synth Anthology'
  | 'User Imported';

export interface InstrumentPreset {
  id: string;
  name: string;
  category: InstrumentCategory;
  description: string;
  library: FactoryLibraryName;
  browserCategory: string;
  soundType: string;
  sourceModel: string;
  timbres: string[];
  intensity: 1 | 2 | 3 | 4 | 5;
  oscillators: {
    type: OscillatorType;
    detuneCents: number;
    octaveOffset: number;
    gain: number;
  }[];
  attack: number; // seconds
  decay: number; // seconds
  sustain: number; // 0..1
  release: number; // seconds
  baseCutoffHz: number;
  resonance: number;
  hammerTransient?: number; // 0..1 percussive piano attack click
  feltNoiseAmount?: number; // 0..1 soft mechanical felt hammer thump
  lfoRateHz?: number;
  lfoDepthHz?: number;
  pitchLfoRateHz?: number;
  pitchLfoCents?: number;
  tremoloRateHz?: number;
  tremoloDepth?: number;
  fmModRatio?: number;
  fmModDepthHz?: number;
  fmDecaySec?: number;
  warmDrive?: number; // 0..1 subtle tape/tube saturation
  space?: 'dry' | 'room' | 'hall' | 'ambient';
  swarmMode?: 'fragile' | 'suspense' | 'shimmer';
  isArp?: boolean;
  arpSubdivision?: '1/8' | '1/16';
  arpPattern?: number[]; // semitone offsets
  sampleSet?: string; // id of a multisample set in audio/sampleSets.ts
  isCustomSample?: boolean;
  sampleRootMidi?: number;
  sampleTrimStartSec?: number;
  sampleLoop?: boolean;
  sampleDurationSec?: number;
  fileName?: string;
}

export interface LayerConfig {
  slotIndex: number; // 0..4
  label: string;
  instrumentId: string;
  enabled: boolean;
  muted: boolean;
  soloed: boolean;
  volume: number; // 0..1
  pan: number; // -1..1
  octave: number; // -2..2
  lowNote: number; // MIDI note 21..108
  highNote: number; // MIDI note 21..108
  brightness: number; // 0..1
  attackScale: number; // 0.2..3.0
  releaseScale: number; // 0.2..3.0
  reverbSend: number; // 0..1
  delaySend: number; // 0..1
  modWheelSensitivity: number; // 0..1
  color: string; // hex accent for split zone & fader cap
}

export interface MasterEffectsConfig {
  masterVolume: number; // 0..1
  warmth: number; // 0..1
  reverbMix: number; // 0..1
  reverbDecay: number; // 0..1
  shimmerAmount: number; // 0..1
  delayMix: number; // 0..1
  delayFeedback: number; // 0..0.85
  delaySubdivision: DelaySubdivision;
  compressorEnabled: boolean;
}

export interface TonicPadConfig {
  active: boolean;
  key: MusicalKey;
  volume: number; // 0..1
  brightness: number; // 0..1
  preset: TonicPresetId;
  followSongKey: boolean;
}

export interface WorshipPatch {
  id: string;
  name: string;
  category: PatchCategory;
  description: string;
  bpm: number;
  timeSignature: TimeSignature;
  key: MusicalKey;
  layers: [LayerConfig, LayerConfig, LayerConfig, LayerConfig, LayerConfig];
  effects: MasterEffectsConfig;
  isCustom?: boolean;
}

// A recallable mixer state: sounds, levels, mutes, pans, sends and master effects.
export interface SongSnapshot {
  layers: LayerConfig[];
  effects: MasterEffectsConfig;
}

export interface SetlistSong {
  id: string;
  title: string;
  artist: string;
  key: MusicalKey;
  bpm: number;
  timeSignature: TimeSignature;
  notes: string;
  // Order the chords are played in: indices into getDiatonicWorshipChords(key) (0..7)
  chordProgression?: number[];
  snapshots?: (SongSnapshot | null)[]; // 5 slots; slot 0 is "Default"
  activeSnapshot?: number;
  patch: WorshipPatch;
}

export interface Setlist {
  id: string;
  name: string;
  serviceLabel: string;
  songs: SetlistSong[];
}

export interface MidiEventLogItem {
  id: string;
  timestamp: string;
  deviceName: string;
  type: 'Note On' | 'Note Off' | 'Mod Wheel' | 'Sustain' | 'Pitch Bend' | 'CC';
  detail: string;
  channel: number;
}