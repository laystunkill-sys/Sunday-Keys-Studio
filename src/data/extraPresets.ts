import { InstrumentCategory, InstrumentPreset } from '../types/worship';

// Presets built on real multisamples (see audio/sampleSets.ts). The oscillator
// list is only the fallback voice that plays while samples are still loading.

type Space = NonNullable<InstrumentPreset['space']>;

interface Def {
  id: string;
  name: string;
  set: string; // sample set id
  browserCategory: string;
  soundType: string;
  sourceModel: string;
  timbres: string[];
  description: string;
  category?: InstrumentCategory;
  space?: Space;
  intensity?: InstrumentPreset['intensity'];
  attack?: number;
  release?: number;
  cutoff?: number;
  tremoloRateHz?: number;
  tremoloDepth?: number;
  warmDrive?: number;
}

function make(d: Def): InstrumentPreset {
  const isPad = (d.category ?? 'pad') === 'pad';
  return {
    id: d.id,
    name: d.name,
    category: d.category ?? 'pad',
    description: d.description,
    library: 'Worship Synth Anthology',
    browserCategory: d.browserCategory,
    soundType: d.soundType,
    sourceModel: d.sourceModel,
    timbres: d.timbres,
    intensity: d.intensity ?? 2,
    space: d.space ?? (isPad ? 'ambient' : 'hall'),
    oscillators: [
      { type: 'triangle', detuneCents: -6, octaveOffset: 0, gain: 0.5 },
      { type: 'sine', detuneCents: 6, octaveOffset: 0, gain: 0.4 },
    ],
    attack: d.attack ?? (isPad ? 0.9 : 0.01),
    decay: 1,
    sustain: 0.85,
    release: d.release ?? (isPad ? 1.8 : 0.7),
    baseCutoffHz: d.cutoff ?? (isPad ? 2400 : 3800),
    resonance: 0.7,
    tremoloRateHz: d.tremoloRateHz,
    tremoloDepth: d.tremoloDepth,
    warmDrive: d.warmDrive,
    sampleSet: d.set,
  };
}

