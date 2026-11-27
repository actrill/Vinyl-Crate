import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { clearSyncedData, db } from '../../db/db';
import type { Library } from '../../db/records';
import { clearImageCache, imageCacheSize } from '../../lib/imageCache';
import { relativeTime } from '../../lib/format';
import { syncNow } from '../../state/hooks';
import { clearCredentials, saveReminders, saveTheme, type Reminders } from '../../state/settings';
import { useApp } from '../../state/store';
import { ensureNotificationPermission } from '../anniversaries/notifications';
import './settings.css';

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="switch">
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
      <span />
    </label>
  );
}

export function SettingsScreen({ lib }: { lib: Library }) {
  const settings = useApp((s) => s.settings);
  const sync = useApp((s) => s.sync);
  const navigate = useApp((s) => s.navigate);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const meta = useLiveQuery(async () => ({
    lastSync: (await db.meta.get('lastSync'))?.value as number | undefined,
    summary: (await db.meta.get('lastSyncSummary'))?.value as string | undefined,
  }), []);
  const cache = useLiveQuery(() => imageCacheSize(), [notice]);
  const busy = ['collection', 'details', 'dates', 'prices'].includes(sync.phase);

  async function setReminders(patch: Partial<Reminders>) {
    const next = { ...settings.reminders, ...patch };
    if (patch.enabled) {
      // Ask for Android 13+ notification permission only now, when reminders are switched on.
      const p = await ensureNotificationPermission();
      if (p === 'denied') {
        setNotice('Notifications are turned off for Crate. Allow them in Android Settings → Apps → Crate → Notifications, then try again.');
        return;
      }
      if (p === 'unsupported') setNotice('Reminders are scheduled on your phone. In the browser preview they are saved but not delivered.');
    }
    useApp.getState().setReminders(next);
    await saveReminders(next);
  }

  async function disconnect() {
    await clearCredentials();
    await clearSyncedData(false);
    useApp.getState().disconnect();
  }

  const time = `${String(settings.reminders.hour).padStart(2, '0')}:${String(settings.reminders.minute).padStart(2, '0')}`;

  return (
    <div className="screen settings">
      <header className="screen-header"><h1>Settings</h1></header>

      <h2 className="section-title">Discogs</h2>
      <div className="card stack">
        <div className="row">
          <div className="grow">
            <p>{settings.username}</p>
            <p className="small muted">Connected with a personal access token stored on this phone</p>
          </div>
        </div>
        {!confirmDisconnect
          ? <button className="btn" onClick={() => setConfirmDisconnect(true)}>Disconnect</button>
          : (
            <div className="stack">
              <p className="small">This removes your token and the synced collection from this phone. Your sort names, dates and image choices are kept in case you reconnect. Nothing changes on Discogs.</p>
              <div className="row">
                <button className="btn ghost" onClick={() => setConfirmDisconnect(false)}>Cancel</button>
                <button className="btn primary" onClick={() => void disconnect()}>Disconnect</button>
              </div>
            </div>
          )}
      </div>

      <h2 className="section-title">Sync</h2>
      <div className="card stack">
        <div className="row">
          <div className="grow">
            <p>Last synced {relativeTime(meta?.lastSync)}</p>
            {meta?.summary && <p className="small muted">{meta.summary}</p>}
            <p className="small muted">{lib.records.length} records · Syncs on open when it’s been over a day</p>
          </div>
        </div>
        <button className="btn" disabled={busy} onClick={() => void syncNow()}>{busy ? 'Syncing…' : 'Sync now'}</button>
      </div>

      <h2 className="section-title">Release anniversaries</h2>
      <div className="card">
        <div className="setting-row">
          <div className="grow"><p>Anniversary reminders</p><p className="small muted">A notification on the day an album you own was released</p></div>
          <Switch label="Anniversary reminders" checked={settings.reminders.enabled} onChange={(v) => void setReminders({ enabled: v })} />
        </div>
        <div className="setting-row" aria-disabled={!settings.reminders.enabled}>
          <label htmlFor="remind-time" className="grow">Time</label>
          <input id="remind-time" className="input time-input" type="time" value={time} disabled={!settings.reminders.enabled}
            onChange={(e) => { const [h, m] = e.target.value.split(':').map(Number); if (Number.isFinite(h) && Number.isFinite(m)) void setReminders({ hour: h!, minute: m! }); }} />
        </div>
        <div className="setting-row" aria-disabled={!settings.reminders.enabled}>
          <div className="grow"><p>Milestones only</p><p className="small muted">10, 25, 50, 60, 75 and 100 years</p></div>
          <Switch label="Milestones only" checked={settings.reminders.milestonesOnly} onChange={(v) => void setReminders({ milestonesOnly: v })} />
        </div>
        <button className="list-button setting-row" onClick={() => navigate({ name: 'anniversaries' })}>
          <span className="grow">This year’s anniversaries</span><ChevronRight size={20} aria-hidden />
        </button>
      </div>
      {notice && <p className="small notice" role="status">{notice}</p>}

      <h2 className="section-title">Shelf</h2>
      <div className="card">
        <button className="list-button setting-row" onClick={() => navigate({ name: 'sortNames' })}>
          <span className="grow"><p>Sort names</p><p className="small muted">Fix how records file on the shelf</p></span><ChevronRight size={20} aria-hidden />
        </button>
      </div>

      <h2 className="section-title">Appearance</h2>
      <div className="card">
        <div className="setting-row">
          <span className="grow">Theme</span>
          <div className="segmented" role="radiogroup" aria-label="Theme">
            {(['dark', 'light'] as const).map((t) => (
              <button key={t} role="radio" aria-checked={settings.theme === t} onClick={() => { useApp.getState().setTheme(t); void saveTheme(t); }}>
                {t === 'dark' ? 'Dark' : 'Light'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <h2 className="section-title">Storage</h2>
      <div className="card stack">
        <p className="small muted">{cache ? `${cache.count} cached images, ${(cache.bytes / 1048576).toFixed(1)} MB` : '…'}</p>
        <button className="btn" onClick={() => void clearImageCache().then(() => setNotice('Image cache cleared. Covers will download again as you browse.'))}>Clear image cache</button>
      </div>

      <p className="small muted about">Crate reads your collection from Discogs and never changes it. Data provided by Discogs.</p>
    </div>
  );
}
