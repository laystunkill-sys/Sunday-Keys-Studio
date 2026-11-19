import { ReactNode } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, FilePlus2, ListPlus, Pencil, Plus, Trash2 } from 'lucide-react';
import { getDiatonicWorshipChords } from '../data/instruments';
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
  onEditSong: (songId: string) => void;
  onNewSong: () => void;
  onNewSetlist: () => void;
  onEditSetlist: () => void;
  extra?: ReactNode;
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
  onEditSong,
  onNewSong,
  onNewSetlist,
  onEditSetlist,
  extra,
}: SetlistSidebarProps) {
  const activeSetlist = setlists.find((s) => s.id === activeSetlistId) || setlists[0];
  const songs = activeSetlist?.songs || [];
  const activeIndex = songs.findIndex((s) => s.id === activeSongId);

  return (
    <aside className="w-[220px] xl:w-[244px] min-h-0 bg-[#10131B] border-r border-white/[0.08] flex flex-col shrink-0">
      <div className="p-2 border-b border-white/[0.08] space-y-1.5 shrink-0">
        <div className="flex items-center gap-1.5">
          <select
            value={activeSetlistId}
            onChange={(e) => onSelectSetlist(e.target.value)}
            aria-label="Active Setlist"
            className="flex-1 min-w-0 bg-[#161A24] border border-white/[0.1] rounded-md px-2 py-1.5 text-xs font-medium text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400/50 cursor-pointer"
          >
            {setlists.map((sl) => (
              <option key={sl.id} value={sl.id}>
                {sl.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onEditSetlist}
            title="Rename / delete this setlist"
            aria-label="Edit setlist"
            className="p-1.5 rounded-md bg-[#161A24] border border-white/[0.1] text-slate-300 hover:text-amber-400 cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onNewSetlist}
            title="New setlist"
            aria-label="New setlist"
            className="p-1.5 rounded-md bg-[#161A24] border border-white/[0.1] text-slate-300 hover:text-amber-400 cursor-pointer"
          >
            <ListPlus className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-slate-400 truncate">{activeSetlist?.serviceLabel}</p>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onStepSong(-1)}
              disabled={songs.length <= 1 || activeIndex <= 0}
              title="Previous Song"
              className="px-1.5 py-0.5 rounded bg-[#181C26] text-[11px] text-slate-300 hover:bg-[#222836] hover:text-white disabled:opacity-35 disabled:pointer-events-none cursor-pointer flex items-center"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>
            <button
              type="button"
              onClick={() => onStepSong(1)}
              disabled={songs.length <= 1 || activeIndex >= songs.length - 1}
              title="Next Song"
              className="px-1.5 py-0.5 rounded bg-[#181C26] text-[11px] text-slate-300 hover:bg-[#222836] hover:text-white disabled:opacity-35 disabled:pointer-events-none cursor-pointer flex items-center"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-white/[0.06]">
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
                className={`group px-3 py-2 transition-colors ${
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

                  <div
                    className={`flex items-center gap-0.5 focus-within:opacity-100 transition-opacity shrink-0 ${
                      isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onEditSong(song.id)}
                      title="Edit song & chord progression"
                      className="p-1 text-slate-400 hover:text-amber-400 cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
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

                {song.chordProgression && song.chordProgression.length > 0 && (
                  <p className="mt-1.5 pl-6 text-[11px] text-amber-300/80 font-mono-tabular truncate">
                    {song.chordProgression
                      .map((i) => getDiatonicWorshipChords(song.key)[i]?.label)
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}

                {isSelected && song.notes && (
                  <p className="mt-1.5 pl-6 text-[11px] text-slate-300/80 leading-snug line-clamp-2">
                    {song.notes}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="p-2 border-t border-white/[0.08] shrink-0 grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={onNewSong}
          className="py-1.5 px-2 flex items-center justify-center gap-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-md transition-colors cursor-pointer"
        >
          <FilePlus2 className="w-3.5 h-3.5" />
          <span>New Song</span>
        </button>
        <button
          type="button"
          onClick={onAddCurrentToSetlist}
          title="Add the current patch to this setlist"
          className="py-1.5 px-2 flex items-center justify-center gap-1.5 text-xs font-medium bg-[#181C26] hover:bg-[#212736] text-slate-200 border border-white/[0.08] rounded-md transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-amber-400" />
          <span>Add Patch</span>
        </button>
      </div>

      {extra && <div className="p-2 border-t border-white/[0.08] shrink-0">{extra}</div>}
    </aside>
  );
}
