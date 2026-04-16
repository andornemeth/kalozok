import { get, set, del, keys } from 'idb-keyval';
import type { GameState } from '@/state/gameStore';

export const SAVE_SLOTS = [1, 2, 3] as const;
export type SaveSlot = (typeof SAVE_SLOTS)[number];
const AUTO_SLOT_KEY = 'kalozok:auto';

function slotKey(slot: SaveSlot): string {
  return `kalozok:slot:${slot}`;
}

export interface SaveEnvelope {
  version: 1;
  savedAt: number;
  state: GameState;
}

export async function writeSlot(slot: SaveSlot, state: GameState): Promise<void> {
  const env: SaveEnvelope = { version: 1, savedAt: Date.now(), state };
  await set(slotKey(slot), env);
}

export async function readSlot(slot: SaveSlot): Promise<SaveEnvelope | undefined> {
  return (await get<SaveEnvelope>(slotKey(slot))) ?? undefined;
}

export async function deleteSlot(slot: SaveSlot): Promise<void> {
  await del(slotKey(slot));
}

export async function writeAutosave(state: GameState): Promise<void> {
  const env: SaveEnvelope = { version: 1, savedAt: Date.now(), state };
  await set(AUTO_SLOT_KEY, env);
}

export async function readAutosave(): Promise<SaveEnvelope | undefined> {
  return (await get<SaveEnvelope>(AUTO_SLOT_KEY)) ?? undefined;
}

export async function hasAnySave(): Promise<boolean> {
  const k = await keys();
  return k.some((key) => typeof key === 'string' && key.startsWith('kalozok:'));
}

export function exportJSON(env: SaveEnvelope): string {
  return JSON.stringify(env, null, 2);
}

export function importJSON(raw: string): SaveEnvelope {
  const parsed = JSON.parse(raw) as SaveEnvelope;
  if (parsed.version !== 1 || !parsed.state) {
    throw new Error('Invalid save file');
  }
  return parsed;
}
