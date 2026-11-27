import { useEffect, useRef } from 'react';
import type { FolderRow } from '../../db/db';
import type { Library } from '../../db/records';

/** Discogs folders in Discogs order, with counts. Names are shown exactly as on Discogs. */
export function FolderTabs({ folders, selected, onSelect, lib }: {
  folders: FolderRow[]; selected: number; onSelect: (id: number) => void; total: number; lib: Library;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [selected]);
  // "Uncategorized" (id 1) is hidden when empty, as Discogs's own folder picker does.
  const shown = folders.filter((f) => f.id === 0 || f.id !== 1 || (lib.byFolder.get(1)?.length ?? 0) > 0);
  return (
    <div className="folder-tabs" role="tablist" aria-label="Folders" ref={ref}>
      {shown.map((f) => {
        const count = lib.byFolder.get(f.id)?.length ?? f.count;
        return (
          <button key={f.id} role="tab" aria-selected={selected === f.id} className="folder-tab" onClick={() => onSelect(f.id)}>
            <span>{f.name}</span>
            <span className="count">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
