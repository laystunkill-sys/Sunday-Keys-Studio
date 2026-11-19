import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { getDiatonicWorshipChords, midiToNoteName } from '../data/instruments';
import { LayerConfig, MusicalKey } from '../types/worship';

interface PerformanceKeyboardProps {
  songKey: MusicalKey;
  layers: LayerConfig[];
  activeNotes: Set<number>;
  baseOctave: number;
  onChangeBaseOctave: (oct: number) => void;
  onNoteOn: (midi: number, velocity?: number) => void;
  onNoteOff: (midi: number) => void;
}

const BLACK_NOTE_OFFSETS = new Set([1, 3, 6, 8, 10]);

export function PerformanceKeyboard({
  songKey,
  layers,
  activeNotes,
  baseOctave,
  onChangeBaseOctave,
  onNoteOn,
  onNoteOff,
}: PerformanceKeyboardProps) {
  const [latchedChordIdx, setLatchedChordIdx] = useState<number | null>(null);
  const [latchMode, setLatchMode] = useState(false);

  const chordPads = useMemo(() => getDiatonicWorshipChords(songKey), [songKey]);

  const startMidi = (baseOctave + 1) * 12; // e.g. baseOctave 2 -> C3 (48) or baseOctave 1 -> C2 (36)
  const totalKeys = 37; // 3 full octaves + top C

  const keys = useMemo(() => {
    const list: { midi: number; isBlack: boolean; label: string }[] = [];
    for (let i = 0; i < totalKeys; i++) {
      const midi = startMidi + i;
      const pc = midi % 12;
      list.push({
        midi,
        isBlack: BLACK_NOTE_OFFSETS.has(pc),
        label: midiToNoteName(midi),
      });
    }
    return list;
  }, [startMidi]);

  const whiteKeys = keys.filter((k) => !k.isBlack);

  const releaseLatchedChord = () => {
    if (latchedChordIdx !== null) {
      const prevChord = chordPads[latchedChordIdx];
      prevChord?.midiNotes.forEach((n) => onNoteOff(n));
      setLatchedChordIdx(null);
    }
  };

  const handleChordPadDown = (idx: number) => {
    const chord = chordPads[idx];
    if (!chord) return;

    if (latchMode) {
      if (latchedChordIdx === idx) {
        releaseLatchedChord();
      } else {
        releaseLatchedChord();
        chord.midiNotes.forEach((n) => onNoteOn(n, 0.78));
        setLatchedChordIdx(idx);
      }
      return;
    }

    chord.midiNotes.forEach((n) => onNoteOn(n, 0.78));
  };

  const handleChordPadUp = (idx: number) => {
    if (latchMode) return;
    const chord = chordPads[idx];
    chord?.midiNotes.forEach((n) => onNoteOff(n));
  };

  return (
    <section
      aria-label="Chord Pads and Playable Stage Keyboard"
      className="bg-[#11141C] border-t border-white/[0.08] p-4 space-y-3 shrink-0"
    >
      {/* Top Row: Diatonic Chord Trigger Pads + Octave & Latch Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-medium text-slate-400 mr-1 whitespace-nowrap">
            Key of {songKey} Chords
          </span>
          {chordPads.map((chord, idx) => {
            const isLatched = latchedChordIdx === idx;
            return (
              <button
                key={`${chord.role}-${chord.label}`}
                type="button"
                onPointerDown={() => handleChordPadDown(idx)}
                onPointerUp={() => handleChordPadUp(idx)}
                onPointerLeave={() => {
                  if (!latchMode) handleChordPadUp(idx);
                }}
                className={`px-3 py-1.5 rounded-md border text-left transition-colors select-none-touch cursor-pointer shrink-0 ${
                  isLatched
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-[#181D29] border-white/[0.08] text-slate-100 hover:border-amber-400/50 hover:bg-[#1F2636] active:bg-amber-500/25'
                }`}
              >
                <span className="font-mono-tabular text-xs font-semibold block leading-none">
                  {chord.label}
                </span>
                <span
                  className={`text-[10px] font-mono-tabular block mt-0.5 leading-none ${
                    isLatched ? 'text-slate-900' : 'text-slate-400'
                  }`}
                >
                  {chord.role}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (latchMode) releaseLatchedChord();
              setLatchMode(!latchMode);
            }}
            className={`px-2.5 py-1.5 rounded text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
              latchMode
                ? 'bg-amber-500/20 border-amber-400/60 text-amber-300'
                : 'bg-[#181D29] border-white/[0.08] text-slate-300 hover:text-white'
            }`}
          >
            Chord Latch {latchMode ? 'On' : 'Off'}
          </button>

          <div className="flex items-center gap-1 bg-[#181D29] border border-white/[0.08] rounded px-1.5 py-1">
            <button
              type="button"
              onClick={() => onChangeBaseOctave(Math.max(1, baseOctave - 1))}
              disabled={baseOctave <= 1}
              aria-label="Keyboard Octave Down"
              className="p-0.5 text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono-tabular text-xs text-slate-200 px-1 whitespace-nowrap">
              {midiToNoteName(startMidi)}–{midiToNoteName(startMidi + totalKeys - 1)}
            </span>
            <button
              type="button"
              onClick={() => onChangeBaseOctave(Math.min(4, baseOctave + 1))}
              disabled={baseOctave >= 4}
              aria-label="Keyboard Octave Up"
              className="p-0.5 text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Layer Split Zone Indicator Strip */}
      <div className="space-y-1">
        {layers
          .filter((l) => l.enabled && !l.muted)
          .map((layer) => {
            const minMidi = startMidi;
            const maxMidi = startMidi + totalKeys - 1;
            const clampedLow = Math.max(minMidi, layer.lowNote);
            const clampedHigh = Math.min(maxMidi, layer.highNote);
            if (clampedLow > maxMidi || clampedHigh < minMidi) return null;

            const leftPct = ((clampedLow - minMidi) / totalKeys) * 100;
            const widthPct = Math.max(2, ((clampedHigh - clampedLow + 1) / totalKeys) * 100);

            return (
              <div key={layer.slotIndex} className="relative h-2 w-full bg-[#0B0D12] rounded-sm overflow-hidden">
                <div
                  title={`${layer.label}: ${midiToNoteName(layer.lowNote)}–${midiToNoteName(layer.highNote)}`}
                  className="absolute top-0 bottom-0 rounded-sm opacity-80"
                  style={{
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                    backgroundColor: layer.color,
                  }}
                />
              </div>
            );
          })}
      </div>

      {/* Playable Piano Keys */}
      <div className="relative h-28 select-none-touch bg-[#0A0C10] rounded-md border border-white/[0.08] overflow-hidden">
        {/* White Keys */}
        <div className="flex h-full w-full">
          {whiteKeys.map((wk) => {
            const isActive = activeNotes.has(wk.midi);
            const isC = wk.midi % 12 === 0;
            return (
              <button
                key={wk.midi}
                type="button"
                onPointerDown={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const relY = Math.max(0.25, Math.min(1, (e.clientY - rect.top) / rect.height));
                  onNoteOn(wk.midi, relY);
                }}
                onPointerUp={() => onNoteOff(wk.midi)}
                onPointerLeave={() => {
                  if (activeNotes.has(wk.midi)) onNoteOff(wk.midi);
                }}
                aria-label={`Play ${wk.label}`}
                className={`flex-1 h-full border-r border-slate-300/20 last:border-r-0 relative flex items-end justify-center pb-1.5 transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-[#E8ECF2] hover:bg-[#F8FAFC] text-slate-500'
                }`}
              >
                {isC && (
                  <span className="font-mono-tabular text-[10px] font-semibold select-none">
                    {wk.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Black Keys */}
        <div className="absolute inset-x-0 top-0 h-[62%] pointer-events-none">
          {keys.map((k) => {
            if (!k.isBlack) return null;
            // Count how many white keys precede this black key
            const precedingWhites = keys.filter((x) => !x.isBlack && x.midi < k.midi).length;
            const leftPct = (precedingWhites / whiteKeys.length) * 100;
            const widthPct = (0.64 / whiteKeys.length) * 100;
            const isActive = activeNotes.has(k.midi);

            return (
              <button
                key={k.midi}
                type="button"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onNoteOn(k.midi, 0.85);
                }}
                onPointerUp={(e) => {
                  e.stopPropagation();
                  onNoteOff(k.midi);
                }}
                onPointerLeave={() => {
                  if (activeNotes.has(k.midi)) onNoteOff(k.midi);
                }}
                aria-label={`Play ${k.label}`}
                style={{
                  left: `calc(${leftPct}% - ${widthPct / 2}%)`,
                  width: `${widthPct}%`,
                }}
                className={`pointer-events-auto absolute top-0 bottom-0 rounded-b-sm border border-black/60 shadow-md transition-colors cursor-pointer ${
                  isActive ? 'bg-amber-500' : 'bg-[#181B24] hover:bg-[#252A38]'
                }`}
              />
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
        <span>
          QWERTY Play: <span className="font-mono-tabular text-slate-300">Z–M</span> (lower) ·{' '}
          <span className="font-mono-tabular text-slate-300">Q–I</span> (upper) ·{' '}
          <span className="font-mono-tabular text-slate-300">Space</span> (Sustain)
        </span>
        <span>
          Click or tap any chord pad above to audition layered worship swells
        </span>
      </div>
    </section>
  );
}
