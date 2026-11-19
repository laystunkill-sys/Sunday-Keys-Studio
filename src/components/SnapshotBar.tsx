import { Save } from 'lucide-react';
import { SongSnapshot } from '../types/worship';

interface SnapshotBarProps {
  snapshots: (SongSnapshot | null)[];
  activeIndex: number;
  modified: boolean; // active snapshot has unsaved tweaks
  onSelect: (index: number) => void;
  onSave: () => void;
}

const LABELS = ['Default', 'Snapshot 2', 'Snapshot 3', 'Snapshot 4', 'Snapshot 5'];

export function SnapshotBar({ snapshots, activeIndex, modified, onSelect, onSave }: SnapshotBarProps) {
  return (
    <div
      aria-label="Snapshots"
      className="flex items-stretch gap-2 px-4 py-2 bg-[#0F121A] border-t border-white/[0.08] shrink-0"
    >
      <div className="flex-1 grid grid-cols-5 gap-2 min-w-0">
        {LABELS.map((label, idx) => {
          const isActive = idx === activeIndex;
          const isEmpty = idx === 0 ? false : !snapshots[idx];
          return (
            <button
              key={label}
              type="button"
              onClick={() => onSelect(idx)}
              title={isEmpty ? `Save current mix to ${label}` : `Recall ${label}`}
              className={`relative px-2 py-2 rounded-md border text-center transition-colors cursor-pointer min-w-0 ${
                isActive
                  ? 'bg-[#6F8FD8]/80 border-[#9DB4EE] text-white'
                  : isEmpty
                    ? 'bg-[#141822] border-white/[0.06] text-slate-500 hover:text-slate-300 hover:border-white/[0.14]'
                    : 'bg-[#1A202E] border-white/[0.1] text-slate-200 hover:border-amber-400/50'
              }`}
            >
              <span className="block text-xs font-medium truncate">{label}</span>
              {isActive && modified && (
                <span
                  aria-label="Unsaved changes"
                  className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-300"
                />
              )}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onSave}
        title={`Save current mix to ${LABELS[activeIndex]}`}
        aria-label="Save snapshot"
        className={`px-3 rounded-md border transition-colors cursor-pointer ${
          modified
            ? 'bg-amber-500 border-amber-400 text-slate-950 hover:bg-amber-400'
            : 'bg-[#1A202E] border-white/[0.1] text-slate-300 hover:text-white'
        }`}
      >
        <Save className="w-4 h-4" />
      </button>
    </div>
  );
}