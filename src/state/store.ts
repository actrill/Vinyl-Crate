import { create } from 'zustand';
import { DiscogsClient } from '../api/client';
import { defaultTransport } from '../api/transport';
import { isMockUser, mockTransport } from '../api/mock/transport';
import { setImageFetcher } from '../lib/imageCache';
import type { SyncProgress } from '../sync/sync';
import { DEFAULT_REMINDERS, type Reminders, type Settings, type Theme } from './settings';

export type Route =
  | { name: 'library' }
  | { name: 'search'; query?: string }
  | { name: 'settings' }
  | { name: 'record'; instanceId: number; from?: 'grid' | 'shelf' | 'search' | 'other' }
  | { name: 'anniversaries' }
  | { name: 'sortNames' };

export type Tab = 'library' | 'search' | 'settings';

interface AppState {
  ready: boolean;
  settings: Settings;
  client: DiscogsClient | null;
  sync: SyncProgress;
  stack: Route[];
  selectedFolder: number;
  accent: string | null;
  setReady(s: Settings): void;
  connect(username: string, token: string): DiscogsClient;
  disconnect(): void;
  setSync(p: SyncProgress): void;
  navigate(r: Route): void;
  replace(r: Route): void;
  back(): boolean;
  setTab(t: Tab): void;
  setFolder(id: number): void;
  setTheme(t: Theme): void;
  setReminders(r: Reminders): void;
  setView(v: 'grid' | 'shelf'): void;
  setAccent(a: string | null): void;
}

export function makeClient(username: string, token: string): DiscogsClient {
  const transport = isMockUser(username) ? mockTransport : defaultTransport();
  const client = new DiscogsClient({ username, token }, transport);
  setImageFetcher((url) => transport.getBinary(url, {}));
  return client;
}

export const useApp = create<AppState>((set, get) => ({
  ready: false,
  settings: { username: null, token: null, theme: 'dark', reminders: DEFAULT_REMINDERS, view: 'grid' },
  client: null,
  sync: { phase: 'idle', done: 0, total: 0 },
  stack: [{ name: 'library' }],
  selectedFolder: 0,
  accent: null,
  setReady(settings) {
    const client = settings.username && settings.token ? makeClient(settings.username, settings.token) : null;
    set({ ready: true, settings, client });
  },
  connect(username, token) {
    const client = makeClient(username, token);
    set((s) => ({ client, settings: { ...s.settings, username, token }, stack: [{ name: 'library' }] }));
    return client;
  },
  disconnect() {
    get().client?.queue.clear('disconnected');
    setImageFetcher(null);
    set((s) => ({ client: null, settings: { ...s.settings, username: null, token: null }, stack: [{ name: 'library' }], sync: { phase: 'idle', done: 0, total: 0 } }));
  },
  setSync(sync) { set({ sync }); },
  navigate(r) { set((s) => ({ stack: [...s.stack, r] })); },
  replace(r) { set((s) => ({ stack: [...s.stack.slice(0, -1), r] })); },
  back() {
    const { stack } = get();
    if (stack.length <= 1) return false;
    set({ stack: stack.slice(0, -1) });
    return true;
  },
  setTab(t) {
    const route: Route = t === 'library' ? { name: 'library' } : t === 'search' ? { name: 'search' } : { name: 'settings' };
    set({ stack: [route] });
  },
  setFolder(id) { set({ selectedFolder: id }); },
  setTheme(theme) { set((s) => ({ settings: { ...s.settings, theme } })); },
  setReminders(reminders) { set((s) => ({ settings: { ...s.settings, reminders } })); },
  setView(view) { set((s) => ({ settings: { ...s.settings, view } })); },
  setAccent(accent) { set({ accent }); },
}));

export const currentRoute = (s: { stack: Route[] }) => s.stack[s.stack.length - 1]!;
