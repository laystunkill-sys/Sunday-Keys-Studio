import React from 'react';
import { DelaySubdivision, MasterEffectsConfig } from '../types/worship';

interface EffectsRackProps {
  effects: MasterEffectsConfig;
  onChangeEffects: (patch: Partial<MasterEffectsConfig>) => void;
}

const SUBDIVISIONS: DelaySubdivision[] = ['1/4', '1/8.', '1/8', '1/16'];

export function EffectsRack({
  effects,
  onChangeEffects,
}: EffectsRackProps) {
  return (
    <div className="bg-[#171B26] border border-white/[0.14] rounded-lg p-3 flex gap-3 min-w-0">
      {/* Master Reverb, Shimmer, Tempo Delay, Warmth */}
      <div className="flex-1 flex flex-col justify-between gap-2 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h3
            className="font-display text-sm font-semibold text-slate-100 truncate"
            title="Cathedral shimmer reverb & tempo-synced stereo delay"
          >
            Master Effects
          </h3>
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

        <div className="grid grid-cols-3 gap-x-3 gap-y-1.5 text-[11px]">
          <div className="space-y-0.5">
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

          <div className="space-y-0.5">
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

          <div className="space-y-0.5">
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

          <div className="space-y-0.5">
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

          <div className="space-y-0.5">
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

          <div className="space-y-0.5">
            <span className="text-slate-400 block">Sync Division</span>
            <div className="grid grid-cols-4 gap-1">
              {SUBDIVISIONS.map((sub) => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => onChangeEffects({ delaySubdivision: sub })}
                  className={`py-0.5 rounded font-mono-tabular text-[11px] font-medium transition-colors cursor-pointer ${
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
