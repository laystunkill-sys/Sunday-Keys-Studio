// Multisample definitions: each set maps MIDI note -> audio file.
// The engine plays the nearest recorded note and pitch-shifts it only a few
// semitones, which is what makes real sampled pianos sound realistic.

export interface SampleSetDef {
  id: string;
  label: string;
  folder: string; // relative to /public/samples
  files: Record<number, string>; // midi -> filename
  // Sustained instruments (pads, strings, choir...) are looped so held keys never die out.
  loop?: { start: number; end: number }; // fractions of the sample length
}

const NOTE_INDEX: Record<string, number> = {
  C: 0, Cs: 1, Db: 1, D: 2, Ds: 3, Eb: 3, E: 4, F: 5, Fs: 6, Gb: 6, G: 7, Gs: 8, Ab: 8, A: 9, As: 10, Bb: 10, B: 11,
};

function buildFileMap(names: string, ext: string): Record<number, string> {
  const map: Record<number, string> = {};
  names.split(/\s+/).forEach((name) => {
    const m = /^([A-G][sb]?)(\d)$/.exec(name);
    if (!m) return;
    const midi = (Number(m[2]) + 1) * 12 + NOTE_INDEX[m[1]];
    map[midi] = `${name}.${ext}`;
  });
  return map;
}

// Salamander Grand Piano (Alexander Holm), CC BY 3.0 - a recorded Yamaha C5 grand,
// sampled every minor third from A0 to C8.
const SALAMANDER_NOTES =
  'A0 C1 Ds1 Fs1 A1 C2 Ds2 Fs2 A2 C3 Ds3 Fs3 A3 C4 Ds4 Fs4 A4 C5 Ds5 Fs5 A5 C6 Ds6 Fs6 A6 C7 Ds7 Fs7 A7 C8';

// FluidR3 GM soundfont (MIT licence, Frank Wen) via gleitz/midi-js-soundfonts,
// sampled every minor third. Real recordings of each GM instrument.
const FLUID_NOTES = ['A0']
  .concat([1, 2, 3, 4, 5, 6, 7].flatMap((o) => [`C${o}`, `Eb${o}`, `Gb${o}`, `A${o}`]))
  .concat(['C8'])
  .join(' ');

const SUSTAIN_LOOP = { start: 0.34, end: 0.74 };

function fluid(id: string, label: string, sustained: boolean): SampleSetDef {
  return {
    id,
    label,
    folder: id,
    files: buildFileMap(FLUID_NOTES, 'mp3'),
    loop: sustained ? SUSTAIN_LOOP : undefined,
  };
}

const FLUID_SETS: SampleSetDef[] = [
  fluid('electric_piano_1', 'Electric Piano (tines)', false),
  fluid('electric_piano_2', 'Electric Piano (digital)', false),
  fluid('string_ensemble_1', 'String Ensemble', true),
  fluid('synth_strings_1', 'Synth Strings', true),
  fluid('choir_aahs', 'Choir Aahs', true),
  fluid('voice_oohs', 'Voice Oohs', true),
  fluid('flute', 'Flute', true),
  fluid('clarinet', 'Clarinet', true),
  fluid('accordion', 'Accordion', true),
  fluid('pad_1_new_age', 'New Age Pad', true),
  fluid('pad_2_warm', 'Warm Pad', true),
  fluid('pad_4_choir', 'Choir Pad', true),
  fluid('pad_7_halo', 'Halo Pad', true),
  fluid('pad_8_sweep', 'Sweep Pad', true),
  fluid('church_organ', 'Church Organ', true),
  fluid('vibraphone', 'Vibraphone', false),
  fluid('music_box', 'Music Box', false),
  fluid('harp', 'Harp', false),
  fluid('electric_bass_finger', 'Finger Bass', false),
  fluid('brass_section', 'Brass Section', true),
];

export const SAMPLE_SETS: Record<string, SampleSetDef> = {
  ...Object.fromEntries(FLUID_SETS.map((d) => [d.id, d])),
  grand: {
    id: 'grand',
    label: 'Salamander Grand Piano',
    folder: 'grand',
    files: buildFileMap(SALAMANDER_NOTES, 'mp3'),
  },
};

export function sampleUrl(def: SampleSetDef, file: string): string {
  const base = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
  return `${base}samples/${def.folder}/${file}`;
}
