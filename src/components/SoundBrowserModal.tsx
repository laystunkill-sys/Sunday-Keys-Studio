import { ArrowDownUp, ChevronDown, Keyboard, Search, Upload, Volume2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { BROWSER_CATEGORIES, INSTRUMENTS } from '../data/instruments';
import { FactoryLibraryName, InstrumentPreset, LayerConfig } from '../types/worship';

interface SoundBrowserModalProps {
  targetLayer: LayerConfig;
  customInstruments: InstrumentPreset[];
  onClose: () => void;
  onSelectSound: (slotIndex: number, instrument: InstrumentPreset) => void;
  onAuditionSound: (instrument: InstrumentPreset) => void;
  onOpenImport: () => void;
}

type SortField = 'name' | 'intensity' | 'source';

export function SoundBrowserModal({
  targetLayer,
  customInstruments,
  onClose,
  onSelectSound,
  onAuditionSound,
  onOpenImport,
}: SoundBrowserModalProps) {
  const allInstruments = useMemo(
    () => [...customInstruments, ...INSTRUMENTS],
    [customInstruments],
  );

  const currentInst = useMemo(
    () => allInstruments.find((i) => i.id === targetLayer.instrumentId) || allInstruments[0],
    [allInstruments, targetLayer.instrumentId],
  );

  const [libraryFilter, setLibraryFilter] = useState<'All' | FactoryLibraryName>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>(
    currentInst.browserCategory || 'Acoustic Piano & Keys',
  );
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedSource, setSelectedSource] = useState<string>('All');
  const [selectedTimbre, setSelectedTimbre] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [highlightedId, setHighlightedId] = useState<string>(currentInst.id);
  const [autoAudition, setAutoAudition] = useState(true);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const baseByLibrary = useMemo(() => {
    if (libraryFilter === 'All') return allInstruments;
    return allInstruments.filter((i) => i.library === libraryFilter);
  }, [allInstruments, libraryFilter]);

  const byCategory = useMemo(() => {
    if (selectedCategory === 'All') return baseByLibrary;
    return baseByLibrary.filter((i) => i.browserCategory === selectedCategory);
  }, [baseByLibrary, selectedCategory]);

  const availableTypes = useMemo(() => {
    const set = new Set<string>();
    byCategory.forEach((i) => set.add(i.soundType));
    return ['All', ...Array.from(set).sort()];
  }, [byCategory]);

  const byType = useMemo(() => {
    if (selectedType === 'All') return byCategory;
    return byCategory.filter((i) => i.soundType === selectedType);
  }, [byCategory, selectedType]);

  const availableSources = useMemo(() => {
    const set = new Set<string>();
    byType.forEach((i) => set.add(i.sourceModel));
    return ['All', ...Array.from(set).sort()];
  }, [byType]);

  const bySource = useMemo(() => {
    if (selectedSource === 'All') return byType;
    return byType.filter((i) => i.sourceModel === selectedSource);
  }, [byType, selectedSource]);

  const availableTimbres = useMemo(() => {
    const set = new Set<string>();
    bySource.forEach((i) => i.timbres.forEach((t) => set.add(t)));
    return ['All', ...Array.from(set).sort()];
  }, [bySource]);

  const filteredResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = bySource.filter((i) => {
      if (selectedTimbre !== 'All' && !i.timbres.includes(selectedTimbre)) {
        return false;
      }
      if (!q) return true;
      return (
        i.name.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.soundType.toLowerCase().includes(q) ||
        i.sourceModel.toLowerCase().includes(q) ||
        i.timbres.some((t) => t.toLowerCase().includes(q))
      );
    });

    const sorted = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') {
        cmp = a.name.localeCompare(b.name);
      } else if (sortBy === 'intensity') {
        cmp = a.intensity - b.intensity || a.name.localeCompare(b.name);
      } else {
        cmp = a.sourceModel.localeCompare(b.sourceModel) || a.name.localeCompare(b.name);
      }
      return sortAsc ? cmp : -cmp;
    });
    return sorted;
  }, [bySource, searchQuery, selectedTimbre, sortAsc, sortBy]);

  const highlightedInstrument = useMemo(
    () =>
      filteredResults.find((i) => i.id === highlightedId) ||
      allInstruments.find((i) => i.id === highlightedId) ||
      filteredResults[0] ||
      null,
    [allInstruments, filteredResults, highlightedId],
  );

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setSelectedType('All');
    setSelectedSource('All');
    setSelectedTimbre('All');
  };

  const handleTypeChange = (t: string) => {
    setSelectedType(t);
    setSelectedSource('All');
    setSelectedTimbre('All');
  };

  const handleSourceChange = (s: string) => {
    setSelectedSource(s);
    setSelectedTimbre('All');
  };

  const handleRowClick = (inst: InstrumentPreset) => {
    setHighlightedId(inst.id);
    if (autoAudition) {
      onAuditionSound(inst);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Add Sound to Module ${targetLayer.slotIndex + 1}`}
    >
      <div className="w-full max-w-6xl h-[86vh] max-h-[760px] bg-[#161922] border border-white/[0.12] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Top Browser Bar */}
        <div className="px-4 py-3 bg-[#1A1E29] border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-4 shrink-0">
          {/* Left: Library Selector */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-400">Library</span>
            <div className="relative">
              <select
                value={libraryFilter}
                onChange={(e) => {
                  setLibraryFilter(e.target.value as 'All' | FactoryLibraryName);
                  setSelectedType('All');
                  setSelectedSource('All');
                  setSelectedTimbre('All');
                }}
                aria-label="Sound Library Filter"
                className="appearance-none bg-[#232836] border border-white/[0.1] rounded-md pl-3 pr-8 py-1.5 text-xs font-medium text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#7FA4E8] cursor-pointer"
              >
                <option value="All">All Libraries</option>
                <option value="Sunday Keys Core">Sunday Keys Core</option>
                <option value="Ballad & Felt">Ballad & Felt</option>
                <option value="Worship Synth Anthology">Worship Synth Anthology</option>
                <option value="User Imported">User Imported ({customInstruments.length})</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Center: Module Target Indicator */}
          <div className="flex items-center gap-2">
            <span
              className="w-3.5 h-3.5 rounded-sm shrink-0"
              style={{ backgroundColor: targetLayer.color }}
            />
            <h2 className="font-display text-sm font-semibold text-slate-100">
              Add Sound to Module {targetLayer.slotIndex + 1}
            </h2>
          </div>

          {/* Right: Search & Close */}
          <div className="flex items-center gap-2">
            <div className="relative w-48 sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search"
                className="w-full bg-[#10131A] border border-white/[0.1] rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#7FA4E8]"
              />
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Sound Browser"
              className="p-1.5 text-slate-400 hover:text-slate-100 rounded-md hover:bg-white/[0.06] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 5-Column Browser Body */}
        <div className="flex-1 grid grid-cols-2 md:grid-cols-[1fr_1fr_1fr_1fr_1.65fr] min-h-0 divide-x divide-white/[0.07]">
          {/* Column 1: Category */}
          <div className="flex flex-col min-h-0 bg-[#141720]">
            <button
              type="button"
              onClick={() => handleCategoryChange('All')}
              className="px-3.5 py-2.5 border-b border-white/[0.07] flex items-center justify-between text-xs font-medium text-slate-300 hover:text-white bg-[#191D28] shrink-0 cursor-pointer"
            >
              <span>Category</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
              {['All', ...BROWSER_CATEGORIES].map((cat) => {
                const active = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategoryChange(cat)}
                    className={`w-full text-left px-3 py-1.5 rounded text-xs transition-colors truncate cursor-pointer ${
                      active
                        ? 'bg-[#7FA4E8] text-[#0E1117] font-semibold'
                        : 'text-slate-300 hover:bg-white/[0.05] hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Column 2: Type */}
          <div className="flex flex-col min-h-0 bg-[#141720]">
            <button
              type="button"
              onClick={() => handleTypeChange('All')}
              className="px-3.5 py-2.5 border-b border-white/[0.07] flex items-center justify-between text-xs font-medium text-slate-300 hover:text-white bg-[#191D28] shrink-0 cursor-pointer"
            >
              <span>Type</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
              {availableTypes.map((t) => {
                const active = selectedType === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleTypeChange(t)}
                    className={`w-full text-left px-3 py-1.5 rounded text-xs transition-colors truncate cursor-pointer ${
                      active
                        ? 'bg-[#7FA4E8] text-[#0E1117] font-semibold'
                        : 'text-slate-300 hover:bg-white/[0.05] hover:text-white'
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Column 3: Source/Model */}
          <div className="hidden md:flex flex-col min-h-0 bg-[#141720]">
            <button
              type="button"
              onClick={() => handleSourceChange('All')}
              className="px-3.5 py-2.5 border-b border-white/[0.07] flex items-center justify-between text-xs font-medium text-slate-300 hover:text-white bg-[#191D28] shrink-0 cursor-pointer"
            >
              <span>Source/Model</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
              {availableSources.map((src) => {
                const active = selectedSource === src;
                return (
                  <button
                    key={src}
                    type="button"
                    onClick={() => handleSourceChange(src)}
                    className={`w-full text-left px-3 py-1.5 rounded text-xs transition-colors truncate cursor-pointer ${
                      active
                        ? 'bg-[#7FA4E8] text-[#0E1117] font-semibold'
                        : 'text-slate-300 hover:bg-white/[0.05] hover:text-white'
                    }`}
                  >
                    {src}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Column 4: Timbre */}
          <div className="hidden md:flex flex-col min-h-0 bg-[#141720]">
            <button
              type="button"
              onClick={() => setSelectedTimbre('All')}
              className="px-3.5 py-2.5 border-b border-white/[0.07] flex items-center justify-between text-xs font-medium text-slate-300 hover:text-white bg-[#191D28] shrink-0 cursor-pointer"
            >
              <span>Timbre</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
              {availableTimbres.map((timbre) => {
                const active = selectedTimbre === timbre;
                return (
                  <button
                    key={timbre}
                    type="button"
                    onClick={() => setSelectedTimbre(timbre)}
                    className={`w-full text-left px-3 py-1.5 rounded text-xs transition-colors truncate cursor-pointer ${
                      active
                        ? 'bg-[#7FA4E8] text-[#0E1117] font-semibold'
                        : 'text-slate-300 hover:bg-white/[0.05] hover:text-white'
                    }`}
                  >
                    {timbre}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Column 5: Sound Results List */}
          <div className="col-span-2 md:col-span-1 flex flex-col min-h-0 bg-[#13161F]">
            {/* Sort Toolbar */}
            <div className="px-3 py-1.5 border-b border-white/[0.07] bg-[#191D28] flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[11px] text-slate-400 whitespace-nowrap">Order by</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortField)}
                  aria-label="Order results by"
                  className="bg-[#232836] border border-white/[0.08] rounded px-2 py-1 text-xs text-slate-100 focus:outline-none cursor-pointer"
                >
                  <option value="name">Name</option>
                  <option value="intensity">Brightness</option>
                  <option value="source">Model</option>
                </select>
              </div>
              <button
                type="button"
                onClick={() => setSortAsc((prev) => !prev)}
                title={sortAsc ? 'Sort Ascending' : 'Sort Descending'}
                className="p-1.5 rounded bg-[#232836] border border-white/[0.08] text-slate-300 hover:text-white cursor-pointer shrink-0"
              >
                <ArrowDownUp className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Matching Sounds */}
            <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
              {filteredResults.length === 0 ? (
                <div className="p-6 text-center space-y-2">
                  <p className="text-xs text-slate-400">No matching sounds found.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('All');
                      setSelectedType('All');
                      setSelectedSource('All');
                      setSelectedTimbre('All');
                      setSearchQuery('');
                    }}
                    className="text-xs text-[#7FA4E8] hover:underline cursor-pointer"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                filteredResults.map((inst) => {
                  const isSelected = highlightedInstrument?.id === inst.id;
                  return (
                    <button
                      key={inst.id}
                      type="button"
                      onClick={() => handleRowClick(inst)}
                      onDoubleClick={() => {
                        onSelectSound(targetLayer.slotIndex, inst);
                        onClose();
                      }}
                      className={`w-full px-3 py-2 rounded flex items-center justify-between gap-2 text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#7FA4E8] text-[#0E1117]'
                          : 'text-slate-200 hover:bg-white/[0.06]'
                      }`}
                    >
                      <span className="text-xs font-medium truncate">{inst.name}</span>
                      {/* 5-dot character/brightness indicator matching screenshot */}
                      <span
                        className="flex items-center gap-1 shrink-0"
                        title={`Presence ${inst.intensity}/5`}
                      >
                        {[1, 2, 3, 4, 5].map((dot) => (
                          <span
                            key={dot}
                            className={`w-1 h-1 rounded-full ${
                              dot <= inst.intensity
                                ? isSelected
                                  ? 'bg-[#0E1117]'
                                  : 'bg-slate-300'
                                : isSelected
                                  ? 'bg-[#0E1117]/25'
                                  : 'bg-slate-600'
                            }`}
                          />
                        ))}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Bottom Footer Bar */}
        <div className="px-4 py-3 bg-[#1A1E29] border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => {
                if (highlightedInstrument) onAuditionSound(highlightedInstrument);
              }}
              disabled={!highlightedInstrument}
              title="Audition Selected Sound"
              className="p-2 rounded-md bg-[#232836] border border-white/[0.1] text-slate-200 hover:text-white hover:border-[#7FA4E8]/60 disabled:opacity-40 cursor-pointer"
            >
              <Keyboard className="w-4 h-4" />
            </button>

            <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoAudition}
                onChange={(e) => setAutoAudition(e.target.checked)}
                className="accent-[#7FA4E8] cursor-pointer"
              />
              <Volume2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Preview on click</span>
            </label>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenImport();
              }}
              className="px-3 py-1.5 rounded-md bg-[#232836] border border-white/[0.1] text-xs font-medium text-amber-300 hover:border-amber-400/50 hover:text-amber-200 flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import External</span>
            </button>

            {highlightedInstrument && (
              <span className="hidden lg:inline text-xs text-slate-400 truncate max-w-sm pl-2 border-l border-white/[0.08]">
                {highlightedInstrument.description}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-md text-xs font-medium bg-[#232836] border border-white/[0.1] text-slate-200 hover:bg-[#2C3344] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!highlightedInstrument}
              onClick={() => {
                if (!highlightedInstrument) return;
                onSelectSound(targetLayer.slotIndex, highlightedInstrument);
                onClose();
              }}
              className="px-5 py-2 rounded-md text-xs font-semibold bg-[#7FA4E8] text-[#0E1117] hover:bg-[#95B6F0] disabled:opacity-35 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              Add Sound
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
