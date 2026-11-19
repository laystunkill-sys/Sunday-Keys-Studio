import { ArrowLeft, ArrowRight, Plus, X } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { getDiatonicWorshipChords, MUSICAL_KEYS } from '../data/instruments';
import { MusicalKey, SetlistSong, TimeSignature } from '../types/worship';

interface SongEditorModalProps {
  song: SetlistSong;
  isNew: boolean;
  onSave: (song: SetlistSong) => void;
  onClose: () => void;
}

const TIME_SIGNATURES: TimeSignature[] = ['4/4', '3/4', '6/8'];
const inputClass =
  'w-full bg-[#0D1017] border border-white/[0.1] rounded-md px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400/60';

export function SongEditorModal({ song, isNew, onSave, onClose }: SongEditorModalProps) {
  const [title, setTitle] = useState(song.title);
  const [artist, setArtist] = useState(song.artist);
  const [key, setKey] = useState<MusicalKey>(song.key);
  const [bpm, setBpm] = useState<number>(song.bpm);
  const [timeSignature, setTimeSignature] = useState<TimeSignature>(song.timeSignature);
  const [notes, setNotes] = useState(song.notes);
  const [progression, setProgression] = useState<number[]>(song.chordProgression ?? []);

  // Chord choices follow the selected key (I, vi7, IV2, V, I/3, ii7, V/7, IVmaj7)
  const chords = useMemo(() => getDiatonicWorshipChords(key), [key]);

  const addChord = (idx: number) => setProgression((p) => [...p, idx]);
  const removeAt = (pos: number) => setProgression((p) => p.filter((_, i) => i !== pos));
  const moveAt = (pos: number, dir: -1 | 1) =>
    setProgression((p) => {
      const to = pos + dir;
      if (to < 0 || to >= p.length) return p;
      const next = [...p];
      [next[pos], next[to]] = [next[to], next[pos]];
      return next;
    });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...song,
      title: title.trim() || 'Untitled Song',
      artist: artist.trim(),
      key,
      bpm: Math.max(40, Math.min(220, Math.round(bpm) || 72)),
      timeSignature,
      notes: notes.trim(),
      chordProgression: progression,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="song-editor-title"
    >
      <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto bg-[#141822] border border-white/[0.12] rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="song-editor-title" className="font-display text-base font-semibold text-slate-100">
            {isNew ? 'New Song' : 'Edit Song'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 text-slate-400 hover:text-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">Song Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">Artist / Label</label>
              <input
                type="text"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">Key</label>
              <select
                value={key}
                onChange={(e) => setKey(e.target.value as MusicalKey)}
                className={`${inputClass} cursor-pointer`}
              >
                {MUSICAL_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">BPM</label>
              <input
                type="number"
                min={40}
                max={220}
                value={bpm}
                onChange={(e) => setBpm(Number(e.target.value))}
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">Time</label>
              <select
                value={timeSignature}
                onChange={(e) => setTimeSignature(e.target.value as TimeSignature)}
                className={`${inputClass} cursor-pointer`}
              >
                {TIME_SIGNATURES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Chord progression builder */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-slate-300">
                Chord Progression (key of {key})
              </label>
              {progression.length > 0 && (
                <button
                  type="button"
                  onClick={() => setProgression([])}
                  className="text-[11px] text-slate-400 hover:text-rose-400 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {chords.map((chord, idx) => (
                <button
                  key={chord.role}
                  type="button"
                  onClick={() => addChord(idx)}
                  title={`Add ${chord.label} (${chord.role})`}
                  className="px-2.5 py-1.5 rounded-md border border-white/[0.1] bg-[#181D29] hover:border-amber-400/60 hover:bg-[#1F2636] text-left cursor-pointer"
                >
                  <span className="flex items-center gap-1 font-mono-tabular text-xs font-semibold text-slate-100 leading-none">
                    <Plus className="w-3 h-3 text-amber-400" />
                    {chord.label}
                  </span>
                  <span className="block mt-0.5 text-[10px] text-slate-400 font-mono-tabular leading-none">
                    {chord.role}
                  </span>
                </button>
              ))}
            </div>

            <div className="min-h-[52px] rounded-md border border-dashed border-white/[0.12] bg-[#0D1017] p-2 flex flex-wrap gap-1.5 items-center">
              {progression.length === 0 ? (
                <span className="text-xs text-slate-500 px-1">
                  Tap chords above to build the order you play them in. Repeats are fine.
                </span>
              ) : (
                progression.map((chordIdx, pos) => {
                  const chord = chords[chordIdx];
                  if (!chord) return null;
                  return (
                    <div
                      key={`${pos}-${chordIdx}`}
                      className="flex items-center gap-0.5 rounded-md bg-amber-500/15 border border-amber-400/40 pl-1.5 pr-0.5 py-0.5"
                    >
                      <span className="text-[10px] text-amber-300/70 font-mono-tabular mr-1">
                        {pos + 1}
                      </span>
                      <span className="font-mono-tabular text-xs font-semibold text-amber-200">
                        {chord.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => moveAt(pos, -1)}
                        disabled={pos === 0}
                        aria-label="Move chord earlier"
                        className="p-0.5 text-slate-300 hover:text-white disabled:opacity-25 cursor-pointer"
                      >
                        <ArrowLeft className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveAt(pos, 1)}
                        disabled={pos === progression.length - 1}
                        aria-label="Move chord later"
                        className="p-0.5 text-slate-300 hover:text-white disabled:opacity-25 cursor-pointer"
                      >
                        <ArrowRight className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeAt(pos)}
                        aria-label="Remove chord"
                        className="p-0.5 text-slate-300 hover:text-rose-400 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">Performance Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className={`${inputClass} text-xs resize-none`}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-xs font-medium bg-[#0D1017] border border-white/[0.08] text-slate-300 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer"
            >
              {isNew ? 'Add Song' : 'Save Song'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
