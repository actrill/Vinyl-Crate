import { AnimatePresence, motion } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { LayoutGrid, Library as ShelfIcon, RefreshCw } from 'lucide-react';
import { useRef } from 'react';
import { db } from '../../db/db';
import type { Library } from '../../db/records';
import { relativeTime } from '../../lib/format';
import { syncNow } from '../../state/hooks';
import { saveView } from '../../state/settings';
import { useApp } from '../../state/store';
import { PullToRefresh } from '../../ui/PullToRefresh';
import { FolderTabs } from './FolderTabs';
import { OnThisDay } from './OnThisDay';
import { RecordGrid } from './RecordGrid';
import { ShelfView } from './ShelfView';
import { SyncStatus } from './SyncStatus';
import './library.css';

export function LibraryScreen({ lib, covered }: { lib: Library; covered: boolean }) {
  const folder = useApp((s) => s.selectedFolder);
  const setFolder = useApp((s) => s.setFolder);
  const view = useApp((s) => s.settings.view);
  const sync = useApp((s) => s.sync);
  const busy = ['collection', 'details', 'dates', 'prices'].includes(sync.phase);
  const meta = useLiveQuery(async () => ({
    lastSync: (await db.meta.get('lastSync'))?.value as number | undefined,
    value: (await db.meta.get('collectionValue'))?.value as { minimum: string; median: string; maximum: string } | undefined,
  }), []);

  const folderIds = [0, ...lib.folders.filter((f) => f.id !== 0).map((f) => f.id)];
  const prevIndex = useRef(folderIds.indexOf(folder));
  const index = folderIds.indexOf(folder);
  const direction = index >= prevIndex.current ? 1 : -1;
  prevIndex.current = index;

  const records = lib.byFolder.get(folder) ?? [];
  const toggleView = () => {
    const next = view === 'grid' ? 'shelf' : 'grid';
    useApp.getState().setView(next);
    void saveView(next);
  };

  return (
    <PullToRefresh className="screen" onRefresh={() => void syncNow()} busy={busy}>
      <header className="screen-header">
        <h1>Library</h1>
        {busy ? null : (
          <button className="icon-btn" onClick={() => void syncNow()} aria-label="Sync with Discogs now">
            <RefreshCw size={20} aria-hidden />
          </button>
        )}
        <button className="icon-btn" onClick={toggleView} aria-label={view === 'grid' ? 'Show shelf view' : 'Show grid view'}>
          {view === 'grid' ? <ShelfIcon size={22} aria-hidden /> : <LayoutGrid size={22} aria-hidden />}
        </button>
      </header>

      <SyncStatus sync={sync} lastSync={meta?.lastSync} value={meta?.value} currencyHint={lib.currency} hasRecords={lib.records.length > 0} />
      <OnThisDay lib={lib} />

      {lib.folders.length > 0 && <FolderTabs folders={lib.folders} selected={folder} onSelect={setFolder} total={lib.records.length} lib={lib} />}

      <AnimatePresence mode="popLayout" initial={false} custom={direction}>
        <motion.div
          key={`${folder}-${view}`}
          custom={direction}
          initial={{ opacity: 0, x: direction * 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction * -24 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          {lib.loaded && records.length === 0 && !busy && (
            <p className="empty">
              {lib.records.length === 0
                ? meta?.lastSync
                  ? 'Your Discogs collection is empty. Add records on discogs.com, then pull down to sync.'
                  : 'Nothing here yet. Pull down to sync your collection from Discogs.'
                : 'No records in this folder.'}
            </p>
          )}
          {records.length > 0 && (view === 'grid'
            ? <RecordGrid records={records} showFolderHeaders={folder === 0} lib={lib} hidden={covered} />
            : <ShelfView records={records} showFolderHeaders={folder === 0} lib={lib} />)}
        </motion.div>
      </AnimatePresence>
      <p className="small muted last-sync">Last synced {relativeTime(meta?.lastSync)}</p>
    </PullToRefresh>
  );
}
