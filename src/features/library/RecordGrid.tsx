import type { Library, RecordView } from '../../db/records';
import { useApp } from '../../state/store';
import { Cover } from '../../ui/Cover';

export function RecordGrid({ records, showFolderHeaders, lib, hidden }: { records: RecordView[]; showFolderHeaders: boolean; lib: Library; hidden: boolean }) {
  const navigate = useApp((s) => s.navigate);
  const groups = showFolderHeaders
    ? lib.folders.filter((f) => f.id !== 0).map((f) => ({ f, list: records.filter((r) => r.folderId === f.id) })).filter((g) => g.list.length)
    : [{ f: null, list: records }];
  return (
    <>
      {groups.map(({ f, list }) => (
        <section key={f?.id ?? 'all'}>
          {f && <h2 className="folder-heading">{f.name}</h2>}
          <ul className="grid" aria-label={f ? f.name : 'Records'}>
            {list.map((r) => (
              <li key={r.instanceId}>
                <button className="grid-cell" onClick={() => navigate({ name: 'record', instanceId: r.instanceId, from: 'grid' })}
                  aria-label={`${r.title} by ${r.artist}. Slot ${r.shelf.slot} of ${r.shelf.of}.`}>
                  <Cover url={r.coverUrl} alt="" fallback={r.title} layoutId={hidden ? undefined : `cover-${r.instanceId}`} />
                  <span className="grid-title ellipsis">{r.title}</span>
                  <span className="grid-artist ellipsis">{r.artist}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
