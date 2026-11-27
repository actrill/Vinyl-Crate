import { useEffect, useState } from 'react';
import { getMeta } from '../db/db';
import { refreshPrices, runSync, isSyncing } from '../sync/sync';
import { useApp } from './store';

// --- Android back button: the most recently registered handler wins. ---
const backHandlers: Array<() => boolean> = [];
export function handleBack(): boolean {
  for (let i = backHandlers.length - 1; i >= 0; i--) if (backHandlers[i]!()) return true;
  return useApp.getState().back();
}
export function useBackHandler(fn: () => boolean, active = true) {
  useEffect(() => {
    if (!active) return;
    backHandlers.push(fn);
    return () => { const i = backHandlers.lastIndexOf(fn); if (i >= 0) backHandlers.splice(i, 1); };
  }, [fn, active]);
}

// --- Sync ---
const syncListeners = new Set<() => void>();
export function onSyncFinished(fn: () => void) { syncListeners.add(fn); return () => { syncListeners.delete(fn); }; }

export async function syncNow(): Promise<void> {
  const { client, setSync } = useApp.getState();
  if (!client || isSyncing()) return;
  try {
    await runSync(client, setSync);
  } catch {
    /* progress already carries the user-facing error */
  } finally {
    for (const fn of syncListeners) fn();
  }
}

export async function syncIfStale(maxAgeMs: number): Promise<void> {
  const last = (await getMeta('lastSync')) ?? 0;
  if (Date.now() - last > maxAgeMs) await syncNow();
}

export async function refreshRecordPrices(releaseId: number): Promise<void> {
  const { client } = useApp.getState();
  if (!client) throw new Error('Not connected');
  const currency = (await getMeta('currency')) ?? 'USD';
  await refreshPrices(client, releaseId, currency, 'high');
}

// --- Preferences ---
export function useReducedMotion(): boolean {
  const q = '(prefers-reduced-motion: reduce)';
  const [reduced, setReduced] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(q).matches);
  useEffect(() => {
    const m = matchMedia(q);
    const on = () => setReduced(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return reduced;
}
