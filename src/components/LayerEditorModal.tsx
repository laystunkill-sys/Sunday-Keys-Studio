import { ArrowUpRight, FolderSearch, X } from 'lucide-react';
import { useEffect } from 'react';
import { audioEngine } from '../audio/AudioEngine';
import { midiToNoteName } from '../data/instruments';
import { LayerConfig } from '../types/worship';

interface LayerEditorModalProps {
  layer: LayerConfig;
  onUpdate: (patch: Partial<LayerConfig>) => void;
  onClose: () => void;
  onBrowseSounds: () => void;
  onOpenPatchBuilder: () => void;
}

interface SliderProps {
  label: string;
  display: string;
  min: number;
  max: number;
  value: number;
  color: string;
  onChange: (v: number) => void;
}

function EditorSlider({ label, display, min, max, value, color, onChange }: SliderProps) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-slate-300">{label}</span>
        <span className="font-mono-tabular text-slate-100">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="w-full h-1.5 cursor-pointer"
        style={{ accentColor: color }}
      />
    </div>
  );
}

/** Edits the real layer settings right on the Perform screen, no trip to the Patch Builder */
export function LayerEditorModal({
  layer,
  onUpdate,
  onClose,
  onBrowseSounds,
  onOpenPatchBuilder,
}: LayerEditorModalProps) {
  const inst = audioEngine.resolveInstrument(layer.instrumentId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const pct = (v: number) => `${Math.round(v * 100)}%`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Edit sound"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[min(560px,100%)] max-h-[92vh] overflow-y-auto bg-[#141822] border border-white/[0.14] rounded-xl shadow-2xl shadow-black/70"
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.08] sticky top-0 bg-[#141822] z-10">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: layer.color }} />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-sm font-semibold text-slate-100 truncate">
              {inst?.name || layer.instrumentId}
            </h2>
            <p className="text-[11px] text-slate-400">Module {layer.slotIndex + 1} · {layer.label}</p>
          </div>
          <button
            type="button"
            onClick={onBrowseSounds}
            className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-[#1B202C] border border-white/[0.1] text-slate-200 hover:text-white flex items-center gap-1.5 cursor-pointer"
          >
            <FolderSearch className="w-3.5 h-3.5" /> Change sound
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-white/[0.08] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Tone */}
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Tone</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">
              <EditorSlider
                label="Brightness"
                display={pct(layer.brightness)}
                min={0}
                max={100}
                value={Math.round(layer.brightness * 100)}
                color={layer.color}
                onChange={(v) => onUpdate({ brightness: v / 100 })}
              />
              <EditorSlider
                label="Attack"
                display={`${layer.attackScale.toFixed(2)}x`}
                min={20}
                max={300}
                value={Math.round(layer.attackScale * 100)}
                color={layer.color}
                onChange={(v) => onUpdate({ attackScale: v / 100 })}
              />
              <EditorSlider
                label="Release"
                display={`${layer.releaseScale.toFixed(2)}x`}
                min={20}
                max={300}
                value={Math.round(layer.releaseScale * 100)}
                color={layer.color}
                onChange={(v) => onUpdate({ releaseScale: v / 100 })}
              />
              <EditorSlider
                label="Mod wheel amount"
                display={pct(layer.modWheelSensitivity)}
                min={0}
                max={100}
                value={Math.round(layer.modWheelSensitivity * 100)}
                color={layer.color}
                onChange={(v) => onUpdate({ modWheelSensitivity: v / 100 })}
              />
            </div>
          </section>

          {/* Level & space */}
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Level & space</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">
              <EditorSlider
                label="Volume"
                display={pct(layer.volume)}
                min={0}
                max={100}
                value={Math.round(layer.volume * 100)}
                color={layer.color}
                onChange={(v) => onUpdate({ volume: v / 100 })}
              />
              <EditorSlider
                label="Pan"
                display={
                  Math.abs(layer.pan) < 0.03
                    ? 'C'
                    : `${layer.pan < 0 ? 'L' : 'R'} ${Math.round(Math.abs(layer.pan) * 100)}`
                }
                min={-100}
                max={100}
                value={Math.round(layer.pan * 100)}
                color={layer.color}
                onChange={(v) => onUpdate({ pan: v / 100 })}
              />
              <EditorSlider
                label="Reverb send"
                display={pct(layer.reverbSend)}
                min={0}
                max={100}
                value={Math.round(layer.reverbSend * 100)}
                color={layer.color}
                onChange={(v) => onUpdate({ reverbSend: v / 100 })}
              />
              <EditorSlider
                label="Delay send"
                display={pct(layer.delaySend)}
                min={0}
                max={100}
                value={Math.round(layer.delaySend * 100)}
                color={layer.color}
                onChange={(v) => onUpdate({ delaySend: v / 100 })}
              />
            </div>
          </section>

          {/* Range */}
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Keyboard range</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">
              <EditorSlider
                label="Lowest note"
                display={midiToNoteName(layer.lowNote)}
                min={21}
                max={108}
                value={layer.lowNote}
                color={layer.color}
                onChange={(v) => onUpdate({ lowNote: Math.min(v, layer.highNote) })}
              />
              <EditorSlider
                label="Highest note"
                display={midiToNoteName(layer.highNote)}
                min={21}
                max={108}
                value={layer.highNote}
                color={layer.color}
                onChange={(v) => onUpdate({ highNote: Math.max(v, layer.lowNote) })}
              />
            </div>
            <div className="mt-3">
              <div className="text-xs text-slate-300 mb-1">Octave</div>
              <div className="flex gap-1.5">
                {[-2, -1, 0, 1, 2].map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => onUpdate({ octave: o })}
                    className={`flex-1 py-1.5 rounded text-xs font-mono-tabular font-semibold border cursor-pointer transition-colors ${
                      layer.octave === o
                        ? 'bg-amber-500/20 border-amber-400/60 text-amber-300'
                        : 'bg-[#0D1017] border-white/[0.08] text-slate-300 hover:text-white'
                    }`}
                  >
                    {o > 0 ? `+${o}` : o}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-white/[0.08]">
          <button
            type="button"
            onClick={onOpenPatchBuilder}
            className="text-xs text-slate-400 hover:text-amber-400 flex items-center gap-1 cursor-pointer"
          >
            Open full Patch Builder <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-md text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
