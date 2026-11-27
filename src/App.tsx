import { App as CapApp } from '@capacitor/app';
import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core';
import { AnimatePresence, LayoutGroup, MotionConfig } from 'framer-motion';
import { lazy, Suspense, useEffect, useMemo, useRef } from 'react';
import { useLibrary } from './db/records';
import { AnniversariesScreen } from './features/anniversaries/AnniversariesScreen';
import { onNotificationTap, rescheduleAnniversaries } from './features/anniversaries/notifications';
import { LibraryScreen } from './features/library/LibraryScreen';
import { SearchScreen } from './features/search/SearchScreen';
import { SettingsScreen } from './features/settings/SettingsScreen';
import { SortNameEditor } from './features/settings/SortNameEditor';
import { SetupScreen } from './features/setup/SetupScreen';
import { handleBack, onSyncFinished, syncIfStale, useReducedMotion } from './state/hooks';
import { loadSettings } from './state/settings';
import { currentRoute, useApp, type Tab } from './state/store';
import { AUTO_SYNC_AFTER_MS } from './sync/sync';
import { BottomNav } from './ui/BottomNav';

// The record screen pulls in three.js; load it on first use.
const RecordScreen = lazy(() => import('./features/record/RecordScreen'));

export function App() {
  const ready = useApp((s) => s.ready);
  const client = useApp((s) => s.client);
  const theme = useApp((s) => s.settings.theme);
  const reduced = useReducedMotion();

  useEffect(() => { void loadSettings().then((s) => useApp.getState().setReady(s)); }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const bg = theme === 'light' ? '#E9E2D2' : '#2A2D31';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg);
    if (Capacitor.isNativePlatform()) {
      void SystemBars.setStyle({ style: theme === 'light' ? SystemBarsStyle.Light : SystemBarsStyle.Dark }).catch(() => undefined);
    }
  }, [theme]);

  // Android back button and resume-time sync.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const subs = [
      CapApp.addListener('backButton', () => { if (!handleBack()) void CapApp.minimizeApp(); }),
      CapApp.addListener('resume', () => { if (useApp.getState().client) void syncIfStale(AUTO_SYNC_AFTER_MS); }),
    ];
    return () => { for (const s of subs) void s.then((h) => h.remove()); };
  }, []);

  // Open a record when its anniversary notification is tapped.
  useEffect(() => onNotificationTap((instanceId) => {
    useApp.getState().setTab('library');
    useApp.getState().navigate({ name: 'record', instanceId, from: 'other' });
  }), []);

  // Sync on open if the last sync was more than 24 hours ago.
  useEffect(() => { if (client) void syncIfStale(AUTO_SYNC_AFTER_MS); }, [client]);

  if (!ready) return <div className="app" aria-busy="true" />;

  return (
    <MotionConfig reducedMotion={reduced ? 'always' : 'never'}>
      {client ? <Shell /> : <SetupScreen />}
    </MotionConfig>
  );
}

function Shell() {
  const route = useApp(currentRoute);
  const stack = useApp((s) => s.stack);
  const reminders = useApp((s) => s.settings.reminders);
  const lib = useLibrary();
  const tab: Tab = stack[0]!.name === 'search' ? 'search' : stack[0]!.name === 'settings' ? 'settings' : 'library';

  // Keep scheduled anniversary notifications in step with dates, shelf slots and settings.
  const signature = useMemo(() => lib.records
    .filter((r) => r.original?.date.month)
    .map((r) => `${r.releaseId}:${r.original!.date.year}-${r.original!.date.month}-${r.original!.date.day}:${r.folderId}:${r.shelf.slot}:${r.title}`)
    .join('|'), [lib.records]);
  const latest = useRef(lib.records);
  latest.current = lib.records;
  useEffect(() => {
    if (!lib.loaded) return;
    const t = setTimeout(() => { void rescheduleAnniversaries(latest.current, reminders).catch(() => undefined); }, 1500);
    return () => clearTimeout(t);
  }, [signature, reminders, lib.loaded]);
  useEffect(() => onSyncFinished(() => { void rescheduleAnniversaries(latest.current, useApp.getState().settings.reminders).catch(() => undefined); }), []);

  const isRecord = route.name === 'record';
  const base = stack.filter((r) => r.name !== 'record').at(-1) ?? stack[0]!;

  return (
    <LayoutGroup>
      <div className="app">
        {/* The screen under a record stays mounted so its scroll position survives. */}
        <div style={{ display: isRecord ? 'none' : 'contents' }} aria-hidden={isRecord}>
          {renderBase(base, lib, isRecord)}
        </div>
        {!isRecord && <BottomNav active={tab} />}
        <AnimatePresence>
          {isRecord && (
            <Suspense fallback={null}>
              <RecordScreen key={route.instanceId} instanceId={route.instanceId} lib={lib} />
            </Suspense>
          )}
        </AnimatePresence>
      </div>
    </LayoutGroup>
  );
}

function renderBase(route: ReturnType<typeof currentRoute>, lib: ReturnType<typeof useLibrary>, covered: boolean) {
  switch (route.name) {
    case 'search': return <SearchScreen lib={lib} initialQuery={route.query} covered={covered} />;
    case 'settings': return <SettingsScreen lib={lib} />;
    case 'anniversaries': return <AnniversariesScreen lib={lib} />;
    case 'sortNames': return <SortNameEditor lib={lib} />;
    default: return <LibraryScreen lib={lib} covered={covered} />;
  }
}
