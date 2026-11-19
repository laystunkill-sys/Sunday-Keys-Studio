import { FolderSearch, Plus, Power, RotateCcw } from 'lucide-react';
import { audioEngine } from '../audio/AudioEngine';
import { INSTRUMENTS, midiToNoteName } from '../data/instruments';
import { InstrumentPreset, LayerConfig } from '../types/worship';

interface PatchBuilderViewProps {
  layers: LayerConfig[];
  customInstruments: InstrumentPreset[];
  selectedSlot: number;
  onSelectSlot: (slotIndex: number) => void;
  onUpdateLayer: (slotIndex: number, patch: Partial<LayerConfig>) => void;
  onOpenSaveModal: () => void;
  onOpenSoundBrowser: (slotIndex: number) => void;
}

const SPLIT_PRESETS: { label: string; low: number; high: number }[] = [
  { label: 'Full Range (C1–C7)', low: 24, high: 96 },
  { label: 'LH Bass (C1–D3)', low: 24, high: 50 },
  { label: 'Mid Bed (C2–C6)', low: 36, high: 84 },
  { label: 'RH Keys (C3–C7)', low: 48, high: 96 },
  { label: 'Upper Lead (C4–C7)', low: 60, high: 96 },
];

export function PatchBuilderView({
  layers,
  customInstruments,
  selectedSlot,
  onSelectSlot,
  onUpdateLayer,
  onOpenSaveModal,
  onOpenSoundBrowser,
}: PatchBuilderViewProps) {
  const activeLayer = layers[selectedSlot] || layers[0];
  const activeInstrument =
    customInstruments.find((i) => i.id === activeLayer.instrumentId) ||
    audioEngine.resolveInstrument(activeLayer.instrumentId);

  const minSpan = 24; // C1
  const maxSpan = 108; // C8
  const spanTotal = maxSpan - minSpan;
  const zoneLeftPct = ((activeLayer.lowNote - minSpan) / spanTotal) * 100;
  const zoneWidthPct = Math.max(
    2,
    ((activeLayer.highNote - activeLayer.lowNote) / spanTotal) * 100,
  );

  return (
    <div className="p-5 space-y-5 max-w-6xl mx-auto w-full">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-slate-100">
            Sound Patch Builder
          </h2>
          <p className="text-xs text-slate-400">
            Configure layered instruments, keyboard split zones, envelope shaping, and Mod Wheel routing
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenSaveModal}
          className="px-4 py-2 text-xs font-semibold bg-amber-500 text-slate-950 rounded-md hover:bg-amber-400 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Save Custom Patch</span>
        </button>
      </div>

      {/* 5-Layer Selector Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {layers.map((layer) => {
          const isSelected = layer.slotIndex === selectedSlot;
          const inst =
            customInstruments.find((i) => i.id === layer.instrumentId) ||
            audioEngine.resolveInstrument(layer.instrumentId);
          return (
            <button
              key={layer.slotIndex}
              type="button"
              onClick={() => onSelectSlot(layer.slotIndex)}
              className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-[#1C2230] border-amber-400/60'
                  : 'bg-[#141822] border-white/[0.08] hover:border-white/[0.16]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono-tabular text-[11px] text-slate-400">
                  Layer {layer.slotIndex + 1}
                </span>
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: layer.enabled ? layer.color : '#475569' }}
                />
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-100 truncate">
                {layer.label}
              </div>
              <div className="mt-0.5 text-xs text-slate-400 truncate">
                {inst?.name || layer.instrumentId}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Layer Detail Panel */}
      <div className="bg-[#141822] border border-white/[0.09] rounded-lg p-5 space-y-6">
        {/* Layer Header & Instrument Assignment */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() =>
                onUpdateLayer(activeLayer.slotIndex, { enabled: !activeLayer.enabled })
              }
              className={`px-3 py-1.5 rounded-md text-xs font-semibold border flex items-center gap-1.5 cursor-pointer ${
                activeLayer.enabled
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-[#0D1017] border-white/[0.1] text-slate-400'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{activeLayer.enabled ? 'Layer Enabled' : 'Layer Bypassed'}</span>
            </button>

            <input
              type="text"
              value={activeLayer.label}
              maxLength={24}
              onChange={(e) =>
                onUpdateLayer(activeLayer.slotIndex, { label: e.target.value })
              }
              aria-label="Layer Custom Label"
              className="bg-[#0D1017] border border-white/[0.1] rounded-md px-3 py-1.5 text-sm font-medium text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400/60 w-48"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                onUpdateLayer(activeLayer.slotIndex, {
                  octave: 0,
                  pan: 0,
                  brightness: 0.6,
                  attackScale: 1,
                  releaseScale: 1,
                  lowNote: 36,
                  highNote: 96,
                })
              }
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-[#0D1017] border border-white/[0.08] text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Layer</span>
            </button>
          </div>
        </div>

        {/* Two-column Editor: Left = Instrument & Key Split, Right = Synthesis & Routing */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="block text-xs font-medium text-slate-300">
                  Source Instrument
                </label>
                <button
                  type="button"
                  onClick={() => onOpenSoundBrowser(activeLayer.slotIndex)}
                  className="text-xs font-medium text-[#7FA4E8] hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <FolderSearch className="w-3.5 h-3.5" />
                  <span>Open Sound Browser</span>
                </button>
              </div>
              <select
                value={activeLayer.instrumentId}
                onChange={(e) => {
                  const inst =
                    customInstruments.find((i) => i.id === e.target.value) ||
                    audioEngine.resolveInstrument(e.target.value);
                  onUpdateLayer(activeLayer.slotIndex, {
                    instrumentId: e.target.value,
                    label: inst ? inst.name.split(' ').slice(0, 2).join(' ') : activeLayer.label,
                  });
                }}
                className="w-full bg-[#0D1017] border border-white/[0.1] rounded-md px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400/60 cursor-pointer"
              >
                {customInstruments.length > 0 && (
                  <optgroup label="USER IMPORTED">
                    {customInstruments.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {(['piano', 'pad', 'synth', 'bass', 'arp'] as const).map((cat) => (
                  <optgroup key={cat} label={cat.toUpperCase()}>
                    {INSTRUMENTS.filter((i) => i.category === cat).map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {activeInstrument && (
                <p className="text-xs text-slate-400">{activeInstrument.description}</p>
              )}
            </div>

            {/* Keyboard Split Zone Matrix */}
            <div className="space-y-3 pt-3 border-t border-white/[0.07]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-300">
                  Keyboard Split Zone
                </span>
                <span className="font-mono-tabular text-xs font-semibold text-amber-400">
                  {midiToNoteName(activeLayer.lowNote)} — {midiToNoteName(activeLayer.highNote)}
                </span>
              </div>

              {/* Visual 88-key Span Bar */}
              <div className="relative h-5 bg-[#0B0D12] border border-white/[0.08] rounded overflow-hidden">
                <div
                  className="absolute top-0 bottom-0 opacity-75"
                  style={{
                    left: `${zoneLeftPct}%`,
                    width: `${zoneWidthPct}%`,
                    backgroundColor: activeLayer.color,
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Low Key</span>
                    <span className="font-mono-tabular text-slate-200">
                      {midiToNoteName(activeLayer.lowNote)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={24}
                    max={activeLayer.highNote - 1}
                    value={activeLayer.lowNote}
                    onChange={(e) =>
                      onUpdateLayer(activeLayer.slotIndex, { lowNote: Number(e.target.value) })
                    }
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>High Key</span>
                    <span className="font-mono-tabular text-slate-200">
                      {midiToNoteName(activeLayer.highNote)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={activeLayer.lowNote + 1}
                    max={108}
                    value={activeLayer.highNote}
                    onChange={(e) =>
                      onUpdateLayer(activeLayer.slotIndex, { highNote: Number(e.target.value) })
                    }
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {SPLIT_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() =>
                      onUpdateLayer(activeLayer.slotIndex, {
                        lowNote: preset.low,
                        highNote: preset.high,
                      })
                    }
                    className="px-2.5 py-1 rounded text-[11px] bg-[#0D1017] border border-white/[0.08] text-slate-300 hover:text-white hover:border-white/20 transition-colors cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Pitch, Envelope, Filter, Mod Wheel, Sends */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Octave Shift */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">Octave Shift</span>
                  <span className="font-mono-tabular text-amber-400 font-semibold">
                    {activeLayer.octave > 0 ? `+${activeLayer.octave}` : activeLayer.octave}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {[-2, -1, 0, 1, 2].map((oct) => (
                    <button
                      key={oct}
                      type="button"
                      onClick={() => onUpdateLayer(activeLayer.slotIndex, { octave: oct })}
                      className={`py-1.5 rounded font-mono-tabular text-xs font-medium border transition-colors cursor-pointer ${
                        activeLayer.octave === oct
                          ? 'bg-amber-500/20 border-amber-400/60 text-amber-300'
                          : 'bg-[#0D1017] border-white/[0.08] text-slate-400 hover:text-slate-100'
                      }`}
                    >
                      {oct > 0 ? `+${oct}` : oct}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stereo Pan */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">Stereo Pan</span>
                  <span className="font-mono-tabular text-slate-200">
                    {activeLayer.pan === 0
                      ? 'Center'
                      : activeLayer.pan < 0
                        ? `L ${Math.abs(Math.round(activeLayer.pan * 100))}`
                        : `R ${Math.round(activeLayer.pan * 100)}`}
                  </span>
                </div>
                <input
                  type="range"
                  min={-100}
                  max={100}
                  value={Math.round(activeLayer.pan * 100)}
                  onChange={(e) =>
                    onUpdateLayer(activeLayer.slotIndex, { pan: Number(e.target.value) / 100 })
                  }
                  className="w-full accent-slate-300 cursor-pointer mt-2"
                />
              </div>
            </div>

            {/* Filter & Mod Wheel */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/[0.07]">
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">Filter Brightness</span>
                  <span className="font-mono-tabular text-slate-200">
                    {Math.round(activeLayer.brightness * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(activeLayer.brightness * 100)}
                  onChange={(e) =>
                    onUpdateLayer(activeLayer.slotIndex, {
                      brightness: Number(e.target.value) / 100,
                    })
                  }
                  className="w-full accent-sky-400 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">Mod Wheel Depth</span>
                  <span className="font-mono-tabular text-amber-300">
                    {Math.round(activeLayer.modWheelSensitivity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(activeLayer.modWheelSensitivity * 100)}
                  onChange={(e) =>
                    onUpdateLayer(activeLayer.slotIndex, {
                      modWheelSensitivity: Number(e.target.value) / 100,
                    })
                  }
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
            </div>

            {/* Attack & Release Envelope Scaling */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">Attack Scale</span>
                  <span className="font-mono-tabular text-slate-200">
                    {activeLayer.attackScale.toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={300}
                  value={Math.round(activeLayer.attackScale * 100)}
                  onChange={(e) =>
                    onUpdateLayer(activeLayer.slotIndex, {
                      attackScale: Number(e.target.value) / 100,
                    })
                  }
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">Release Scale</span>
                  <span className="font-mono-tabular text-slate-200">
                    {activeLayer.releaseScale.toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={300}
                  value={Math.round(activeLayer.releaseScale * 100)}
                  onChange={(e) =>
                    onUpdateLayer(activeLayer.slotIndex, {
                      releaseScale: Number(e.target.value) / 100,
                    })
                  }
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>
            </div>

            {/* FX Bus Sends */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/[0.07]">
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">Shimmer Reverb Send</span>
                  <span className="font-mono-tabular text-slate-200">
                    {Math.round(activeLayer.reverbSend * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(activeLayer.reverbSend * 100)}
                  onChange={(e) =>
                    onUpdateLayer(activeLayer.slotIndex, {
                      reverbSend: Number(e.target.value) / 100,
                    })
                  }
                  className="w-full accent-sky-400 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">Stereo Delay Send</span>
                  <span className="font-mono-tabular text-slate-200">
                    {Math.round(activeLayer.delaySend * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(activeLayer.delaySend * 100)}
                  onChange={(e) =>
                    onUpdateLayer(activeLayer.slotIndex, {
                      delaySend: Number(e.target.value) / 100,
                    })
                  }
                  className="w-full accent-violet-400 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
