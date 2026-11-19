import { Power } from 'lucide-react';
import { MUSICAL_KEYS } from '../data/instruments';
import { MusicalKey, TonicPadConfig, TonicPresetId } from '../types/worship';

interface TonicPadConsoleProps {
  config: TonicPadConfig;
  songKey: MusicalKey;
  onChange: (patch: Partial<TonicPadConfig>) => void;
}

const TONIC_PRESETS: { id: TonicPresetId; label: string }[] = [
  { id: 'warm-analog', label: 'Warm Analog' },
  { id: 'shimmer-cathedral', label: 'Shimmer Cathedral' },
  { id: 'deep-sub', label: 'Deep Sub' },
  { id: 'glassy-air', label: 'Glassy Air' },
];

export function TonicPadConsole({ config, songKey, onChange }: TonicPadConsoleProps) {
  return (
    <div className="bg-[#141822] border border-white/[0.09] rounded-lg p-4 flex flex-col justify-between gap-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-sm font-semibold text-slate-100">
            Tonic Pad Generator
          </h3>
          <p className="text-xs text-slate-400">Continuous ambient worship drone</p>
        </div>

        <button
          type="button"
          onClick={() => onChange({ active: !config.active })}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
            config.active
              ? 'bg-amber-500 text-slate-950 border-amber-400 hover:bg-amber-400'
              : 'bg-[#0D1017] text-slate-300 border-white/[0.1] hover:text-white'
          }`}
        >
          <Power className="w-3.5 h-3.5" />
          <span>{config.active ? 'Drone Active' : 'Fade In'}</span>
        </button>
      </div>

      {/* 12 Chromatic Key Buttons */}
      <div className="grid grid-cols-6 gap-1.5">
        {MUSICAL_KEYS.map((k) => {
          const isSelected = config.key === k;
          const isSongKey = songKey === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => onChange({ key: k, followSongKey: false })}
              className={`py-2 rounded text-xs font-mono-tabular font-semibold border transition-colors cursor-pointer relative ${
                isSelected
                  ? config.active
                    ? 'bg-amber-500/25 border-amber-400 text-amber-300'
                    : 'bg-[#222836] border-amber-400/50 text-amber-200'
                  : 'bg-[#0D1017] border-white/[0.08] text-slate-300 hover:bg-[#191F2B] hover:text-white'
              }`}
            >
              {k}
              {isSongKey && !isSelected && (
                <span
                  title="Current Song Key"
                  className="absolute top-1 right-1 w-1 h-1 rounded-full bg-slate-400"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Preset & Follow Song Key */}
      <div className="grid grid-cols-2 gap-2.5 items-center">
        <select
          value={config.preset}
          onChange={(e) => onChange({ preset: e.target.value as TonicPresetId })}
          aria-label="Tonic Pad Tone Preset"
          className="bg-[#0D1017] border border-white/[0.08] rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-400/60 cursor-pointer"
        >
          {TONIC_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>

        <label className="flex items-center justify-end gap-2 text-xs text-slate-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={config.followSongKey}
            onChange={(e) =>
              onChange({
                followSongKey: e.target.checked,
                key: e.target.checked ? songKey : config.key,
              })
            }
            className="accent-amber-400 rounded cursor-pointer"
          />
          <span>Follow Song Key</span>
        </label>
      </div>

      {/* Tonic Volume & Mod Filter */}
      <div className="grid grid-cols-2 gap-3 pt-1 border-t border-white/[0.07]">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Drone Level</span>
            <span className="font-mono-tabular text-slate-200">
              {Math.round(config.volume * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(config.volume * 100)}
            onChange={(e) => onChange({ volume: Number(e.target.value) / 100 })}
            aria-label="Tonic Pad Volume"
            className="w-full accent-amber-400 cursor-pointer"
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Filter Warmth</span>
            <span className="font-mono-tabular text-slate-200">
              {Math.round(config.brightness * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(config.brightness * 100)}
            onChange={(e) => onChange({ brightness: Number(e.target.value) / 100 })}
            aria-label="Tonic Pad Brightness"
            className="w-full accent-sky-400 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
