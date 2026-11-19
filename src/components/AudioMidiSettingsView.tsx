import { RefreshCw, RotateCcw, Volume2 } from 'lucide-react';
import { MidiDeviceInfo } from '../hooks/useMidi';
import { MidiEventLogItem } from '../types/worship';

interface AudioMidiSettingsViewProps {
  audioRunning: boolean;
  sampleRate: number;
  activeVoices: number;
  midiSupported: boolean;
  midiAccessState: 'idle' | 'granted' | 'denied' | 'unsupported';
  devices: MidiDeviceInfo[];
  selectedDeviceId: string;
  channelFilter: number;
  eventLog: MidiEventLogItem[];
  onStartAudio: () => void;
  onTestChord: () => void;
  onRefreshMidi: () => void;
  onSelectDevice: (id: string) => void;
  onChangeChannelFilter: (ch: number) => void;
  onClearLog: () => void;
  onResetWorkspace: () => void;
}

export function AudioMidiSettingsView({
  audioRunning,
  sampleRate,
  activeVoices,
  midiSupported,
  midiAccessState,
  devices,
  selectedDeviceId,
  channelFilter,
  eventLog,
  onStartAudio,
  onTestChord,
  onRefreshMidi,
  onSelectDevice,
  onChangeChannelFilter,
  onClearLog,
  onResetWorkspace,
}: AudioMidiSettingsViewProps) {
  return (
    <div className="p-5 space-y-5 max-w-6xl mx-auto w-full">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-slate-100">
            Audio Engine & MIDI Routing
          </h2>
          <p className="text-xs text-slate-400">
            Configure USB MIDI keyboards, sustain pedals, expression CCs, and Web Audio output
          </p>
        </div>

        <button
          type="button"
          onClick={onResetWorkspace}
          className="px-3 py-1.5 rounded-md text-xs font-medium bg-[#141822] border border-white/[0.08] text-slate-300 hover:text-rose-300 hover:border-rose-500/40 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Setlists & Custom Patches</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Web Audio Diagnostics */}
        <div className="bg-[#141822] border border-white/[0.09] rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-slate-100">
              Web Audio Synthesis Engine
            </h3>
            <span
              className={`text-xs font-medium ${
                audioRunning ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {audioRunning ? 'Running' : 'Standby'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 py-3 border-y border-white/[0.07] text-xs">
            <div>
              <span className="text-slate-400 block">Sample Rate</span>
              <span className="font-mono-tabular text-sm font-semibold text-slate-100">
                {(sampleRate / 1000).toFixed(1)} kHz
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Active Voices</span>
              <span className="font-mono-tabular text-sm font-semibold text-slate-100">
                {activeVoices}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Output Bus</span>
              <span className="font-mono-tabular text-sm font-semibold text-slate-100">
                Stereo 32-bit
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!audioRunning && (
              <button
                type="button"
                onClick={onStartAudio}
                className="px-4 py-2 rounded-md text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer"
              >
                Initialize Audio Engine
              </button>
            )}
            <button
              type="button"
              onClick={onTestChord}
              className="px-4 py-2 rounded-md text-xs font-medium bg-[#0D1017] border border-white/[0.1] text-slate-200 hover:text-white flex items-center gap-1.5 cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Audition Test Chord</span>
            </button>
          </div>
        </div>

        {/* Web MIDI Input */}
        <div className="bg-[#141822] border border-white/[0.09] rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-sm font-semibold text-slate-100">
              Hardware MIDI Input
            </h3>
            <button
              type="button"
              onClick={onRefreshMidi}
              className="px-2.5 py-1 rounded text-xs font-medium bg-[#0D1017] border border-white/[0.08] text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Scan Devices</span>
            </button>
          </div>

          {!midiSupported ? (
            <p className="text-xs text-slate-400">
              Web MIDI is unavailable in this browser. Use Chromium-based browsers over HTTPS for USB MIDI controllers, or play using QWERTY keys and on-screen chord pads.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 block">MIDI Input Device</label>
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => onSelectDevice(e.target.value)}
                    className="w-full bg-[#0D1017] border border-white/[0.1] rounded px-2.5 py-1.5 text-xs text-slate-100 cursor-pointer"
                  >
                    <option value="all">All Connected Devices ({devices.length})</option>
                    {devices.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400 block">MIDI Channel Filter</label>
                  <select
                    value={channelFilter}
                    onChange={(e) => onChangeChannelFilter(Number(e.target.value))}
                    className="w-full bg-[#0D1017] border border-white/[0.1] rounded px-2.5 py-1.5 text-xs text-slate-100 cursor-pointer"
                  >
                    <option value={0}>Omni (All Channels)</option>
                    {Array.from({ length: 16 }, (_, i) => i + 1).map((ch) => (
                      <option key={ch} value={ch}>
                        Channel {ch}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <p className="text-xs text-slate-400">
                Access: <span className="text-slate-200">{midiAccessState}</span> · Standard CCs mapped: CC1 (Mod Wheel), CC64 (Sustain Pedal), CC7 (Master Volume).
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Live Incoming MIDI Monitor */}
      <div className="bg-[#141822] border border-white/[0.09] rounded-lg p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold text-slate-100">
            Incoming MIDI Event Monitor
          </h3>
          {eventLog.length > 0 && (
            <button
              type="button"
              onClick={onClearLog}
              className="text-xs text-slate-400 hover:text-slate-100 cursor-pointer"
            >
              Clear Log
            </button>
          )}
        </div>

        {eventLog.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">
            No MIDI hardware messages received yet. Connect a USB MIDI controller and press a key or move your mod wheel.
          </p>
        ) : (
          <div className="overflow-x-auto max-h-56 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 border-b border-white/[0.07]">
                <tr>
                  <th className="py-2 pr-4 font-medium">Time</th>
                  <th className="py-2 pr-4 font-medium">Device</th>
                  <th className="py-2 pr-4 font-medium">Channel</th>
                  <th className="py-2 pr-4 font-medium">Message</th>
                  <th className="py-2 font-medium">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05] font-mono-tabular">
                {eventLog.map((ev) => (
                  <tr key={ev.id} className="text-slate-200">
                    <td className="py-1.5 pr-4 text-slate-400">{ev.timestamp}</td>
                    <td className="py-1.5 pr-4 font-sans truncate max-w-[180px]">
                      {ev.deviceName}
                    </td>
                    <td className="py-1.5 pr-4">Ch {ev.channel}</td>
                    <td className="py-1.5 pr-4">{ev.type}</td>
                    <td className="py-1.5 text-amber-300">{ev.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
