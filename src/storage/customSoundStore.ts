import { InstrumentPreset } from '../types/worship';

export interface StoredCustomSound {
  id: string;
  preset: InstrumentPreset;
  audioData: ArrayBuffer;
  fileName: string;
  fileSizeBytes: number;
  durationSec: number;
  sampleRate: number;
  channels: number;
  createdAt: number;
}

const DB_NAME = 'sunday-keys-custom-sounds-db';
const DB_VERSION = 1;
const STORE_NAME = 'sounds';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to open IndexedDB'));
  });
}

export async function loadAllCustomSounds(): Promise<StoredCustomSound[]> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const items = (req.result as StoredCustomSound[]) || [];
        items.sort((a, b) => b.createdAt - a.createdAt);
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function saveCustomSound(record: StoredCustomSound): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteCustomSound(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

const NOTE_SEMITONES: Record<string, number> = {
  C: 0,
  'C#': 1,
  DB: 1,
  D: 2,
  'D#': 3,
  EB: 3,
  E: 4,
  F: 5,
  'F#': 6,
  GB: 6,
  G: 7,
  'G#': 8,
  AB: 8,
  A: 9,
  'A#': 10,
  BB: 10,
  B: 11,
};

/**
 * Attempts to parse a MIDI root note from a sample filename (e.g. "Felt_Piano_C4.wav" -> 60).
 * Defaults to 60 (C4) when no note pattern is found.
 */
export function detectRootMidiFromFilename(fileName: string): number {
  const stem = fileName.replace(/\.[^/.]+$/, '');
  const match = stem.match(/(?:^|[_\-\s.])([A-Ga-g][#b]?)(-?[0-8])(?:[_\-\s.]|$)/);
  if (!match) return 60;
  const noteKey = match[1].toUpperCase();
  const octave = Number(match[2]);
  const semi = NOTE_SEMITONES[noteKey];
  if (semi === undefined || Number.isNaN(octave)) return 60;
  const midi = (octave + 1) * 12 + semi;
  return midi >= 24 && midi <= 108 ? midi : 60;
}

/**
 * Scans leading frames of an AudioBuffer to suggest an onset trim time without clipping transients.
 */
export function detectLeadingSilenceSec(buffer: AudioBuffer): number {
  const data = buffer.getChannelData(0);
  const threshold = 0.004;
  for (let i = 0; i < data.length; i++) {
    if (Math.abs(data[i]) >= threshold) {
      const onsetSec = Math.max(0, i / buffer.sampleRate - 0.002);
      return Number(onsetSec.toFixed(3));
    }
  }
  return 0;
}

export function cleanSoundDisplayName(fileName: string): string {
  return fileName
    .replace(/\.[^/.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