const PADS = (name: string, set: string, extra: Partial<Def>): Def => ({
  id: `pad-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
  name,
  set,
  browserCategory: 'Pads',
  soundType: 'Warm Pads',
  sourceModel: 'Analog',
  timbres: ['Ambient', 'Warm'],
  description: 'Sustained ambient pad for worship underlays.',
  ...extra,
});

const DEFS: Def[] = [
  // ---- Pads > Warm Pads (names from the Sunday Keys "Add Sound" browser) ----
  PADS('Matriarch | Pad', 'pad_2_warm', { sourceModel: 'Analog', timbres: ['Ambient', 'Warm', 'Deep'], cutoff: 2000 }),
  PADS('Mello Flute | Pad', 'flute', { sourceModel: 'Flute', timbres: ['Ambient', 'Breathy', 'Airy'], description: 'Soft breathy flute pad.', attack: 0.6 }),
  PADS('Mello Warm Pad', 'pad_2_warm', { timbres: ['Ambient', 'Warm', 'Clean'], attack: 1.1 }),
  PADS('MT-46 Accordion | Pad', 'accordion', { sourceModel: 'Tape Keys', timbres: ['Ambient', 'Chorus', 'Warm'], description: 'Tape-keyboard style accordion pad.', warmDrive: 0.25 }),
  PADS('MT-46 Clarinet | Wet', 'clarinet', { sourceModel: 'Tape Keys', timbres: ['Ambient', 'Warm', 'Cloudy'], space: 'ambient', description: 'Tape-keyboard clarinet drenched in reverb.', warmDrive: 0.25 }),
  PADS('Ocean Current | Pad', 'pad_8_sweep', { sourceModel: 'Analog', timbres: ['Ambient', 'Blooming', 'Deep'], attack: 1.6, release: 2.6 }),
  PADS('Prince Pad', 'synth_strings_1', { sourceModel: 'Analog', timbres: ['Ambient', 'Chorus', 'Bright'], cutoff: 3200 }),
  PADS('Radio Static Pad', 'pad_7_halo', { sourceModel: 'Found Sound', timbres: ['Ambient', 'Crystal', 'Cloudy'], cutoff: 2800 }),
  PADS('The Archive Pad', 'string_ensemble_1', { sourceModel: 'Strings', timbres: ['Ambient', 'Warm', 'Dark'], cutoff: 1800 }),
  PADS('Trance Vox Stack | Pad', 'voice_oohs', { sourceModel: 'Female Vocal', timbres: ['Ambient', 'Chorus', 'Blooming'], attack: 0.5 }),
  PADS('Underwater Pad', 'pad_1_new_age', { sourceModel: 'FM Synthesis', timbres: ['Ambient', 'Deep', 'Dark'], cutoff: 1400, attack: 1.4 }),
  PADS('Vocality | Choppy Soundbed', 'voice_oohs', { sourceModel: 'Female Vocal', timbres: ['Ambient', 'Chorus'], tremoloRateHz: 6, tremoloDepth: 0.8, attack: 0.3 }),
  PADS('Vocality | Ooh Vox Pad', 'voice_oohs', { sourceModel: 'Female Vocal', timbres: ['Ambient', 'Airy', 'Warm'] }),
  PADS('Vocality | Reverse Wave Pad', 'choir_aahs', { sourceModel: 'Choir', timbres: ['Ambient', 'Blooming', 'Cloudy'], attack: 2.2, release: 2.4 }),
  PADS('Warm Choir Pad', 'pad_4_choir', { sourceModel: 'Choir', timbres: ['Ambient', 'Warm', 'Breathy'] }),
  PADS('Wonder Pad', 'pad_7_halo', { sourceModel: 'Analog', timbres: ['Ambient', 'Crystal', 'Bright'], cutoff: 3600 }),
  PADS('Worship Pad', 'pad_2_warm', { sourceModel: 'Analog', timbres: ['Ambient', 'Warm', 'Deep'], cutoff: 2600, attack: 1.2, release: 2.2 }),

  // ---- Other sampled sounds ----
  { id: 'sm-strings-ensemble', name: 'String Ensemble | Warm', set: 'string_ensemble_1', browserCategory: 'Strings', soundType: 'String Ensemble', sourceModel: 'Strings', timbres: ['Warm', 'Clean'], description: 'Recorded string section, slow bow attack.', attack: 0.45, release: 1.2, cutoff: 3000 },
  { id: 'sm-strings-synth', name: 'Synth Strings | Soft', set: 'synth_strings_1', browserCategory: 'Strings', soundType: 'String Pads', sourceModel: 'Analog', timbres: ['Warm', 'Chorus'], description: 'Classic polysynth string machine.', attack: 0.6, release: 1.5 },
  { id: 'sm-choir-aahs', name: 'Choir Aahs | Hall', set: 'choir_aahs', browserCategory: 'Pads', soundType: 'Vocal Pads', sourceModel: 'Choir', timbres: ['Airy', 'Warm', 'Blooming'], description: 'Wide choir aahs in a big hall.', attack: 0.7, release: 1.8 },
  { id: 'sm-pad-newage', name: 'New Age Pad | Glow', set: 'pad_1_new_age', browserCategory: 'Pads', soundType: 'Airy Pads', sourceModel: 'Analog', timbres: ['Airy', 'Bright', 'Blooming'], description: 'Glassy evolving pad.', attack: 1.0 },
  { id: 'sm-pad-sweep', name: 'Sweep Pad | Rise', set: 'pad_8_sweep', browserCategory: 'Pads', soundType: 'Motion Pads', sourceModel: 'Analog', timbres: ['Blooming', 'Cloudy', 'Dark'], description: 'Slowly rising sweeping pad.', attack: 1.8, release: 2.4 },
  { id: 'sm-flute', name: 'Solo Flute', set: 'flute', browserCategory: 'Woodwinds', soundType: 'Flute', sourceModel: 'Flute', timbres: ['Airy', 'Breathy', 'Clean'], description: 'Recorded flute.', category: 'synth', attack: 0.08, release: 0.5, cutoff: 5200 },
  { id: 'sm-clarinet', name: 'Solo Clarinet', set: 'clarinet', browserCategory: 'Woodwinds', soundType: 'Clarinet', sourceModel: 'Clarinet', timbres: ['Warm', 'Dark'], description: 'Recorded clarinet.', category: 'synth', attack: 0.06, release: 0.45, cutoff: 4200 },
  { id: 'sm-brass-section', name: 'Brass Section | Swell', set: 'brass_section', browserCategory: 'Brass', soundType: 'Brass Section', sourceModel: 'Brass', timbres: ['Bright', 'Aggressive'], description: 'Full brass section.', category: 'synth', attack: 0.12, release: 0.6, cutoff: 5200 },
  { id: 'sm-organ-church', name: 'Church Pipe Organ', set: 'church_organ', browserCategory: 'Organ', soundType: 'Pipe Organ', sourceModel: 'Organ', timbres: ['Deep', 'Warm'], description: 'Cathedral pipe organ.', attack: 0.04, release: 0.5, cutoff: 5200 },
  { id: 'sm-accordion', name: 'Accordion', set: 'accordion', browserCategory: 'Woodwinds', soundType: 'Accordion', sourceModel: 'Accordion', timbres: ['Warm', 'Chorus'], description: 'Recorded accordion.', category: 'synth', attack: 0.05, release: 0.5, cutoff: 4800 },
  { id: 'sm-ep-tines', name: 'Stage EP | Tines', set: 'electric_piano_1', browserCategory: 'Acoustic Piano & Keys', soundType: 'Electric Piano', sourceModel: 'Electric', timbres: ['Warm', 'Chimey', 'Clean'], description: 'Sampled tine electric piano.', category: 'piano', attack: 0.005, release: 0.5, space: 'room', intensity: 3 },
  { id: 'sm-ep-digital', name: 'Digital EP | Glass', set: 'electric_piano_2', browserCategory: 'Acoustic Piano & Keys', soundType: 'Digital Piano', sourceModel: 'DX7', timbres: ['Bright', 'Crystal', 'Chimey'], description: 'Sampled DX-style electric piano.', category: 'piano', attack: 0.004, release: 0.5, space: 'room', intensity: 3 },
  { id: 'sm-vibes', name: 'Vibraphone | Soft', set: 'vibraphone', browserCategory: 'Bells', soundType: 'Vibraphone', sourceModel: 'Bells', timbres: ['Chimey', 'Warm'], description: 'Sampled vibraphone.', category: 'piano', attack: 0.005, release: 0.9, space: 'hall' },
  { id: 'sm-music-box', name: 'Music Box', set: 'music_box', browserCategory: 'Bells', soundType: 'Music Box', sourceModel: 'Bells', timbres: ['Chimey', 'Crystal', 'Bright'], description: 'Sampled music box.', category: 'piano', attack: 0.003, release: 0.7, space: 'hall' },
  { id: 'sm-harp', name: 'Orchestral Harp', set: 'harp', browserCategory: 'Acoustic Piano & Keys', soundType: 'Harp', sourceModel: 'Acoustic', timbres: ['Airy', 'Clean', 'Warm'], description: 'Sampled concert harp.', category: 'piano', attack: 0.004, release: 1.0, space: 'hall' },
  { id: 'sm-bass-finger', name: 'Finger Bass | Warm', set: 'electric_bass_finger', browserCategory: 'Bass', soundType: 'Electric Bass', sourceModel: 'Electric', timbres: ['Warm', 'Deep'], description: 'Sampled fingerstyle bass.', category: 'bass', attack: 0.004, release: 0.3, space: 'dry', cutoff: 2200 },
];

export const EXTRA_PRESETS: InstrumentPreset[] = DEFS.map(make);
