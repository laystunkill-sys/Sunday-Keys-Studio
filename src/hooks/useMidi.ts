import { useCallback, useEffect, useRef, useState } from 'react';
import { midiToNoteName } from '../data/instruments';
import { MidiEventLogItem } from '../types/worship';

export interface MidiDeviceInfo {
  id: string;
  name: string;
  manufacturer: string;
  state: string;
}

interface UseMidiHandlers {
  onNoteOn: (note: number, velocity: number) => void;
  onNoteOff: (note: number) => void;
  onModWheel: (value: number) => void;
  onSustain: (down: boolean) => void;
  onMasterVolume?: (value: number) => void;
}

export function useMidi(handlers: UseMidiHandlers) {
  const [supported] = useState<boolean>(() => typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator);
  const [accessState, setAccessState] = useState<'idle' | 'granted' | 'denied' | 'unsupported'>(
    supported ? 'idle' : 'unsupported',
  );
  const [devices, setDevices] = useState<MidiDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<number>(0); // 0 = All channels
  const [eventLog, setEventLog] = useState<MidiEventLogItem[]>([]);

  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const selectedDeviceRef = useRef(selectedDeviceId);
  selectedDeviceRef.current = selectedDeviceId;
  const channelFilterRef = useRef(channelFilter);
  channelFilterRef.current = channelFilter;

  const pushLog = useCallback((item: Omit<MidiEventLogItem, 'id' | 'timestamp'>) => {
    const now = new Date();
    const ts = now.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setEventLog((prev) => [
      { ...item, id: `${Date.now()}-${Math.random()}`, timestamp: ts },
      ...prev.slice(0, 24),
    ]);
  }, []);

  const connectMidi = useCallback(async () => {
    if (!supported) {
      setAccessState('unsupported');
      return;
    }
    try {
      const access = await navigator.requestMIDIAccess({ sysex: false });
      setAccessState('granted');

      const refreshDevices = () => {
        const list: MidiDeviceInfo[] = [];
        access.inputs.forEach((input) => {
          list.push({
            id: input.id,
            name: input.name || 'USB MIDI Keyboard',
            manufacturer: input.manufacturer || 'Generic',
            state: input.state,
          });
          input.onmidimessage = (ev: MIDIMessageEvent) => {
            if (selectedDeviceRef.current !== 'all' && input.id !== selectedDeviceRef.current) return;
            const data = ev.data;
            if (!data || data.length < 2) return;
            const status = data[0];
            const command = status & 0xf0;
            const channel = (status & 0x0f) + 1;
            if (channelFilterRef.current !== 0 && channel !== channelFilterRef.current) return;

            const d1 = data[1];
            const d2 = data.length > 2 ? data[2] : 0;
            const devName = input.name || 'MIDI Input';

            if (command === 0x90 && d2 > 0) {
              handlersRef.current.onNoteOn(d1, d2 / 127);
              pushLog({
                deviceName: devName,
                type: 'Note On',
                detail: `${midiToNoteName(d1)} (vel ${d2})`,
                channel,
              });
            } else if (command === 0x80 || (command === 0x90 && d2 === 0)) {
              handlersRef.current.onNoteOff(d1);
              pushLog({
                deviceName: devName,
                type: 'Note Off',
                detail: midiToNoteName(d1),
                channel,
              });
            } else if (command === 0xb0) {
              if (d1 === 1) {
                handlersRef.current.onModWheel(d2 / 127);
                pushLog({
                  deviceName: devName,
                  type: 'Mod Wheel',
                  detail: `CC1 = ${Math.round((d2 / 127) * 100)}%`,
                  channel,
                });
              } else if (d1 === 64) {
                const down = d2 >= 64;
                handlersRef.current.onSustain(down);
                pushLog({
                  deviceName: devName,
                  type: 'Sustain',
                  detail: down ? 'Pedal Down' : 'Pedal Up',
                  channel,
                });
              } else if (d1 === 7 && handlersRef.current.onMasterVolume) {
                handlersRef.current.onMasterVolume(d2 / 127);
                pushLog({
                  deviceName: devName,
                  type: 'CC',
                  detail: `CC7 Master = ${Math.round((d2 / 127) * 100)}%`,
                  channel,
                });
              } else {
                pushLog({
                  deviceName: devName,
                  type: 'CC',
                  detail: `CC${d1} = ${d2}`,
                  channel,
                });
              }
            }
          };
        });
        setDevices(list);
      };

      refreshDevices();
      access.onstatechange = refreshDevices;
    } catch {
      setAccessState('denied');
    }
  }, [pushLog, supported]);

  // Attempt passive auto-connect on mount if browser allows without prompt
  useEffect(() => {
    if (supported) {
      connectMidi();
    }
  }, [connectMidi, supported]);

  return {
    supported,
    accessState,
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    channelFilter,
    setChannelFilter,
    eventLog,
    connectMidi,
    clearLog: () => setEventLog([]),
  };
}
