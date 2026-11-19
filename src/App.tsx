import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { audioEngine } from './audio/AudioEngine';
import { AudioMidiSettingsView } from './components/AudioMidiSettingsView';
import { ChannelStrip } from './components/ChannelStrip';
import { EffectsRack } from './components/EffectsRack';
import { ImportSoundView } from './components/ImportSoundView';
import { PatchBuilderView } from './components/PatchBuilderView';
import { PatchLibraryView } from './components/PatchLibraryView';
import { PerformanceKeyboard } from './components/PerformanceKeyboard';
import { SavePatchModal } from './components/SavePatchModal';
import { SetlistEditorModal } from './components/SetlistEditorModal';
import { SnapshotBar } from './components/SnapshotBar';
import { SongEditorModal } from './components/SongEditorModal';
import { SetlistSidebar } from './components/SetlistSidebar';
import { SoundBrowserModal } from './components/SoundBrowserModal';
import { TonicPadConsole } from './components/TonicPadConsole';
import { TopBar } from './components/TopBar';
import { TransportStageBar } from './components/TransportStageBar';
import { CURATED_PATCHES, DEFAULT_PROGRESSION, DEFAULT_SETLISTS } from './data/instruments';
import { useMidi } from './hooks/useMidi';
import {
  deleteCustomSound,
  loadAllCustomSounds,
  saveCustomSound,
  StoredCustomSound,
} from './storage/customSoundStore';
import {
  InstrumentPreset,
  LayerConfig,
  MasterEffectsConfig,
  MusicalKey,
  PatchCategory,
  Setlist,
  SetlistSong,
  SongSnapshot,
  TimeSignature,
  TonicPadConfig,
  WorkspaceTab,
  WorshipPatch,
} from './types/worship';

const STORAGE_SETLISTS_KEY = 'sunday-keys-setlists-v1';
const STORAGE_CUSTOM_PATCHES_KEY = 'sunday-keys-custom-patches-v1';

const QWERTY_OFFSET_MAP: Record<string, number> = {
  // Lower octave starting at startMidi
  z: 0,
  s: 1,
  x: 2,
  d: 3,
  c: 4,
  v: 5,
  g: 6,
  b: 7,
  h: 8,
  n: 9,
  j: 10,
  m: 11,
  ',': 12,
  l: 13,
  '.': 14,
  ';': 15,
  '/': 16,
  // Upper octave starting at startMidi + 12
  q: 12,
  '2': 13,
  w: 14,
  '3': 15,
  e: 16,
  r: 17,
  '5': 18,
  t: 19,
  '6': 20,
  y: 21,
  '7': 22,
  u: 23,
  i: 24,
  '9': 25,
  o: 26,
  '0': 27,
  p: 28,
};

