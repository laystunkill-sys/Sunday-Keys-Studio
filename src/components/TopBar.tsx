import { WorkspaceTab } from '../types/worship';

interface TopBarProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  audioRunning: boolean;
  onStartAudio: () => void;
  onOpenSaveModal: () => void;
}

const NAV_ITEMS: { id: WorkspaceTab; label: string }[] = [
  { id: 'perform', label: 'Perform' },
  { id: 'builder', label: 'Patch Builder' },
  { id: 'library', label: 'Patch Library' },
  { id: 'import', label: 'Import Sound' },
  { id: 'midi', label: 'Audio & MIDI' },
];

export function TopBar({
  activeTab,
  onSelectTab,
  audioRunning,
  onStartAudio,
  onOpenSaveModal,
}: TopBarProps) {
  return (
    <header className="h-11 px-4 bg-[#0F1219] border-b border-white/[0.08] flex items-center justify-between gap-4 shrink-0">
      {/* Zone 1: Single text wordmark */}
      <a
        href="#perform"
        onClick={(e) => {
          e.preventDefault();
          onSelectTab('perform');
        }}
        className="font-display text-base font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0"
      >
        Sunday Keys Studio
      </a>

      {/* Zone 2: Clean single-line text nav links */}
      <nav className="flex items-center gap-6 overflow-x-auto" aria-label="Workspace Views">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`relative py-3 text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 ${
                isActive ? 'text-amber-400' : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {item.label}
              {isActive && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-amber-400 rounded-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: Single primary action */}
      <div className="shrink-0">
        {!audioRunning ? (
          <button
            type="button"
            onClick={onStartAudio}
            className="px-3 py-1.5 text-xs font-semibold bg-amber-500 text-slate-950 rounded-md hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            Enable Audio
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenSaveModal}
            className="px-3 py-1.5 text-xs font-semibold bg-[#1E2330] text-slate-100 border border-white/[0.12] rounded-md hover:bg-[#272D3D] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
          >
            Save Patch
          </button>
        )}
      </div>
    </header>
  );
}
