import { AlertOctagon, Minus, Plus, SlidersHorizontal, Volume2 } from 'lucide-react';
import { useRef } from 'react';
import { MUSICAL_KEYS } from '../data/instruments';
import { MusicalKey, TimeSignature } from '../types/worship';

interface TransportStageBarProps {
  patchName: string;
  songTitle: string;
  songKey: MusicalKey;
  bpm: number;
  timeSignature: TimeSignature;
  transpose: number;
  clickEnabled: boolean;
  activeBeat: number;
  sustainDown: boolean;
  masterVolume: number;
  masterLevel: number;
  onChangeKey: (key: MusicalKey) => void;
  onChangeBpm: (bpm: number) => void;
  onChangeTimeSignature: (ts: TimeSignature) => void;
  onChangeTranspose: (semi: number) => void;
  onToggleClick: () => void;
  onToggleSustain: () => void;
  onPanic: () => void;
  onChangeMasterVolume: (vol: number) => void;
  fxOpen: boolean;
  onToggleFx: () => void;
}

export function TransportStageBar({
  patchName,
  songTitle,
  songKey,
  bpm,
  timeSignature,
  transpose,
  clickEnabled,
  activeBeat,
  sustainDown,
  masterVolume,
  masterLevel,
  onChangeKey,
  onChangeBpm,
  onChangeTimeSignature,
  onChangeTranspose,
  onToggleClick,
  onToggleSustain,
  onPanic,
  onChangeMasterVolume,
  fxOpen,
  onToggleFx,
}: TransportStageBarProps) {
  const tapTimesRef = useRef<number[]>([]);

  const handleTapTempo = () => {
    const now = performance.now();
    const recent = tapTimesRef.current.filter((t) => now - t < 2400);
    recent.push(now);
    tapTimesRef.current = recent;

    if (recent.length >= 2) {
      let totalInterval = 0;
      for (let i = 1; i < recent.length; i++) {
        totalInterval += recent[i] - recent[i - 1];
      }
      const avgMs = totalInterval / (recent.length - 1);
      const calculatedBpm = Math.round(60000 / avgMs);
      if (calculatedBpm >= 40 && calculatedBpm <= 220) {
        onChangeBpm(calculatedBpm);
      }
    }
  };

  const box = 'bg-[#0E1118] border border-white/[0.08] rounded-md';
  return (
    <section
      aria-label="Live Performance Controls"
      className="bg-[#13161F] border-b border-white/[0.08] px-2 py-1.5 flex items-center gap-2 shrink-0 overflow-x-auto"
    >
      <div className="min-w-0 w-[140px] shrink-0">
        <h1 className="font-display text-sm font-semibold text-slate-100 truncate leading-tight">
          {songTitle}
        </h1>
        {patchName !== songTitle && (
          <p className="text-[10px] text-slate-400 truncate leading-tight">{patchName}</p>
        )}
      </div>

      {/* Key */}
      <div className={`${box} flex items-center gap-1.5 px-2 py-1 shrink-0`}>
        <span className="text-[11px] text-slate-400">Key</span>
        <select
          value={songKey}
          onChange={(e) => onChangeKey(e.target.value as MusicalKey)}
          aria-label="Song Key"
          className="bg-transparent font-mono-tabular text-xs font-semibold text-amber-400 focus:outline-none cursor-pointer"
        >
          {MUSICAL_KEYS.map((k) => (
            <option key={k} value={k} className="bg-[#13161F] text-slate-100">
              {k}
            </option>
          ))}
        </select>
      </div>

      {/* Transpose */}
      <div className={`${box} flex items-center gap-0.5 px-1.5 py-0.5 shrink-0`}>
        <span className="text-[11px] text-slate-400 mr-0.5">Trans</span>
        <button
          type="button"
          onClick={() => onChangeTranspose(Math.max(-12, transpose - 1))}
          aria-label="Transpose Down"
          className="p-0.5 text-slate-300 hover:text-white hover:bg-white/[0.06] rounded cursor-pointer"
        >
          <Minus className="w-3 h-3" />
        </button>
        <span className="font-mono-tabular text-xs font-semibold text-slate-100 w-6 text-center">
          {transpose > 0 ? `+${transpose}` : transpose}
        </span>
        <button
          type="button"
          onClick={() => onChangeTranspose(Math.min(12, transpose + 1))}
          aria-label="Transpose Up"
          className="p-0.5 text-slate-300 hover:text-white hover:bg-white/[0.06] rounded cursor-pointer"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {/* BPM / Tap / Time signature */}
      <div className={`${box} flex items-center gap-1.5 px-2 py-0.5 shrink-0`}>
        <input
          type="number"
          min={40}
          max={220}
          value={bpm}
          onChange={(e) => {
            const val = Number(e.target.value);
            if (!Number.isNaN(val)) onChangeBpm(Math.max(40, Math.min(220, val)));
          }}
          aria-label="Tempo BPM"
          className="w-9 bg-transparent font-mono-tabular text-xs font-semibold text-slate-100 focus:outline-none text-right"
        />
        <span className="text-[11px] text-slate-400">BPM</span>
        <button
          type="button"
          onClick={handleTapTempo}
          className="px-2 py-0.5 text-[11px] font-medium bg-[#1C212E] hover:bg-[#252C3D] text-slate-200 rounded transition-colors cursor-pointer"
        >
          Tap
        </button>
        <select
          value={timeSignature}
          onChange={(e) => onChangeTimeSignature(e.target.value as TimeSignature)}
          aria-label="Time Signature"
          className="bg-transparent font-mono-tabular text-[11px] text-slate-300 focus:outline-none cursor-pointer pl-1 border-l border-white/[0.08]"
        >
          <option value="4/4" className="bg-[#13161F]">4/4</option>
          <option value="3/4" className="bg-[#13161F]">3/4</option>
          <option value="6/8" className="bg-[#13161F]">6/8</option>
        </select>
      </div>

      <button
        type="button"
        onClick={onToggleClick}
        className={`px-2 py-1 rounded-md text-xs font-medium border transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
          clickEnabled
            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
            : 'bg-[#0E1118] border-white/[0.08] text-slate-300 hover:text-white'
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full ${
            clickEnabled
              ? activeBeat === 0
                ? 'bg-amber-400'
                : 'bg-emerald-400 opacity-90'
              : 'bg-slate-600 opacity-50'
          }`}
        />
        Click
      </button>

      {/* Right side: sustain, panic, master FX, master volume */}
      <div className="ml-auto flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onToggleSustain}
          className={`px-2 py-1 rounded-md text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
            sustainDown
              ? 'bg-amber-500/20 border-amber-400/60 text-amber-300'
              : 'bg-[#0E1118] border-white/[0.08] text-slate-300 hover:text-white'
          }`}
        >
          Sustain
        </button>

        <button
          type="button"
          onClick={onToggleFx}
          aria-pressed={fxOpen}
          title="Master effects: reverb, shimmer, delay"
          className={`px-2 py-1 rounded-md text-xs font-semibold border transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap ${
            fxOpen
              ? 'bg-[#6F8FD8]/80 border-[#9DB4EE] text-white'
              : 'bg-[#0E1118] border-white/[0.08] text-slate-300 hover:text-white'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          FX
        </button>

        <button
          type="button"
          onClick={onPanic}
          title="All Notes Off (Panic)"
          className="p-1.5 rounded-md bg-[#0E1118] border border-white/[0.08] text-slate-300 hover:border-rose-500/40 hover:text-rose-300 transition-colors cursor-pointer"
        >
          <AlertOctagon className="w-3.5 h-3.5" />
        </button>

        <div className={`${box} flex items-center gap-1.5 px-2 py-1`}>
          <Volume2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(masterVolume * 100)}
            onChange={(e) => onChangeMasterVolume(Number(e.target.value) / 100)}
            aria-label="Master Output Volume"
            className="w-16 accent-amber-400 cursor-pointer"
          />
          <div className="w-8 h-1.5 bg-[#1A1F2B] rounded-sm overflow-hidden">
            <div
              className={`h-full transition-[width] duration-75 ${
                masterLevel > 0.88 ? 'bg-rose-500' : masterLevel > 0.65 ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
              style={{ width: `${Math.min(100, Math.round(masterLevel * 100))}%` }}
            />
          </div>
          <span className="font-mono-tabular text-[11px] text-slate-300 w-7 text-right">
            {Math.round(masterVolume * 100)}%
          </span>
        </div>
      </div>
    </section>
  );
}
