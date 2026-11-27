import { ArrowLeft, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { updateLocal } from '../../db/db';
import type { Library, RecordView } from '../../db/records';
import { normalize } from '../../lib/search';
import { useApp } from '../../state/store';

function Row({ r }: { r: RecordView }) {
  const [value, setValue] = useState(r.sortName);
  const commit = () => {
    const v = value.trim();
    void updateLocal(r.releaseId, { sortName: v && v !== r.defaultSortName ? v : undefined });
    if (!v) setValue(r.defaultSortName);
  };
  return (
    <li className="sort-row">
      <span className="small muted ellipsis">{r.artist} · {r.title}</span>
      <div className="row">
        <input className="input" value={value} aria-label={`Sort name for ${r.title}`}
          onChange={(e) => setValue(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
        {r.sortNameIsCustom && (
          <button className="icon-btn" aria-label={`Reset sort name for ${r.title} to ${r.defaultSortName}`}
            onClick={() => { setValue(r.defaultSortName); void updateLocal(r.releaseId, { sortName: undefined }); }}>
            <RotateCcw size={18} aria-hidden />
          </button>
        )}
      </div>
      <span className="small muted">Slot {r.shelf.slot} of {r.shelf.of}{r.sortNameIsCustom ? <> · <span className="custom-dot">edited</span></> : ''}</span>
    </li>
  );
}

export function SortNameEditor({ lib }: { lib: Library }) {
  const back = useApp((s) => s.back);
  const [filter, setFilter] = useState('');
  const [editedOnly, setEditedOnly] = useState(false);
  const list = useMemo(() => {
    const seen = new Set<number>();
    const q = normalize(filter);
    return (lib.byFolder.get(0) ?? [])
      .filter((r) => !seen.has(r.releaseId) && seen.add(r.releaseId))
      .filter((r) => !editedOnly || r.sortNameIsCustom)
      .filter((r) => !q || normalize(`${r.artist} ${r.title} ${r.sortName}`).includes(q));
  }, [lib, filter, editedOnly]);

  return (
    <div className="screen">
      <header className="screen-header sub-header">
        <button className="icon-btn" onClick={back} aria-label="Back"><ArrowLeft size={22} aria-hidden /></button>
        <h1>Sort names</h1>
      </header>
      <p className="small muted">Records file by these names, then by original year. Edit one and the shelf re-sorts straight away. Your edits stay on this phone and survive syncs.</p>
      <div className="row" style={{ margin: '12px 0' }}>
        <input className="input" placeholder="Filter" aria-label="Filter records" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <button className="btn ghost" aria-pressed={editedOnly} onClick={() => setEditedOnly((v) => !v)}>{editedOnly ? 'Show all' : 'Edited only'}</button>
      </div>
      <ul className="list">{list.map((r) => <Row key={r.releaseId} r={r} />)}</ul>
    </div>
  );
}
