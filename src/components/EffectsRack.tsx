import React, { useRef } from 'react';
import { DelaySubdivision, MasterEffectsConfig } from '../types/worship';

interface EffectsRackProps {
  effects: MasterEffectsConfig;
  modWheel: number;
  onChangeModWheel: (val: number) => void;
  onChangeEffects: (patch: Partial<MasterEffectsConfig>) => void;
}

const SUBDIVISIONS: DelaySubdivision[] = ['1/4', '1/8.', '1/8', '1/16'];

export function EffectsRack({
  effects,
  modWheel,
  onChangeModWheel,
  onChangeEffects,
}: EffectsRackProps) {
  const wheelRef = useRef<HTMLDivElement>(null);

  const updateWheelFromPointer = (clientY: number) => {
    const el = wheelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = 1 - (clientY - rect.top) / rect.height;
    onChangeModWheel(Math.max(0, Math.min(1, ratio)));
  };

  const modPercent = Math.round(modWheel * 100);

  return (
    <div className="bg-[#141822] border border-white/[0.09] rounded-lg p-4 flex gap-4">
      {/* Interactive Mod Wheel (CC1) */}
      <div className="flex flex-col items-center justify-between pr-4 border-r border-white/[0.08] shrink-0">
        <span className="text-[11px] font-semibold text-slate-300">Mod</span>
        <div
          ref={wheelRef}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            updateWheelFromPointer(e.clientY);
          }}
          onPointerMove={(e) => {
            if (e.buttons === 0) return;
            updateWheelFromPointer(e.clientY);
          }}
          role="slider"
          aria-label="Mod Wheel Expression"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={modPercent}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              onChangeModWheel(Math.min(1, modWheel + 0.05));
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              onChangeModWheel(Math.max(0, modWheel - 0.05));
            }
          }}
          className="relative w-10 h-32 bg-[#0B0D12] border border-white/[0.1] rounded-md cursor-ns-resize select-none-touch overflow-hidden flex flex-col justify-end focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
        >
          <div
            className="w-full bg-gradient-to-t from-amber-500/40 to-amber-400/80 transition-[height] duration-75"
            style={{ height: `${modPercent}%` }}
          />
          <div
            className="absolute left-0.5 right-0.5 h-3.5 bg-[#2A3140] border border-white/25 rounded-sm pointer-events-none"
            style={{
              bottom: `calc(${modPercent}% - ${modPercent * 0.14}px)`,
            }}
          />
        </div>
        <span className="font-mono-tabular text-[11px] text-amber-400 font-semibold">
          {modPercent}%
        </span>
      </div>

      {/* Master Reverb, Shimmer, Tempo Delay, Warmth */}
      <div className="flex-1 flex flex-col justify-between gap-3 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-sm font-semibold text-slate-100">
              Master Effects Bus
            </h3>
            <p className="text-xs text-slate-400">
              Cathedral shimmer reverb & tempo-synced stereo delay
            </p>
          </div>
          <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none whitespace-nowrap">
            <input
              type="checkbox"
              checked={effects.compressorEnabled}
              onChange={(e) => onChangeEffects({ compressorEnabled: e.target.checked })}
              className="accent-emerald-400 cursor-pointer"
            />
            <span>Stage Limiter</span>
          </label>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5 text-[11px]">
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Reverb Mix</span>
              <span className="font-mono-tabular text-slate-200">
                {Math.round(effects.reverbMix * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(effects.reverbMix * 100)}
              onChange={(e) => onChangeEffects({ reverbMix: Number(e.target.value) / 100 })}
              aria-label="Master Reverb Mix"
              className="w-full accent-sky-400 cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Shimmer</span>
              <span className="font-mono-tabular text-slate-200">
                {Math.round(effects.shimmerAmount * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(effects.shimmerAmount * 100)}
              onChange={(e) => onChangeEffects({ shimmerAmount: Number(e.target.value) / 100 })}
              aria-label="Reverb Shimmer Amount"
              className="w-full accent-sky-300 cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Warmth</span>
              <span className="font-mono-tabular text-slate-200">
                {Math.round(effects.warmth * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(effects.warmth * 100)}
              onChange={(e) => onChangeEffects({ warmth: Number(e.target.value) / 100 })}
              aria-label="Master Warmth Filter"
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Delay Mix</span>
              <span className="font-mono-tabular text-slate-200">
                {Math.round(effects.delayMix * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(effects.delayMix * 100)}
              onChange={(e) => onChangeEffects({ delayMix: Number(e.target.value) / 100 })}
              aria-label="Master Delay Mix"
              className="w-full accent-violet-400 cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Feedback</span>
              <span className="font-mono-tabular text-slate-200">
                {Math.round(effects.delayFeedback * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={82}
              value={Math.round(effects.delayFeedback * 100)}
              onChange={(e) => onChangeEffects({ delayFeedback: Number(e.target.value) / 100 })}
              aria-label="Delay Feedback"
              className="w-full accent-violet-400 cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <span className="text-slate-400 block">Sync Division</span>
            <div className="grid grid-cols-4 gap-1">
              {SUBDIVISIONS.map((sub) => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => onChangeEffects({ delaySubdivision: sub })}
                  className={`py-1 rounded font-mono-tabular text-[11px] font-medium transition-colors cursor-pointer ${
                    effects.delaySubdivision === sub
                      ? 'bg-violet-500/30 border border-violet-400/60 text-violet-200'
                      : 'bg-[#0D1017] border border-white/[0.08] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
