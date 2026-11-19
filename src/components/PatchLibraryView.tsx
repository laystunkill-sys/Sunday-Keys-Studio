import { Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { INSTRUMENT_MAP } from '../data/instruments';
import { PatchCategory, WorshipPatch } from '../types/worship';

interface PatchLibraryViewProps {
  patches: WorshipPatch[];
  activePatchId: string;
  onLoadPatch: (patch: WorshipPatch) => void;
  onAddPatchToSetlist: (patch: WorshipPatch) => void;
  onDeleteCustomPatch: (patchId: string) => void;
}

const CATEGORIES: ('All' | PatchCategory)[] = [
  'All',
  'Layered Worship',
  'Piano + Pad',
  'Synth & Lead',
  'Ambient',
  'Custom',
];

export function PatchLibraryView({
  patches,
  activePatchId,
  onLoadPatch,
  onAddPatchToSetlist,
  onDeleteCustomPatch,
}: PatchLibraryViewProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'All' | PatchCategory>('All');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return patches.filter((p) => {
      const catMatch = category === 'All' || p.category === category;
      if (!catMatch) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.layers.some((l) =>
          (INSTRUMENT_MAP[l.instrumentId]?.name || '').toLowerCase().includes(q),
        )
      );
    });
  }, [category, patches, query]);

  return (
    <div className="p-5 space-y-5 max-w-6xl mx-auto w-full">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-slate-100">
            Worship Patch Library
          </h2>
          <p className="text-xs text-slate-400">
            Audition curated 5-layer worship patches or append them directly to your active setlist
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search patches or sounds..."
            className="w-full bg-[#141822] border border-white/[0.1] rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400/60"
          />
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1 p-1 bg-[#11141C] border border-white/[0.08] rounded-lg overflow-x-auto w-fit max-w-full">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              category === cat
                ? 'bg-[#212736] text-amber-400'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Patch List */}
      {filtered.length === 0 ? (
        <div className="bg-[#141822] border border-white/[0.08] rounded-lg p-10 text-center space-y-2">
          <p className="text-sm font-medium text-slate-200">No matching patches found</p>
          <p className="text-xs text-slate-400">
            Try clearing the search query or switching to All Categories.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((patch) => {
            const isLoaded = patch.id === activePatchId;
            return (
              <div
                key={patch.id}
                className={`bg-[#141822] border rounded-lg p-4 flex flex-col justify-between gap-4 transition-colors ${
                  isLoaded ? 'border-amber-400/60' : 'border-white/[0.08]'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-display text-sm font-semibold text-slate-100 truncate">
                        {patch.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5 font-mono-tabular">
                        {patch.category} · Key {patch.key} · {patch.bpm} BPM · {patch.timeSignature}
                      </p>
                    </div>
                    {patch.isCustom && (
                      <button
                        type="button"
                        onClick={() => onDeleteCustomPatch(patch.id)}
                        title="Delete Custom Patch"
                        className="p-1 text-slate-400 hover:text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {patch.description}
                  </p>

                  {/* 5-Layer Signal Summary */}
                  <div className="pt-2 border-t border-white/[0.06] grid grid-cols-5 gap-1.5 text-[11px]">
                    {patch.layers.map((l) => {
                      const inst = INSTRUMENT_MAP[l.instrumentId];
                      return (
                        <div
                          key={l.slotIndex}
                          className={`truncate ${l.enabled ? 'text-slate-200' : 'text-slate-500'}`}
                        >
                          <span
                            className="inline-block w-1.5 h-1.5 rounded-full mr-1"
                            style={{ backgroundColor: l.enabled ? l.color : '#475569' }}
                          />
                          {inst?.name.split(' ')[0] || l.label}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => onAddPatchToSetlist(patch)}
                    className="px-3 py-1.5 rounded text-xs font-medium bg-[#0D1017] border border-white/[0.08] text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add to Setlist</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onLoadPatch(patch)}
                    className={`px-3.5 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      isLoaded
                        ? 'bg-amber-500/20 border border-amber-400/60 text-amber-300'
                        : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                    }`}
                  >
                    {isLoaded ? 'Loaded' : 'Load Patch'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
