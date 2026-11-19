import { FolderSearch, Power, SlidersHorizontal } from 'lucide-react';
import React, { useRef } from 'react';
import { audioEngine } from '../audio/AudioEngine';
import { midiToNoteName } from '../data/instruments';
import { LayerConfig } from '../types/worship';

interface ChannelStripProps {
  layer: LayerConfig;
  meterLevel: number;
  anySoloed: boolean;
  onUpdate: (patch: Partial<LayerConfig>) => void;
  onOpenBuilder: (slotIndex: number) => void;
  onOpenSoundBrowser: (slotIndex: number) => void;
}

export function ChannelStrip({
  layer,
  meterLevel,
  anySoloed,
  onUpdate,
  onOpenBuilder,
  onOpenSoundBrowser,
}: ChannelStripProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const inst = audioEngine.resolveInstrument(layer.instrumentId);
  const isAudible = layer.enabled && !layer.muted && (!anySoloed || layer.soloed);

  const updateVolumeFromPointer = (clientY: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = 1 - (clientY - rect.top) / rect.height;
    const clamped = Math.max(0, Math.min(1, ratio));
    onUpdate({ volume: clamped });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    updateVolumeFromPointer(e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons === 0) return;
    updateVolumeFromPointer(e.clientY);
  };

  const faderPercent = Math.round(layer.volume * 100);
  const dbLabel =
    layer.volume <= 0.01
      ? '-∞ dB'
      : `${(20 * Math.log10(layer.volume)).toFixed(1)} dB`;

  return (
    <div
      className={`flex flex-col bg-[#141822] border rounded-lg p-3 transition-opacity ${
        isAudible ? 'border-white/[0.09]' : 'border-white/[0.05] opacity-75'
      }`}
    >
      {/* Top Strip Header */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/[0.07]">
        <button
          type="button"
          onClick={() => onUpdate({ enabled: !layer.enabled })}
          title={layer.enabled ? 'Disable Layer' : 'Enable Layer'}
          className={`flex items-center gap-1.5 text-xs font-semibold truncate cursor-pointer ${
            layer.enabled ? 'text-slate-100' : 'text-slate-500'
          }`}
        >
          <Power
            className="w-3.5 h-3.5 shrink-0"
            style={{ color: layer.enabled ? layer.color : '#475569' }}
          />
          <span className="truncate">{layer.label}</span>
        </button>

        <button
          type="button"
          onClick={() => onOpenBuilder(layer.slotIndex)}
          title="Edit Layer in Patch Builder"
          className="p-1 text-slate-400 hover:text-amber-400 rounded transition-colors cursor-pointer shrink-0"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Sound Browser Trigger Button */}
      <div className="mt-2.5 space-y-1">
        <button
          type="button"
          onClick={() => onOpenSoundBrowser(layer.slotIndex)}
          title={`Browse sounds for Module ${layer.slotIndex + 1}`}
          className="w-full bg-[#0D1017] hover:bg-[#171C28] border border-white/[0.09] hover:border-[#7FA4E8]/50 rounded px-2.5 py-1.5 text-xs text-slate-200 flex items-center justify-between gap-1.5 transition-colors cursor-pointer"
        >
          <span className="truncate">{inst?.name || layer.instrumentId}</span>
          <FolderSearch className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </button>

        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono-tabular px-0.5">
          <span>
            {midiToNoteName(layer.lowNote)}–{midiToNoteName(layer.highNote)}
          </span>
          <span>
            Oct {layer.octave > 0 ? `+${layer.octave}` : layer.octave}
          </span>
        </div>
      </div>

      {/* Inline Tone / Reverb / Delay Mini Controls */}
      <div className="mt-3 space-y-2 text-[11px]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-400 w-10">Tone</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(layer.brightness * 100)}
            onChange={(e) => onUpdate({ brightness: Number(e.target.value) / 100 })}
            aria-label={`${layer.label} Tone Brightness`}
            className="flex-1 h-1 accent-slate-300 cursor-pointer"
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-400 w-10">Verb</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(layer.reverbSend * 100)}
            onChange={(e) => onUpdate({ reverbSend: Number(e.target.value) / 100 })}
            aria-label={`${layer.label} Reverb Send`}
            className="flex-1 h-1 accent-sky-400 cursor-pointer"
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-400 w-10">Delay</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(layer.delaySend * 100)}
            onChange={(e) => onUpdate({ delaySend: Number(e.target.value) / 100 })}
            aria-label={`${layer.label} Delay Send`}
            className="flex-1 h-1 accent-violet-400 cursor-pointer"
          />
        </div>
      </div>

      {/* Vertical Fader + LED Meter */}
      <div className="mt-4 flex items-center justify-center gap-3 flex-1 min-h-[168px]">
        {/* dB Scale */}
        <div className="h-[156px] flex flex-col justify-between text-[10px] font-mono-tabular text-slate-500 text-right select-none">
          <span>0</span>
          <span>-6</span>
          <span>-12</span>
          <span>-24</span>
          <span>-∞</span>
        </div>

        {/* Fader Track */}
        <div
          ref={trackRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          role="slider"
          aria-label={`${layer.label} Volume`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={faderPercent}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              onUpdate({ volume: Math.min(1, layer.volume + 0.05) });
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              onUpdate({ volume: Math.max(0, layer.volume - 0.05) });
            }
          }}
          className="relative w-10 h-[156px] bg-[#0B0D12] border border-white/[0.08] rounded-md cursor-ns-resize select-none-touch flex justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
        >
          {/* Center Slot Groove */}
          <div className="w-1 h-[136px] my-auto bg-[#1E2432] rounded-full relative overflow-hidden">
            <div
              className="absolute bottom-0 inset-x-0 rounded-full"
              style={{
                height: `${faderPercent}%`,
                backgroundColor: isAudible ? layer.color : '#475569',
                opacity: 0.7,
              }}
            />
          </div>

          {/* Hardware Fader Cap */}
          <div
            className="absolute left-1 right-1 h-5 rounded bg-[#2A303E] border border-white/20 shadow-md flex items-center justify-center pointer-events-none"
            style={{
              bottom: `calc(${faderPercent}% - ${faderPercent * 0.2}px)`,
            }}
          >
            <div
              className="w-5 h-0.5 rounded-full"
              style={{ backgroundColor: isAudible ? layer.color : '#64748B' }}
            />
          </div>
        </div>

        {/* Real-time Audio Signal Meter */}
        <div className="w-2.5 h-[156px] bg-[#0B0D12] border border-white/[0.06] rounded-sm overflow-hidden flex flex-col justify-end">
          <div
            className="w-full transition-[height] duration-75"
            style={{
              height: `${Math.min(100, Math.round(meterLevel * 100))}%`,
              background:
                meterLevel > 0.85
                  ? '#EF4444'
                  : meterLevel > 0.6
                    ? '#F59E0B'
                    : '#10B981',
            }}
          />
        </div>
      </div>

      {/* dB Readout + Mute / Solo */}
      <div className="mt-3 pt-2.5 border-t border-white/[0.07] space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono-tabular">
          <span className="text-slate-400">{inst?.category.toUpperCase()}</span>
          <span className="text-slate-200">{dbLabel}</span>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => onUpdate({ muted: !layer.muted })}
            className={`py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
              layer.muted
                ? 'bg-rose-500/25 border border-rose-500/60 text-rose-300'
                : 'bg-[#0D1017] border border-white/[0.08] text-slate-400 hover:text-slate-100'
            }`}
          >
            M
          </button>
          <button
            type="button"
            onClick={() => onUpdate({ soloed: !layer.soloed })}
            className={`py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
              layer.soloed
                ? 'bg-amber-500/25 border border-amber-400/60 text-amber-300'
                : 'bg-[#0D1017] border border-white/[0.08] text-slate-400 hover:text-slate-100'
            }`}
          >
            S
          </button>
        </div>
      </div>
    </div>
  );
}
