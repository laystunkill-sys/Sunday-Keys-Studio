import {
  FileAudio,
  Keyboard,
  Layers,
  Play,
  Scissors,
  Trash2,
  Upload,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { audioEngine } from '../audio/AudioEngine';
import { BROWSER_CATEGORIES, midiToNoteName } from '../data/instruments';
import {
  cleanSoundDisplayName,
  detectLeadingSilenceSec,
  detectRootMidiFromFilename,
  StoredCustomSound,
} from '../storage/customSoundStore';
import { InstrumentCategory, InstrumentPreset, LayerConfig } from '../types/worship';

interface ImportSoundViewProps {
  customSounds: StoredCustomSound[];
  layers: LayerConfig[];
  onAddCustomSound: (record: StoredCustomSound, decodedBuffer: AudioBuffer) => Promise<void>;
  onUpdateCustomSound: (preset: InstrumentPreset) => Promise<void>;
  onDeleteCustomSound: (id: string) => Promise<void>;
  onAssignToLayer: (slotIndex: number, preset: InstrumentPreset) => void;
  onAuditionSound: (preset: InstrumentPreset) => Promise<void>;
}

const ROOT_MIDI_OPTIONS = Array.from({ length: 61 }, (_, idx) => 24 + idx); // C1..C6

function mapBrowserCatToEngineCat(browserCategory: string): InstrumentCategory {
  switch (browserCategory) {
    case 'Pads':
    case 'Strings':
    case 'Organ':
      return 'pad';
    case 'Bass':
      return 'bass';
    case 'Arps & Sequences':
      return 'arp';
    case 'Leads':
    case 'Brass':
    case 'Woodwinds':
    case 'Guitar':
      return 'synth';
    default:
      return 'piano';
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function ImportSoundView({
  customSounds,
  layers,
  onAddCustomSound,
  onUpdateCustomSound,
  onDeleteCustomSound,
  onAssignToLayer,
  onAuditionSound,
}: ImportSoundViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [selectedId, setSelectedId] = useState<string | null>(
    () => customSounds[0]?.id || null,
  );
  const [targetSlot, setTargetSlot] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [decodedCache, setDecodedCache] = useState<Record<string, AudioBuffer>>({});

  // Keep selectedId valid when list changes
  useEffect(() => {
    if (customSounds.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !customSounds.some((s) => s.id === selectedId)) {
      setSelectedId(customSounds[0].id);
    }
  }, [customSounds, selectedId]);

  const selectedRecord = useMemo(
    () => customSounds.find((s) => s.id === selectedId) || null,
    [customSounds, selectedId],
  );

  // Decode selected sound buffer on demand for waveform preview
  useEffect(() => {
    if (!selectedRecord) return;
    if (decodedCache[selectedRecord.id]) return;

    let cancelled = false;
    void audioEngine
      .decodeAudioDataSafe(selectedRecord.audioData)
      .then((buf) => {
        if (!cancelled) {
          setDecodedCache((prev) => ({ ...prev, [selectedRecord.id]: buf }));
        }
      })
      .catch(() => {
        // ignore waveform decode error
      });

    return () => {
      cancelled = true;
    };
  }, [decodedCache, selectedRecord]);

  // Draw waveform canvas for selected sound
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedRecord) return;
    const buffer = decodedCache[selectedRecord.id];
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#0B0D12';
    ctx.fillRect(0, 0, width, height);

    // Center hairline
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    if (!buffer) {
      ctx.fillStyle = '#64748B';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Decoding waveform...', width / 2, height / 2 + 4);
      return;
    }

    const channelData = buffer.getChannelData(0);
    const step = Math.max(1, Math.floor(channelData.length / width));
    const midY = height / 2;

    const trimSec = selectedRecord.preset.sampleTrimStartSec ?? 0;
    const trimX = Math.min(width, Math.max(0, (trimSec / buffer.duration) * width));

    // Shaded trimmed region
    if (trimX > 0) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.14)';
      ctx.fillRect(0, 0, trimX, height);
    }

    for (let x = 0; x < width; x++) {
      let min = 1;
      let max = -1;
      const startIdx = x * step;
      for (let i = 0; i < step; i++) {
        const sample = channelData[startIdx + i] ?? 0;
        if (sample < min) min = sample;
        if (sample > max) max = sample;
      }
      const top = midY - max * (midY - 8);
      const bottom = midY - min * (midY - 8);
      const barH = Math.max(1, bottom - top);

      ctx.fillStyle = x < trimX ? 'rgba(148, 163, 184, 0.25)' : '#7FA4E8';
      ctx.fillRect(x, top, 1, barH);
    }

    // Trim Start marker line
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(trimX, 0);
    ctx.lineTo(trimX, height);
    ctx.stroke();
  }, [decodedCache, selectedRecord]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErrorMessage(null);
    setStatusMessage(null);
    setImporting(true);

    let lastImportedId: string | null = null;
    let importedCount = 0;

    try {
      for (const file of Array.from(files)) {
        const arrayBuffer = await file.arrayBuffer();
        let decoded: AudioBuffer;
        try {
          decoded = await audioEngine.decodeAudioDataSafe(arrayBuffer);
        } catch {
          setErrorMessage(
            `Could not decode "${file.name}". Please import a valid WAV, MP3, OGG, M4A, or FLAC audio file.`,
          );
          continue;
        }

        const id = `user-sample-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const rootMidi = detectRootMidiFromFilename(file.name);
        const trimStartSec = detectLeadingSilenceSec(decoded);
        const displayName = cleanSoundDisplayName(file.name) || 'Imported Sound';
        const isLongPad = decoded.duration >= 4.0;

        const preset: InstrumentPreset = {
          id,
          name: displayName,
          category: isLongPad ? 'pad' : 'piano',
          description: `Imported audio (${file.name}, ${decoded.duration.toFixed(1)}s, root ${midiToNoteName(rootMidi)})`,
          library: 'User Imported',
          browserCategory: isLongPad ? 'Pads' : 'Acoustic Piano & Keys',
          soundType: isLongPad ? 'Warm Pad' : 'Acoustic Piano',
          sourceModel: 'External Sample',
          timbres: ['Clean', isLongPad ? 'Ambient' : 'Warm'],
          intensity: 3,
          space: isLongPad ? 'ambient' : 'room',
          oscillators: [{ type: 'sine', detuneCents: 0, octaveOffset: 0, gain: 1 }],
          attack: isLongPad ? 0.18 : 0.008,
          decay: Math.max(0.8, Math.min(4.0, decoded.duration)),
          sustain: isLongPad ? 0.92 : 0.85,
          release: isLongPad ? 1.4 : 0.55,
          baseCutoffHz: 14000,
          resonance: 0.5,
          isCustomSample: true,
          sampleRootMidi: rootMidi,
          sampleTrimStartSec: trimStartSec,
          sampleLoop: isLongPad,
          sampleDurationSec: decoded.duration,
          fileName: file.name,
        };

        const record: StoredCustomSound = {
          id,
          preset,
          audioData: arrayBuffer,
          fileName: file.name,
          fileSizeBytes: file.size,
          durationSec: decoded.duration,
          sampleRate: decoded.sampleRate,
          channels: decoded.numberOfChannels,
          createdAt: Date.now(),
        };

        await onAddCustomSound(record, decoded);
        setDecodedCache((prev) => ({ ...prev, [id]: decoded }));
        lastImportedId = id;
        importedCount++;
      }

      if (lastImportedId) {
        setSelectedId(lastImportedId);
        setStatusMessage(
          `Imported ${importedCount} external ${importedCount === 1 ? 'sound' : 'sounds'}. Select a Layer below or open the Sound Browser to play it across the keyboard.`,
        );
      }
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const updateSelectedPreset = (patch: Partial<InstrumentPreset>) => {
    if (!selectedRecord) return;
    const nextBrowserCat = patch.browserCategory ?? selectedRecord.preset.browserCategory;
    const updated: InstrumentPreset = {
      ...selectedRecord.preset,
      ...patch,
      category: patch.browserCategory
        ? mapBrowserCatToEngineCat(nextBrowserCat)
        : selectedRecord.preset.category,
    };
    void onUpdateCustomSound(updated);
  };

  return (
    <div className="p-5 space-y-5 max-w-6xl mx-auto w-full">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-slate-100">
            Import External Sounds
          </h2>
          <p className="text-xs text-slate-400">
            Load external WAV, MP3, OGG, M4A, or FLAC audio samples and play them chromatically across any keyboard layer
          </p>
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          className="px-4 py-2 text-xs font-semibold bg-amber-500 text-slate-950 rounded-md hover:bg-amber-400 disabled:opacity-50 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>{importing ? 'Decoding...' : 'Choose Audio File'}</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.wav,.mp3,.ogg,.m4a,.flac,.aac,.webm"
          multiple
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </div>

      {errorMessage && (
        <div className="px-4 py-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
          {errorMessage}
        </div>
      )}

      {statusMessage && (
        <div className="px-4 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300">
          {statusMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Dropzone & Imported Library */}
        <div className="lg:col-span-5 space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              void handleFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            className={`p-6 rounded-lg border border-dashed transition-colors text-center cursor-pointer ${
              isDragging
                ? 'bg-amber-500/10 border-amber-400 text-amber-200'
                : 'bg-[#141822] border-white/[0.15] hover:border-[#7FA4E8]/60 hover:bg-[#171C28]'
            }`}
          >
            <Upload className="w-7 h-7 mx-auto text-[#7FA4E8] mb-2.5" />
            <p className="text-sm font-semibold text-slate-100">
              Drop audio samples here or click to browse
            </p>
            <p className="mt-1 text-xs text-slate-400">
              WAV · MP3 · OGG · M4A · FLAC · Stored locally in your browser
            </p>
          </div>

          <div className="bg-[#141822] border border-white/[0.09] rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200">
                Imported Sound Library
              </span>
              <span className="text-xs font-mono-tabular text-slate-400">
                {customSounds.length} {customSounds.length === 1 ? 'sound' : 'sounds'}
              </span>
            </div>

            {customSounds.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No external sounds imported yet. Drop a piano note, synth hit, or pad sample above to get started.
              </div>
            ) : (
              <div className="divide-y divide-white/[0.06] max-h-[380px] overflow-y-auto">
                {customSounds.map((item) => {
                  const isSelected = item.id === selectedRecord?.id;
                  return (
                    <div
                      key={item.id}
                      className={`px-3.5 py-2.5 flex items-center justify-between gap-2 transition-colors ${
                        isSelected ? 'bg-[#1D2332]' : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedId(item.id)}
                        className="flex-1 min-w-0 text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <FileAudio
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isSelected ? 'text-amber-400' : 'text-slate-400'
                            }`}
                          />
                          <span className="text-xs font-semibold text-slate-100 truncate">
                            {item.preset.name}
                          </span>
                        </div>
                        <div className="mt-0.5 pl-5.5 flex items-center gap-1.5 text-[11px] text-slate-400 font-mono-tabular">
                          <span>{item.durationSec.toFixed(2)}s</span>
                          <span>·</span>
                          <span>Root {midiToNoteName(item.preset.sampleRootMidi ?? 60)}</span>
                          <span>·</span>
                          <span>{item.preset.sampleLoop ? 'Loop Pad' : 'Keyed'}</span>
                        </div>
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => void onAuditionSound(item.preset)}
                          title="Audition Sound"
                          className="p-1.5 rounded bg-[#0D1017] border border-white/[0.08] text-slate-300 hover:text-amber-300 cursor-pointer"
                        >
                          <Play className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void onDeleteCustomSound(item.id)}
                          title="Delete Imported Sound"
                          className="p-1.5 rounded bg-[#0D1017] border border-white/[0.08] text-slate-400 hover:text-rose-400 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Sample Editor, Waveform & Layer Assignment */}
        <div className="lg:col-span-7 bg-[#141822] border border-white/[0.09] rounded-lg p-5 space-y-5">
          {!selectedRecord ? (
            <div className="py-16 text-center space-y-2">
              <FileAudio className="w-9 h-9 mx-auto text-slate-500" />
              <p className="text-sm font-medium text-slate-300">
                Select or import an audio file to inspect and map it
              </p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Imported audio files automatically pitch-shift across all 88 keys from your chosen Root Note and route through your live Mod Wheel filter, Shimmer Reverb, and Stereo Delay.
              </p>
            </div>
          ) : (
            <>
              {/* Header & File Metadata */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-slate-100 truncate">
                    {selectedRecord.preset.name}
                  </h3>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono-tabular">
                    <span>{selectedRecord.fileName}</span>
                    <span>·</span>
                    <span>{(selectedRecord.sampleRate / 1000).toFixed(1)} kHz</span>
                    <span>·</span>
                    <span>{selectedRecord.channels}ch</span>
                    <span>·</span>
                    <span>{formatBytes(selectedRecord.fileSizeBytes)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void onAuditionSound(selectedRecord.preset)}
                  className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-[#232836] border border-white/[0.12] text-slate-100 hover:border-[#7FA4E8] flex items-center gap-1.5 cursor-pointer"
                >
                  <Keyboard className="w-3.5 h-3.5 text-[#7FA4E8]" />
                  <span>Preview Chord</span>
                </button>
              </div>

              {/* Waveform Display */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">
                    Sample Waveform & Onset Trim
                  </span>
                  <span className="font-mono-tabular text-amber-400">
                    Start: {Math.round((selectedRecord.preset.sampleTrimStartSec ?? 0) * 1000)} ms /{' '}
                    {selectedRecord.durationSec.toFixed(2)} s
                  </span>
                </div>
                <canvas
                  ref={canvasRef}
                  width={680}
                  height={96}
                  className="w-full h-24 rounded-md border border-white/[0.08] bg-[#0B0D12]"
                />
              </div>

              {/* Metadata & Classification */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs text-slate-400">Sound Name</label>
                  <input
                    type="text"
                    value={selectedRecord.preset.name}
                    maxLength={40}
                    onChange={(e) => updateSelectedPreset({ name: e.target.value })}
                    className="w-full bg-[#0D1017] border border-white/[0.1] rounded-md px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400/60"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs text-slate-400">Browser Category</label>
                  <select
                    value={selectedRecord.preset.browserCategory}
                    onChange={(e) =>
                      updateSelectedPreset({ browserCategory: e.target.value })
                    }
                    className="w-full bg-[#0D1017] border border-white/[0.1] rounded-md px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400/60 cursor-pointer"
                  >
                    {BROWSER_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs text-slate-400">Root Note Pitch</label>
                  <select
                    value={selectedRecord.preset.sampleRootMidi ?? 60}
                    onChange={(e) =>
                      updateSelectedPreset({ sampleRootMidi: Number(e.target.value) })
                    }
                    className="w-full bg-[#0D1017] border border-white/[0.1] rounded-md px-2.5 py-1.5 text-xs font-mono-tabular text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400/60 cursor-pointer"
                  >
                    {ROOT_MIDI_OPTIONS.map((midi) => (
                      <option key={midi} value={midi}>
                        {midiToNoteName(midi)} (MIDI {midi})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Playback Mode & Trim */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/[0.07]">
                <div className="space-y-2">
                  <span className="block text-xs text-slate-300">Playback Mode</span>
                  <div className="grid grid-cols-2 gap-1.5 bg-[#0D1017] p-1 rounded-md border border-white/[0.08]">
                    <button
                      type="button"
                      onClick={() => updateSelectedPreset({ sampleLoop: false })}
                      className={`py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                        !selectedRecord.preset.sampleLoop
                          ? 'bg-[#7FA4E8] text-[#0E1117] font-semibold'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Keyed / One-Shot
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSelectedPreset({ sampleLoop: true })}
                      className={`py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                        selectedRecord.preset.sampleLoop
                          ? 'bg-[#7FA4E8] text-[#0E1117] font-semibold'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Looping Pad
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">Start Trim Offset</span>
                    <button
                      type="button"
                      onClick={() => {
                        const buf = decodedCache[selectedRecord.id];
                        if (!buf) return;
                        updateSelectedPreset({
                          sampleTrimStartSec: detectLeadingSilenceSec(buf),
                        });
                      }}
                      className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Scissors className="w-3 h-3" />
                      <span>Auto-Trim Silence</span>
                    </button>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(
                      100,
                      Math.round((selectedRecord.durationSec * 0.6) * 1000),
                    )}
                    value={Math.round((selectedRecord.preset.sampleTrimStartSec ?? 0) * 1000)}
                    onChange={(e) =>
                      updateSelectedPreset({
                        sampleTrimStartSec: Number(e.target.value) / 1000,
                      })
                    }
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>
              </div>

              {/* Envelope & Filter Shaping */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-white/[0.07]">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">Attack</span>
                    <span className="font-mono-tabular text-slate-200">
                      {Math.round(selectedRecord.preset.attack * 1000)} ms
                    </span>
                  </div>
                  <input
                    type="range"
                    min={4}
                    max={1500}
                    value={Math.round(selectedRecord.preset.attack * 1000)}
                    onChange={(e) =>
                      updateSelectedPreset({ attack: Number(e.target.value) / 1000 })
                    }
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">Release</span>
                    <span className="font-mono-tabular text-slate-200">
                      {selectedRecord.preset.release.toFixed(2)} s
                    </span>
                  </div>
                  <input
                    type="range"
                    min={8}
                    max={400}
                    value={Math.round(selectedRecord.preset.release * 100)}
                    onChange={(e) =>
                      updateSelectedPreset({ release: Number(e.target.value) / 100 })
                    }
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">Tone Cutoff</span>
                    <span className="font-mono-tabular text-slate-200">
                      {selectedRecord.preset.baseCutoffHz >= 1000
                        ? `${(selectedRecord.preset.baseCutoffHz / 1000).toFixed(1)} kHz`
                        : `${selectedRecord.preset.baseCutoffHz} Hz`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={400}
                    max={16000}
                    step={100}
                    value={selectedRecord.preset.baseCutoffHz}
                    onChange={(e) =>
                      updateSelectedPreset({ baseCutoffHz: Number(e.target.value) })
                    }
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>
              </div>

              {/* Direct Layer Assignment Bar */}
              <div className="pt-3 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-slate-400" />
                  <span className="text-xs text-slate-300">Assign to Module:</span>
                  <select
                    value={targetSlot}
                    onChange={(e) => setTargetSlot(Number(e.target.value))}
                    aria-label="Target Layer Module"
                    className="bg-[#0D1017] border border-white/[0.1] rounded-md px-2.5 py-1.5 text-xs text-slate-100 cursor-pointer"
                  >
                    {layers.map((l) => (
                      <option key={l.slotIndex} value={l.slotIndex}>
                        Module {l.slotIndex + 1}: {l.label}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => onAssignToLayer(targetSlot, selectedRecord.preset)}
                  className="px-4 py-2 rounded-md text-xs font-semibold bg-[#7FA4E8] text-[#0E1117] hover:bg-[#95B6F0] transition-colors cursor-pointer"
                >
                  Load into Module {targetSlot + 1}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
