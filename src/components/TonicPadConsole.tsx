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
    <div className="bg-[#141822] border border-white/[0.09] rounded-lg p-2 flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <h3
          className="font-display text-xs font-semibold text-slate-100"
          title="Continuous ambient worship drone"
        >
          Tonic Pad
        </h3>
        <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={config.followSongKey}
            onChange={(e) =>
              onChange({
                followSongKey: e.target.checked,
                key: e.target.checked ? songKey : config.key,
              })
            }
            className="accent-amber-400 cursor-pointer"
          />
          <span>Follow Key</span>
        </label>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onChange({ active: !config.active })}
          title={config.active ? 'Fade drone out' : 'Fade drone in'}
          aria-label="Toggle Tonic Pad"
          className={`p-1.5 rounded border transition-colors cursor-pointer shrink-0 ${
            config.active
              ? 'bg-amber-500 text-slate-950 border-amber-400 hover:bg-amber-400'
              : 'bg-[#0D1017] text-slate-300 border-white/[0.1] hover:text-white'
          }`}
        >
          <Power className="w-3.5 h-3.5" />
        </button>
        <select
          value={config.preset}
          onChange={(e) => onChange({ preset: e.target.value as TonicPresetId })}
          aria-label="Tonic Pad Tone Preset"
          className="flex-1 min-w-0 bg-[#0D1017] border border-white/[0.08] rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-400/60 cursor-pointer"
        >
          {TONIC_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {/* 12 keys in a 4 x 3 grid, like the real Sunday Keys */}
      <div className="grid grid-cols-4 gap-1">
        {MUSICAL_KEYS.map((k) => {
          const isSelected = config.key === k;
          const isSongKey = songKey === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => onChange({ key: k, followSongKey: false })}
              className={`py-1.5 rounded text-[11px] font-mono-tabular font-semibold border transition-colors cursor-pointer relative ${
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
                  className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-slate-400"
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-400">Level</span>
            <span className="font-mono-tabular text-slate-200">{Math.round(config.volume * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(config.volume * 100)}
            onChange={(e) => onChange({ volume: Number(e.target.value) / 100 })}
            aria-label="Tonic Pad Volume"
            className="w-full h-1 accent-amber-400 cursor-pointer"
          />
        </div>
        <div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-400">Warmth</span>
            <span className="font-mono-tabular text-slate-200">{Math.round(config.brightness * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(config.brightness * 100)}
            onChange={(e) => onChange({ brightness: Number(e.target.value) / 100 })}
            aria-label="Tonic Pad Brightness"
            className="w-full h-1 accent-sky-400 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
