import { Preferences } from '@capacitor/preferences';

// Settings live in Capacitor Preferences (Android SharedPreferences, private to
// the app). The Discogs token is stored here, on the device only. It is never
// logged and never leaves the phone except in the Authorization header to Discogs.

export interface Reminders { enabled: boolean; hour: number; minute: number; milestonesOnly: boolean }
export type Theme = 'dark' | 'light';

export interface Settings {
  username: string | null;
  token: string | null;
  theme: Theme;
  reminders: Reminders;
  view: 'grid' | 'shelf';
}

export const DEFAULT_REMINDERS: Reminders = { enabled: false, hour: 9, minute: 0, milestonesOnly: false };

const K = { username: 'crate.username', token: 'crate.token', theme: 'crate.theme', reminders: 'crate.reminders', view: 'crate.view' };

export async function loadSettings(): Promise<Settings> {
  const [u, t, th, r, v] = await Promise.all(Object.values(K).map((key) => Preferences.get({ key })));
  let reminders = DEFAULT_REMINDERS;
  try { if (r?.value) reminders = { ...DEFAULT_REMINDERS, ...JSON.parse(r.value) }; } catch { /* default */ }
  return {
    username: u?.value ?? null,
    token: t?.value ?? null,
    theme: th?.value === 'light' ? 'light' : 'dark',
    reminders,
    view: v?.value === 'shelf' ? 'shelf' : 'grid',
  };
}

export async function saveCredentials(username: string, token: string): Promise<void> {
  await Preferences.set({ key: K.username, value: username });
  await Preferences.set({ key: K.token, value: token });
}

export async function clearCredentials(): Promise<void> {
  await Preferences.remove({ key: K.username });
  await Preferences.remove({ key: K.token });
}

export async function saveTheme(theme: Theme) { await Preferences.set({ key: K.theme, value: theme }); }
export async function saveReminders(r: Reminders) { await Preferences.set({ key: K.reminders, value: JSON.stringify(r) }); }
export async function saveView(v: 'grid' | 'shelf') { await Preferences.set({ key: K.view, value: v }); }