function loadInitialSetlists(): Setlist[] {
  try {
    const raw = localStorage.getItem(STORAGE_SETLISTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Setlist[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Older saved setlists have no chord progression: fill in the starter one
        const starters = new Map(
          DEFAULT_SETLISTS.flatMap((sl) => sl.songs).map((s) => [s.id, s.chordProgression]),
        );
        return parsed.map((sl) => ({
          ...sl,
          songs: sl.songs.map((song) =>
            song.chordProgression ? song : { ...song, chordProgression: starters.get(song.id) ?? [] },
          ),
        }));
      }
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_SETLISTS;
}

function loadInitialCustomPatches(): WorshipPatch[] {
  try {
    const raw = localStorage.getItem(STORAGE_CUSTOM_PATCHES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as WorshipPatch[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore storage errors
  }
  return [];
}

function clonePatch(patch: WorshipPatch): WorshipPatch {
  return {
    ...patch,
    layers: patch.layers.map((l) => ({ ...l })) as WorshipPatch['layers'],
    effects: { ...patch.effects },
  };
}

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('perform');
  const [setlists, setSetlists] = useState<Setlist[]>(loadInitialSetlists);
  const [customPatches, setCustomPatches] = useState<WorshipPatch[]>(loadInitialCustomPatches);

  const [activeSetlistId, setActiveSetlistId] = useState<string>(() => loadInitialSetlists()[0].id);
  const [activeSongId, setActiveSongId] = useState<string>(
    () => loadInitialSetlists()[0].songs[0]?.id || '',
  );

  const [songEditor, setSongEditor] = useState<{ song: SetlistSong; isNew: boolean } | null>(null);
  const [setlistEditor, setSetlistEditor] = useState<'new' | 'edit' | null>(null);

  const [builderSlot, setBuilderSlot] = useState<number>(0);
  const [soundBrowserSlot, setSoundBrowserSlot] = useState<number | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [customSounds, setCustomSounds] = useState<StoredCustomSound[]>([]);

  // Live Performance Runtime States
  const [audioRunning, setAudioRunning] = useState(false);
  const [modWheel, setModWheel] = useState(0.28);
  const [sustainDown, setSustainDown] = useState(false);
  const [transpose, setTranspose] = useState(0);
  const [clickEnabled, setClickEnabled] = useState(false);
  const [activeBeat, setActiveBeat] = useState(0);
  const [baseOctave, setBaseOctave] = useState(2); // C3 start
  const [activeNotes, setActiveNotes] = useState<Set<number>>(() => new Set());
  const [meters, setMeters] = useState<{ master: number; layers: number[] }>({
    master: 0,
    layers: [0, 0, 0, 0, 0],
  });

  const [tonicPad, setTonicPad] = useState<TonicPadConfig>({
    active: false,
    key: 'A',
    volume: 0.65,
    brightness: 0.45,
    preset: 'warm-analog',
    followSongKey: true,
  });

  const activeSetlist = useMemo(
    () => setlists.find((s) => s.id === activeSetlistId) || setlists[0],
    [activeSetlistId, setlists],
  );

  const activeSong: SetlistSong | undefined = useMemo(
    () =>
      activeSetlist?.songs.find((song) => song.id === activeSongId) ||
      activeSetlist?.songs[0],
    [activeSetlist, activeSongId],
  );

  const currentPatch: WorshipPatch = activeSong?.patch || CURATED_PATCHES[0];
  const currentKey: MusicalKey = activeSong?.key || currentPatch.key;
  const currentBpm: number = activeSong?.bpm || currentPatch.bpm;
  const currentTimeSig: TimeSignature = activeSong?.timeSignature || currentPatch.timeSignature;

  // Persist setlists and custom patches
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SETLISTS_KEY, JSON.stringify(setlists));
    } catch {
      // ignore
    }
  }, [setlists]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CUSTOM_PATCHES_KEY, JSON.stringify(customPatches));
    } catch {
      // ignore
    }
  }, [customPatches]);

  // Load persisted external audio samples from IndexedDB
  useEffect(() => {
    let active = true;
    void loadAllCustomSounds().then(async (items) => {
      if (!active) return;
      for (const item of items) {
        await audioEngine.registerCustomSound(item.preset, item.audioData);
      }
      if (active) {
        setCustomSounds(items);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const customInstruments = useMemo(
    () => customSounds.map((s) => s.preset),
    [customSounds],
  );

  // Sync audio engine with current patch & transport state
  useEffect(() => {
    audioEngine.updateLayers(currentPatch.layers);
  }, [currentPatch.layers]);

  useEffect(() => {
    audioEngine.updateEffects(currentPatch.effects);
  }, [currentPatch.effects]);

  useEffect(() => {
    audioEngine.updateTempo(currentBpm, currentTimeSig);
  }, [currentBpm, currentTimeSig]);

  useEffect(() => {
    audioEngine.setModWheel(modWheel);
  }, [modWheel]);

  useEffect(() => {
    audioEngine.setTranspose(transpose);
  }, [transpose]);

  useEffect(() => {
    audioEngine.setClickEnabled(clickEnabled);
  }, [clickEnabled]);

  useEffect(() => {
    audioEngine.setOnBeatCallback((beat) => {
      setActiveBeat(beat);
    });
    return () => audioEngine.setOnBeatCallback(null);
  }, []);

  // Keep Tonic Pad key synced to song key if followSongKey is enabled
  useEffect(() => {
    if (tonicPad.followSongKey && tonicPad.key !== currentKey) {
      setTonicPad((prev) => ({ ...prev, key: currentKey }));
    }
  }, [currentKey, tonicPad.followSongKey, tonicPad.key]);

  useEffect(() => {
    audioEngine.updateTonicPad(tonicPad);
  }, [tonicPad]);

  const ensureAudioStarted = useCallback(async () => {
    await audioEngine.init();
    setAudioRunning(audioEngine.isRunning());
  }, []);

  // Warm up audio on the very first interaction so the first chord isn't delayed
useEffect(() => {
  const warm = () => {
    void ensureAudioStarted();
  };
  window.addEventListener('pointerdown', warm, { once: true });
  window.addEventListener('keydown', warm, { once: true });
  return () => {
    window.removeEventListener('pointerdown', warm);
    window.removeEventListener('keydown', warm);
  };
}, [ensureAudioStarted]);

  // Metering loop while audio engine is running
  useEffect(() => {
    if (!audioRunning) return;
    let rafId = 0;
    let lastUpdate = 0;
    const tick = (now: number) => {
      if (now - lastUpdate > 60) {
        lastUpdate = now;
        const next = audioEngine.getMeterLevels();
        // Only re-render the app when a meter visibly moved
        setMeters((prev) => {
          const moved =
            Math.abs(prev.master - next.master) > 0.02 ||
            next.layers.some((v, i) => Math.abs((prev.layers[i] ?? 0) - v) > 0.02);
          return moved ? next : prev;
        });
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [audioRunning]);

  // Batch the on-screen key highlight updates: a 6-note chord = 1 re-render instead of 6
  const pendingNotesRef = useRef<{ add: Set<number>; remove: Set<number> }>({
    add: new Set(),
    remove: new Set(),
  });
  const flushRafRef = useRef(0);
  const queueActiveNote = useCallback((midi: number, on: boolean) => {
    const pending = pendingNotesRef.current;
    if (on) {
      pending.add.add(midi);
      pending.remove.delete(midi);
    } else {
      pending.remove.add(midi);
      pending.add.delete(midi);
    }
    if (flushRafRef.current) return;
    flushRafRef.current = requestAnimationFrame(() => {
      flushRafRef.current = 0;
      const { add, remove } = pendingNotesRef.current;
      pendingNotesRef.current = { add: new Set(), remove: new Set() };
      setActiveNotes((prev) => {
        const next = new Set(prev);
        add.forEach((n) => next.add(n));
        remove.forEach((n) => next.delete(n));
        return next;
      });
    });
  }, []);

  // Note triggers
  const handleNoteOn = useCallback(
    async (midi: number, velocity = 0.8) => {
      if (!audioEngine.isRunning()) {
        await ensureAudioStarted();
      }
      await audioEngine.noteOn(midi, velocity);
      queueActiveNote(midi, true);
    },
    [ensureAudioStarted, queueActiveNote],
  );

  const handleNoteOff = useCallback(
    (midi: number) => {
      audioEngine.noteOff(midi);
      queueActiveNote(midi, false);
    },
    [queueActiveNote],
  );

  const handleToggleSustain = useCallback((forceVal?: boolean) => {
    setSustainDown((prev) => {
      const next = typeof forceVal === 'boolean' ? forceVal : !prev;
      audioEngine.setSustain(next);
      return next;
    });
  }, []);

  const handlePanic = useCallback(() => {
    audioEngine.panic();
    setSustainDown(false);
    setActiveNotes(new Set());
  }, []);

  // Web MIDI Connection
  const midi = useMidi({
    onNoteOn: (n, v) => {
      void handleNoteOn(n, v);
    },
    onNoteOff: handleNoteOff,
    onModWheel: (v) => setModWheel(v),
    onSustain: (down) => handleToggleSustain(down),
    onMasterVolume: (vol) => {
      updateActiveEffects({ masterVolume: vol });
    },
  });

  // Patch & Song Mutators
  const updateActiveSong = useCallback(
    (updater: (song: SetlistSong) => SetlistSong) => {
      setSetlists((prev) =>
        prev.map((sl) => {
          if (sl.id !== activeSetlist.id) return sl;
          return {
            ...sl,
            songs: sl.songs.map((song) =>
              song.id === activeSong?.id ? updater(song) : song,
            ),
          };
        }),
      );
    },
    [activeSetlist.id, activeSong?.id],
  );

  const updateLayer = useCallback(
    (slotIndex: number, patch: Partial<LayerConfig>) => {
      updateActiveSong((song) => ({
        ...song,
        patch: {
          ...song.patch,
          layers: song.patch.layers.map((l) =>
            l.slotIndex === slotIndex ? { ...l, ...patch } : l,
          ) as WorshipPatch['layers'],
        },
      }));
    },
    [updateActiveSong],
  );

  const updateActiveEffects = useCallback(
    (patch: Partial<MasterEffectsConfig>) => {
      updateActiveSong((song) => ({
        ...song,
        patch: {
          ...song.patch,
          effects: { ...song.patch.effects, ...patch },
        },
      }));
    },
    [updateActiveSong],
  );

  const handleSelectSong = useCallback((song: SetlistSong) => {
    setActiveSongId(song.id);
    if (tonicPad.followSongKey) {
      setTonicPad((prev) => ({ ...prev, key: song.key }));
    }
  }, [tonicPad.followSongKey]);

  const handleStepSong = useCallback(
    (direction: -1 | 1) => {
      const songs = activeSetlist?.songs || [];
      const idx = songs.findIndex((s) => s.id === activeSong?.id);
      if (idx === -1) return;
      const nextIdx = Math.max(0, Math.min(songs.length - 1, idx + direction));
      if (songs[nextIdx]) handleSelectSong(songs[nextIdx]);
    },
    [activeSetlist?.songs, activeSong?.id, handleSelectSong],
  );

  const handleMoveSong = useCallback(
    (songId: string, direction: -1 | 1) => {
      setSetlists((prev) =>
        prev.map((sl) => {
          if (sl.id !== activeSetlist.id) return sl;
          const idx = sl.songs.findIndex((s) => s.id === songId);
          const targetIdx = idx + direction;
          if (idx === -1 || targetIdx < 0 || targetIdx >= sl.songs.length) return sl;
          const nextSongs = [...sl.songs];
          const [moved] = nextSongs.splice(idx, 1);
          nextSongs.splice(targetIdx, 0, moved);
          return { ...sl, songs: nextSongs };
        }),
      );
    },
    [activeSetlist.id],
  );

  const handleDeleteSong = useCallback(
    (songId: string) => {
      setSetlists((prev) =>
        prev.map((sl) => {
          if (sl.id !== activeSetlist.id) return sl;
          const remaining = sl.songs.filter((s) => s.id !== songId);
          if (songId === activeSongId && remaining[0]) {
            setActiveSongId(remaining[0].id);
          }
          return { ...sl, songs: remaining };
        }),
      );
    },
    [activeSetlist.id, activeSongId],
  );

  // ---- Snapshots (5 recallable mixer states per song) ----
  const captureSnapshot = (patch: WorshipPatch): SongSnapshot => ({
    layers: patch.layers.map((l) => ({ ...l })),
    effects: { ...patch.effects },
  });

  const snapshotSlots: (SongSnapshot | null)[] = useMemo(() => {
    const slots = activeSong?.snapshots ?? [];
    return Array.from({ length: 5 }, (_, i) => slots[i] ?? null);
  }, [activeSong?.snapshots]);
  const activeSnapshotIdx = activeSong?.activeSnapshot ?? 0;

  const snapshotModified = useMemo(() => {
    const saved = snapshotSlots[activeSnapshotIdx];
    if (!saved) return false;
    return JSON.stringify(captureSnapshot(currentPatch)) !== JSON.stringify(saved);
  }, [snapshotSlots, activeSnapshotIdx, currentPatch]);

  const handleSelectSnapshot = useCallback(
    (index: number) => {
      updateActiveSong((song) => {
        const active = song.activeSnapshot ?? 0;
        if (index === active) return song;
        const slots = Array.from({ length: 5 }, (_, i) => song.snapshots?.[i] ?? null);
        // First time leaving Default: keep the current mix so it isn't lost
        if (!slots[active]) slots[active] = captureSnapshot(song.patch);
        const target = slots[index];
        if (!target) {
          // Empty slot: start it from the current mix
          slots[index] = captureSnapshot(song.patch);
          return { ...song, snapshots: slots, activeSnapshot: index };
        }
        return {
          ...song,
          snapshots: slots,
          activeSnapshot: index,
          patch: {
            ...song.patch,
            layers: target.layers.map((l) => ({ ...l })) as WorshipPatch['layers'],
            effects: { ...target.effects },
          },
        };
      });
    },
    [updateActiveSong],
  );

  const handleSaveSnapshot = useCallback(() => {
    updateActiveSong((song) => {
      const slots = Array.from({ length: 5 }, (_, i) => song.snapshots?.[i] ?? null);
      slots[song.activeSnapshot ?? 0] = captureSnapshot(song.patch);
      return { ...song, snapshots: slots };
    });
  }, [updateActiveSong]);

  const handleEditSong = useCallback(
    (songId: string) => {
      const song = activeSetlist.songs.find((s) => s.id === songId);
      if (song) setSongEditor({ song, isNew: false });
    },
    [activeSetlist.songs],
  );

  const handleNewSong = useCallback(() => {
    setSongEditor({
      isNew: true,
      song: {
        id: `song-${Date.now()}`,
        title: 'New Song',
        artist: '',
        key: currentKey,
        bpm: currentBpm,
        timeSignature: currentTimeSig,
        notes: '',
        chordProgression: [...DEFAULT_PROGRESSION],
        patch: clonePatch(currentPatch),
      },
    });
  }, [currentBpm, currentKey, currentPatch, currentTimeSig]);

  const handleSaveSong = useCallback(
    (saved: SetlistSong, isNew: boolean) => {
      // keep the patch in sync with the song's key / tempo / time signature
      const song: SetlistSong = {
        ...saved,
        patch: { ...saved.patch, key: saved.key, bpm: saved.bpm, timeSignature: saved.timeSignature },
      };
      setSetlists((prev) =>
        prev.map((sl) => {
          if (sl.id !== activeSetlist.id) return sl;
          return {
            ...sl,
            songs: isNew
              ? [...sl.songs, song]
              : sl.songs.map((s) => (s.id === song.id ? song : s)),
          };
        }),
      );
      setActiveSongId(song.id);
      if (tonicPad.followSongKey) {
        setTonicPad((prev) => ({ ...prev, key: song.key }));
      }
    },
    [activeSetlist.id, tonicPad.followSongKey],
  );

  const handleSaveSetlist = useCallback(
    (name: string, serviceLabel: string) => {
      if (setlistEditor === 'new') {
        const starter: SetlistSong = {
          id: `song-${Date.now()}`,
          title: 'New Song',
          artist: '',
          key: currentKey,
          bpm: currentBpm,
          timeSignature: currentTimeSig,
          notes: '',
          chordProgression: [...DEFAULT_PROGRESSION],
          patch: clonePatch(currentPatch),
        };
        const created: Setlist = {
          id: `setlist-${Date.now()}`,
          name,
          serviceLabel,
          songs: [starter],
        };
        setSetlists((prev) => [...prev, created]);
        setActiveSetlistId(created.id);
        setActiveSongId(starter.id);
      } else {
        setSetlists((prev) =>
          prev.map((sl) => (sl.id === activeSetlist.id ? { ...sl, name, serviceLabel } : sl)),
        );
      }
    },
    [activeSetlist.id, currentBpm, currentKey, currentPatch, currentTimeSig, setlistEditor],
  );

  const handleDeleteSetlist = useCallback(() => {
    if (setlists.length <= 1) return;
    const remaining = setlists.filter((sl) => sl.id !== activeSetlist.id);
    setSetlists(remaining);
    setActiveSetlistId(remaining[0].id);
    setActiveSongId(remaining[0].songs[0]?.id || '');
  }, [activeSetlist.id, setlists]);

  const handleAddPatchToSetlist = useCallback(
    (patch: WorshipPatch) => {
      const newSong: SetlistSong = {
        id: `song-${Date.now()}`,
        title: patch.name,
        artist: patch.category,
        key: patch.key,
        bpm: patch.bpm,
        timeSignature: patch.timeSignature,
        notes: patch.description,
        patch: clonePatch(patch),
      };
      setSetlists((prev) =>
        prev.map((sl) =>
          sl.id === activeSetlist.id
            ? { ...sl, songs: [...sl.songs, newSong] }
            : sl,
        ),
      );
      setActiveSongId(newSong.id);
      setActiveTab('perform');
    },
    [activeSetlist.id],
  );

  const handleLoadPatchIntoSong = useCallback(
    (patch: WorshipPatch) => {
      updateActiveSong((song) => ({
        ...song,
        patch: clonePatch(patch),
      }));
      setActiveTab('perform');
    },
    [updateActiveSong],
  );

  const handleSaveNewCustomPatch = useCallback(
    (name: string, category: PatchCategory, description: string) => {
      const saved: WorshipPatch = {
        ...clonePatch(currentPatch),
        id: `custom-${Date.now()}`,
        name,
        category,
        description,
        key: currentKey,
        bpm: currentBpm,
        timeSignature: currentTimeSig,
        isCustom: true,
      };
      setCustomPatches((prev) => [saved, ...prev]);
      updateActiveSong((song) => ({ ...song, patch: clonePatch(saved) }));
    },
    [currentBpm, currentKey, currentPatch, currentTimeSig, updateActiveSong],
  );

  const handleAddCustomSound = useCallback(
    async (record: StoredCustomSound, decodedBuffer: AudioBuffer) => {
      await audioEngine.registerCustomSound(record.preset, record.audioData, decodedBuffer);
      await saveCustomSound(record);
      setCustomSounds((prev) => [record, ...prev]);
    },
    [],
  );

  const handleUpdateCustomSound = useCallback(
    async (preset: InstrumentPreset) => {
      audioEngine.updateCustomInstrumentMeta(preset);
      const existing = customSounds.find((item) => item.id === preset.id);
      setCustomSounds((prev) =>
        prev.map((item) => (item.id === preset.id ? { ...item, preset } : item)),
      );
      if (existing) {
        await saveCustomSound({ ...existing, preset });
      }
    },
    [customSounds],
  );

  const handleDeleteCustomSound = useCallback(async (id: string) => {
    audioEngine.removeCustomSound(id);
    await deleteCustomSound(id);
    setCustomSounds((prev) => prev.filter((s) => s.id !== id));
  }, []);

  // QWERTY Keyboard Playability + Spacebar Sustain
  const pressedKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const isInputFocused = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName.toLowerCase();
      return tag === 'input' || tag === 'textarea' || tag === 'select';
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isInputFocused(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.repeat) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleToggleSustain(true);
        return;
      }
      if (e.key === '[') {
        handleStepSong(-1);
        return;
      }
      if (e.key === ']') {
        handleStepSong(1);
        return;
      }

      const key = e.key.toLowerCase();
      if (key in QWERTY_OFFSET_MAP && !pressedKeysRef.current.has(key)) {
        pressedKeysRef.current.add(key);
        const startMidi = (baseOctave + 1) * 12;
        const midi = startMidi + QWERTY_OFFSET_MAP[key];
        void handleNoteOn(midi, 0.8);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        handleToggleSustain(false);
        return;
      }
      const key = e.key.toLowerCase();
      if (key in QWERTY_OFFSET_MAP && pressedKeysRef.current.has(key)) {
        pressedKeysRef.current.delete(key);
        const startMidi = (baseOctave + 1) * 12;
        const midi = startMidi + QWERTY_OFFSET_MAP[key];
        handleNoteOff(midi);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [baseOctave, handleNoteOff, handleNoteOn, handleStepSong, handleToggleSustain]);

  const allPatches = useMemo(
    () => [...customPatches, ...CURATED_PATCHES],
    [customPatches],
  );

  const anySoloed = currentPatch.layers.some((l) => l.soloed);
  const [fxOpen, setFxOpen] = useState(false);

  return (
    <div className="h-dvh overflow-hidden flex flex-col bg-[#0B0D12] text-[#F1F5F9]">
      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        audioRunning={audioRunning}
        onStartAudio={ensureAudioStarted}
        onOpenSaveModal={() => setShowSaveModal(true)}
      />

      <div className="flex-1 flex flex-row min-h-0">
        {/* Left Setlist Sidebar */}
        <SetlistSidebar
          setlists={setlists}
          activeSetlistId={activeSetlist.id}
          activeSongId={activeSong?.id || ''}
          onSelectSetlist={(id) => {
            setActiveSetlistId(id);
            const target = setlists.find((s) => s.id === id);
            if (target?.songs[0]) {
              handleSelectSong(target.songs[0]);
            }
          }}
          onSelectSong={handleSelectSong}
          onStepSong={handleStepSong}
          onMoveSong={handleMoveSong}
          onDeleteSong={handleDeleteSong}
          onAddCurrentToSetlist={() => handleAddPatchToSetlist(currentPatch)}
          onEditSong={handleEditSong}
          onNewSong={handleNewSong}
          onNewSetlist={() => setSetlistEditor('new')}
          onEditSetlist={() => setSetlistEditor('edit')}
          extra={
            activeTab === 'perform' ? (
              <TonicPadConsole
                config={tonicPad}
                songKey={currentKey}
                onChange={async (patch) => {
                  if (patch.active && !audioRunning) {
                    await ensureAudioStarted();
                  }
                  setTonicPad((prev) => ({ ...prev, ...patch }));
                }}
              />
            ) : undefined
          }
        />

        {/* Main Workspace Area */}
        <main className="flex-1 flex flex-col min-w-0 min-h-0">
          <TransportStageBar
            patchName={currentPatch.name}
            songTitle={activeSong?.title || currentPatch.name}
            songKey={currentKey}
            bpm={currentBpm}
            timeSignature={currentTimeSig}
            transpose={transpose}
            clickEnabled={clickEnabled}
            activeBeat={activeBeat}
            sustainDown={sustainDown}
            masterVolume={currentPatch.effects.masterVolume}
            masterLevel={meters.master}
            onChangeKey={(key) => updateActiveSong((s) => ({ ...s, key }))}
            onChangeBpm={(bpm) => updateActiveSong((s) => ({ ...s, bpm }))}
            onChangeTimeSignature={(timeSignature) =>
              updateActiveSong((s) => ({ ...s, timeSignature }))
            }
            onChangeTranspose={setTranspose}
            onToggleClick={async () => {
              if (!audioRunning) await ensureAudioStarted();
              setClickEnabled((prev) => !prev);
            }}
            onToggleSustain={() => handleToggleSustain()}
            onPanic={handlePanic}
            onChangeMasterVolume={(masterVolume) =>
              updateActiveEffects({ masterVolume })
            }
            fxOpen={fxOpen}
            onToggleFx={() => setFxOpen((v) => !v)}
          />

          {/* View Content */}
          <div className={`flex-1 min-h-0 ${activeTab === 'perform' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
            {activeTab === 'perform' && (
              <div className="h-full flex flex-col gap-2 p-2 relative">
                {/* 5-Layer Real-Time Mixer */}
                <div className="flex-1 min-h-0 grid grid-cols-5 grid-rows-[minmax(0,1fr)] gap-2">
                  {currentPatch.layers.map((layer, idx) => (
                    <ChannelStrip
                      key={layer.slotIndex}
                      layer={layer}
                      meterLevel={meters.layers[idx] || 0}
                      anySoloed={anySoloed}
                      onUpdate={(patch) => updateLayer(layer.slotIndex, patch)}
                      onOpenBuilder={(slotIdx) => {
                        setBuilderSlot(slotIdx);
                        setActiveTab('builder');
                      }}
                      onOpenSoundBrowser={(slotIdx) => setSoundBrowserSlot(slotIdx)}
                    />
                  ))}
                </div>

                {/* Master effects: opens from the FX button, like a drop-down panel */}
                {fxOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setFxOpen(false)} />
                    <div className="absolute z-30 right-2 top-2 w-[min(600px,calc(100%-1rem))] shadow-2xl shadow-black/60">
                      <EffectsRack
                        effects={currentPatch.effects}
                        onChangeEffects={updateActiveEffects}
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'builder' && (
              <PatchBuilderView
                layers={currentPatch.layers}
                customInstruments={customInstruments}
                selectedSlot={builderSlot}
                onSelectSlot={setBuilderSlot}
                onUpdateLayer={updateLayer}
                onOpenSaveModal={() => setShowSaveModal(true)}
                onOpenSoundBrowser={(slotIdx) => setSoundBrowserSlot(slotIdx)}
              />
            )}

            {activeTab === 'library' && (
              <PatchLibraryView
                patches={allPatches}
                activePatchId={currentPatch.id}
                onLoadPatch={handleLoadPatchIntoSong}
                onAddPatchToSetlist={handleAddPatchToSetlist}
                onDeleteCustomPatch={(id) =>
                  setCustomPatches((prev) => prev.filter((p) => p.id !== id))
                }
              />
            )}

            {activeTab === 'import' && (
              <ImportSoundView
                customSounds={customSounds}
                layers={currentPatch.layers}
                onAddCustomSound={handleAddCustomSound}
                onUpdateCustomSound={handleUpdateCustomSound}
                onDeleteCustomSound={handleDeleteCustomSound}
                onAssignToLayer={(slotIdx, preset) => {
                  updateLayer(slotIdx, {
                    instrumentId: preset.id,
                    enabled: true,
                    label: preset.name.split(' ').slice(0, 2).join(' '),
                  });
                  setActiveTab('perform');
                }}
                onAuditionSound={async (preset) => {
                  await ensureAudioStarted();
                  await audioEngine.previewInstrument(preset.id);
                }}
              />
            )}

            {activeTab === 'midi' && (
              <AudioMidiSettingsView
                audioRunning={audioRunning}
                sampleRate={audioEngine.getSampleRate()}
                activeVoices={audioEngine.getActiveVoiceCount()}
                midiSupported={midi.supported}
                midiAccessState={midi.accessState}
                devices={midi.devices}
                selectedDeviceId={midi.selectedDeviceId}
                channelFilter={midi.channelFilter}
                eventLog={midi.eventLog}
                onStartAudio={ensureAudioStarted}
                onTestChord={async () => {
                  await ensureAudioStarted();
                  const testNotes = [48, 55, 60, 62, 64];
                  testNotes.forEach((n) => void handleNoteOn(n, 0.78));
                  window.setTimeout(() => {
                    testNotes.forEach((n) => handleNoteOff(n));
                  }, 1200);
                }}
                onRefreshMidi={midi.connectMidi}
                onSelectDevice={midi.setSelectedDeviceId}
                onChangeChannelFilter={midi.setChannelFilter}
                onClearLog={midi.clearLog}
                onResetWorkspace={() => {
                  setSetlists(DEFAULT_SETLISTS);
                  setCustomPatches([]);
                  setActiveSetlistId(DEFAULT_SETLISTS[0].id);
                  setActiveSongId(DEFAULT_SETLISTS[0].songs[0].id);
                }}
              />
            )}
          </div>

          {activeTab === 'perform' && (
            <SnapshotBar
              snapshots={snapshotSlots}
              activeIndex={activeSnapshotIdx}
              modified={snapshotModified}
              onSelect={handleSelectSnapshot}
              onSave={handleSaveSnapshot}
            />
          )}

          {/* Bottom Anchored Playable Stage Deck */}
          <PerformanceKeyboard
            songKey={currentKey}
            progression={activeSong?.chordProgression}
            layers={currentPatch.layers}
            activeNotes={activeNotes}
            baseOctave={baseOctave}
            onChangeBaseOctave={setBaseOctave}
            onNoteOn={handleNoteOn}
            onNoteOff={handleNoteOff}
            modWheel={modWheel}
            onChangeModWheel={setModWheel}
          />
        </main>
      </div>

      {songEditor && (
        <SongEditorModal
          key={songEditor.song.id}
          song={songEditor.song}
          isNew={songEditor.isNew}
          onSave={(song) => handleSaveSong(song, songEditor.isNew)}
          onClose={() => setSongEditor(null)}
        />
      )}

      {setlistEditor && (
        <SetlistEditorModal
          mode={setlistEditor}
          initialName={setlistEditor === 'edit' ? activeSetlist.name : 'New Setlist'}
          initialServiceLabel={setlistEditor === 'edit' ? activeSetlist.serviceLabel : ''}
          canDelete={setlists.length > 1}
          onSave={handleSaveSetlist}
          onDelete={handleDeleteSetlist}
          onClose={() => setSetlistEditor(null)}
        />
      )}

      {showSaveModal && (
        <SavePatchModal
          initialName={currentPatch.name}
          initialDescription={currentPatch.description}
          onClose={() => setShowSaveModal(false)}
          onSaveNewPatch={handleSaveNewCustomPatch}
        />
      )}

      {soundBrowserSlot !== null && currentPatch.layers[soundBrowserSlot] && (
        <SoundBrowserModal
          targetLayer={currentPatch.layers[soundBrowserSlot]}
          customInstruments={customInstruments}
          onClose={() => setSoundBrowserSlot(null)}
          onAuditionSound={async (inst) => {
            await ensureAudioStarted();
            await audioEngine.previewInstrument(inst.id);
          }}
          onSelectSound={(slotIdx, inst) => {
            updateLayer(slotIdx, {
              instrumentId: inst.id,
              enabled: true,
              label: inst.name.split('|')[0].trim().split(' ').slice(0, 2).join(' '),
            });
          }}
          onOpenImport={() => setActiveTab('import')}
        />
      )}
    </div>
  );
}