// Tonic Pad sound library. Add or edit entries here: the engine and the UI both read this list.
// Presets marked `low: true` only use the root, fifth and octave, so they sit UNDER the patch
// pads instead of competing with them.

export interface TonicPartial {
  semi: number; // semitones above the root (root is in the C2 range)
  detune: number; // cents
  type: OscillatorType;
  gain: number;
}

export interface TonicPreset {
  id: string;
  label: string;
  low?: boolean;
  cutoffBase: number; // Hz at brightness 0
  cutoffRange: number; // extra Hz at brightness 1
  q: number;
  reverb: number; // reverb send 0..1
  lfoDepth: number; // filter breathing, Hz
  partials: TonicPartial[];
}

export const TONIC_PRESETS: TonicPreset[] = [
  {
    id: 'warm-analog', label: 'Warm Analog', cutoffBase: 260, cutoffRange: 1400, q: 0.8, reverb: 0.85, lfoDepth: 240,
    partials: [
      { semi: 0, detune: 0, type: 'sine', gain: 0.42 },
      { semi: 12, detune: -9, type: 'sawtooth', gain: 0.26 },
      { semi: 12, detune: 9, type: 'sawtooth', gain: 0.26 },
      { semi: 19, detune: 0, type: 'triangle', gain: 0.22 },
    ],
  },
  {
    id: 'shimmer-cathedral', label: 'Shimmer Cathedral', cutoffBase: 420, cutoffRange: 2400, q: 1.4, reverb: 0.85, lfoDepth: 240,
    partials: [
      { semi: 0, detune: 0, type: 'sine', gain: 0.38 },
      { semi: 12, detune: -10, type: 'sawtooth', gain: 0.26 },
      { semi: 12, detune: 10, type: 'sawtooth', gain: 0.26 },
      { semi: 19, detune: 4, type: 'triangle', gain: 0.24 },
      { semi: 24, detune: -5, type: 'sine', gain: 0.22 },
    ],
  },
  {
    id: 'deep-sub', label: 'Deep Sub', low: true, cutoffBase: 180, cutoffRange: 700, q: 0.8, reverb: 0.45, lfoDepth: 90,
    partials: [
      { semi: 0, detune: 0, type: 'sine', gain: 0.55 },
      { semi: 12, detune: -6, type: 'triangle', gain: 0.3 },
      { semi: 12, detune: 6, type: 'sawtooth', gain: 0.18 },
      { semi: 19, detune: 0, type: 'sine', gain: 0.2 },
    ],
  },
  {
    id: 'glassy-air', label: 'Glassy Air', cutoffBase: 600, cutoffRange: 2800, q: 0.8, reverb: 0.85, lfoDepth: 240,
    partials: [
      { semi: 12, detune: -8, type: 'triangle', gain: 0.35 },
      { semi: 12, detune: 8, type: 'triangle', gain: 0.35 },
      { semi: 19, detune: 3, type: 'sine', gain: 0.28 },
      { semi: 24, detune: -4, type: 'sine', gain: 0.25 },
    ],
  },
  {
    id: 'root-fifth', label: 'Root & Fifth', low: true, cutoffBase: 220, cutoffRange: 900, q: 0.7, reverb: 0.6, lfoDepth: 70,
    partials: [
      { semi: 0, detune: 0, type: 'sine', gain: 0.5 },
      { semi: 7, detune: 0, type: 'triangle', gain: 0.3 },
      { semi: 12, detune: 0, type: 'sine', gain: 0.28 },
    ],
  },
  {
    id: 'soft-strings', label: 'Soft Strings', cutoffBase: 320, cutoffRange: 1800, q: 0.9, reverb: 0.8, lfoDepth: 200,
    partials: [
      { semi: 0, detune: -7, type: 'sawtooth', gain: 0.2 },
      { semi: 0, detune: 7, type: 'sawtooth', gain: 0.2 },
      { semi: 7, detune: -5, type: 'sawtooth', gain: 0.14 },
      { semi: 12, detune: 6, type: 'sawtooth', gain: 0.14 },
      { semi: 12, detune: 0, type: 'sine', gain: 0.2 },
    ],
  },
  {
    id: 'warm-organ', label: 'Warm Organ', cutoffBase: 500, cutoffRange: 1600, q: 0.6, reverb: 0.5, lfoDepth: 30,
    partials: [
      { semi: 0, detune: 0, type: 'sine', gain: 0.5 },
      { semi: 12, detune: 0, type: 'sine', gain: 0.32 },
      { semi: 19, detune: 0, type: 'sine', gain: 0.2 },
      { semi: 24, detune: 0, type: 'sine', gain: 0.12 },
    ],
  },
  {
    id: 'soft-choir', label: 'Soft Choir', cutoffBase: 380, cutoffRange: 2000, q: 1.1, reverb: 0.9, lfoDepth: 320,
    partials: [
      { semi: 0, detune: 0, type: 'sine', gain: 0.3 },
      { semi: 12, detune: -12, type: 'triangle', gain: 0.3 },
      { semi: 12, detune: 12, type: 'triangle', gain: 0.3 },
      { semi: 19, detune: 0, type: 'triangle', gain: 0.2 },
      { semi: 24, detune: 5, type: 'sine', gain: 0.14 },
    ],
  },
  {
    id: 'dark-drone', label: 'Dark Drone', low: true, cutoffBase: 140, cutoffRange: 520, q: 0.8, reverb: 0.4, lfoDepth: 60,
    partials: [
      { semi: -12, detune: 0, type: 'sine', gain: 0.4 },
      { semi: 0, detune: 0, type: 'sine', gain: 0.45 },
      { semi: 7, detune: 0, type: 'sine', gain: 0.22 },
      { semi: 12, detune: 0, type: 'triangle', gain: 0.16 },
    ],
  },
  {
    id: 'ethereal-fifth', label: 'Ethereal Fifth', cutoffBase: 520, cutoffRange: 2600, q: 1.0, reverb: 0.95, lfoDepth: 260,
    partials: [
      { semi: 7, detune: -4, type: 'sine', gain: 0.3 },
      { semi: 12, detune: 4, type: 'sine', gain: 0.3 },
      { semi: 19, detune: 0, type: 'triangle', gain: 0.24 },
      { semi: 24, detune: -3, type: 'sine', gain: 0.2 },
    ],
  },
  {
    id: 'analog-swell', label: 'Analog Swell', cutoffBase: 240, cutoffRange: 2200, q: 1.8, reverb: 0.7, lfoDepth: 520,
    partials: [
      { semi: 0, detune: -10, type: 'sawtooth', gain: 0.22 },
      { semi: 0, detune: 10, type: 'sawtooth', gain: 0.22 },
      { semi: 12, detune: 0, type: 'square', gain: 0.12 },
      { semi: 19, detune: 6, type: 'sawtooth', gain: 0.14 },
    ],
  },
  {
    id: 'pure-sine', label: 'Pure Sine', low: true, cutoffBase: 400, cutoffRange: 1200, q: 0.5, reverb: 0.5, lfoDepth: 0,
    partials: [
      { semi: 0, detune: 0, type: 'sine', gain: 0.6 },
      { semi: 12, detune: 0, type: 'sine', gain: 0.22 },
    ],
  },
];

export function getTonicPreset(id: string): TonicPreset {
  return TONIC_PRESETS.find((p) => p.id === id) ?? TONIC_PRESETS[0];
}
