import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { Setlist, SetlistSong } from '../types/worship';

interface SetlistSidebarProps {
  setlists: Setlist[];
  activeSetlistId: string;
  activeSongId: string;
  onSelectSetlist: (setlistId: string) => void;
  onSelectSong: (song: SetlistSong) => void;
  onStepSong: (direction: -1 | 1) => void;
  onMoveSong: (songId: string, direction: -1 | 1) => void;
  onDeleteSong: (songId: string) => void;
  onAddCurrentToSetlist: () => void;
}

export function SetlistSidebar({
  setlists,
  activeSetlistId,
  activeSongId,
  onSelectSetlist,
  onSelectSong,
  onStepSong,
  onMoveSong,
  onDeleteSong,
  onAddCurrentToSetlist,
}: SetlistSidebarProps) {
  const activeSetlist = setlists.find((s) => s.id === activeSetlistId) || setlists[0];
  const songs = activeSetlist?.songs || [];
  const activeIndex = songs.findIndex((s) => s.id === activeSongId);

  return (
    <aside className="w-full lg:w-[272px] bg-[#10131B] border-b lg:border-b-0 lg:border-r border-white/[0.08] flex flex-col shrink-0">
      <div className="p-4 border-b border-white/[0.08] space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-sm font-semibold text-slate-100 tracking-tight">
            Setlist Queue
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onStepSong(-1)}
              disabled={songs.length <= 1 || activeIndex <= 0}
              title="Previous Song"
              className="p-1.5 rounded bg-[#181C26] text-slate-300 hover:bg-[#222836] hover:text-white disabled:opacity-35 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onStepSong(1)}
              disabled={songs.length <= 1 || activeIndex >= songs.length - 1}
              title="Next Song"
              className="p-1.5 rounded bg-[#181C26] text-slate-300 hover:bg-[#222836] hover:text-white disabled:opacity-35 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <select
          value={activeSetlistId}
          onChange={(e) => onSelectSetlist(e.target.value)}
          aria-label="Active Setlist"
          className="w-full bg-[#161A24] border border-white/[0.1] rounded-md px-3 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400/50 cursor-pointer"
        >
          {setlists.map((sl) => (
            <option key={sl.id} value={sl.id}>
              {sl.name}
            </option>
          ))}
        </select>
        {activeSetlist && (
          <p className="text-xs text-slate-400 truncate">{activeSetlist.serviceLabel}</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-white/[0.06]">
        {songs.length === 0 ? (
          <div className="p-6 text-center space-y-2">
            <p className="text-xs text-slate-400">No songs in this setlist yet.</p>
          </div>
        ) : (
          songs.map((song, idx) => {
            const isSelected = song.id === activeSongId;
            return (
              <div
                key={song.id}
                className={`group px-4 py-3 transition-colors ${
                  isSelected ? 'bg-[#1A202E]' : 'hover:bg-[#151923]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectSong(song)}
                    className="flex-1 text-left min-w-0 cursor-pointer focus-visible:outline-none"
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono-tabular text-[11px] text-slate-500 w-4 shrink-0">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span
                        className={`text-sm font-medium truncate ${
                          isSelected ? 'text-amber-400' : 'text-slate-100'
                        }`}
                      >
                        {song.title}
                      </span>
                    </div>
                    <div className="mt-1 pl-6 flex items-center gap-1.5 text-xs text-slate-400 font-mono-tabular">
                      <span>Key {song.key}</span>
                      <span aria-hidden="true">·</span>
                      <span>{song.bpm} BPM</span>
                      <span aria-hidden="true">·</span>
                      <span>{song.timeSignature}</span>
                    </div>
                  </button>

                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
                    <button
                      type="button"
                      onClick={() => onMoveSong(song.id, -1)}
                      disabled={idx === 0}
                      title="Move Up"
                      className="p-1 text-slate-400 hover:text-slate-100 disabled:opacity-25 cursor-pointer"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onMoveSong(song.id, 1)}
                      disabled={idx === songs.length - 1}
                      title="Move Down"
                      className="p-1 text-slate-400 hover:text-slate-100 disabled:opacity-25 cursor-pointer"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    {songs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onDeleteSong(song.id)}
                        title="Remove Song"
                        className="p-1 text-slate-400 hover:text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {isSelected && song.notes && (
                  <p className="mt-2 pl-6 text-xs text-slate-300/80 leading-relaxed">
                    {song.notes}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="p-3 border-t border-white/[0.08]">
        <button
          type="button"
          onClick={onAddCurrentToSetlist}
          className="w-full py-2 px-3 flex items-center justify-center gap-2 text-xs font-medium bg-[#181C26] hover:bg-[#212736] text-slate-200 border border-white/[0.08] rounded-md transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-amber-400" />
          <span>Add Current Patch to Setlist</span>
        </button>
      </div>
    </aside>
  );
}
