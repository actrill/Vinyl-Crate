import { ArrowLeft } from 'lucide-react';
import { useMemo } from 'react';
import type { Library, RecordView } from '../../db/records';
import { formatPartialDate, turningThisYear, upcomingAnniversaries } from '../../lib/anniversary';
import { useApp } from '../../state/store';
import { Cover } from '../../ui/Cover';

function Item({ r, line, milestone }: { r: RecordView; line: string; milestone: boolean }) {
  const navigate = useApp((s) => s.navigate);
  return (
    <li>
      <button className="list-button list-item" onClick={() => navigate({ name: 'record', instanceId: r.instanceId, from: 'other' })}>
        <Cover url={r.coverUrl} alt="" fallback={r.title} className="result-cover" />
        <span className="grow" style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="ellipsis">{r.title}</span>
          <span className="small muted ellipsis">{r.artist}</span>
          <span className={`small ${milestone ? 'milestone-text' : ''}`}>{line}</span>
        </span>
      </button>
    </li>
  );
}

export function AnniversariesScreen({ lib }: { lib: Library }) {
  const back = useApp((s) => s.back);
  const year = new Date().getFullYear();
  const { upcoming, yearOnly, byRelease } = useMemo(() => {
    const byRelease = new Map<number, RecordView>();
    for (const r of lib.records) if (!byRelease.has(r.releaseId)) byRelease.set(r.releaseId, r);
    const cands = [...byRelease.values()].filter((r) => r.original).map((r) => ({ releaseId: r.releaseId, date: r.original!.date }));
    return { upcoming: upcomingAnniversaries(cands, new Date(), { hour: 0 }), yearOnly: turningThisYear(cands, year), byRelease };
  }, [lib.records, year]);

  return (
    <div className="screen">
      <header className="screen-header sub-header">
        <button className="icon-btn" onClick={back} aria-label="Back"><ArrowLeft size={22} aria-hidden /></button>
        <h1>Anniversaries</h1>
      </header>

      <h2 className="section-title">Next 12 months</h2>
      {upcoming.length === 0 && <p className="small muted">No records with a full release date yet. Add one from a record’s details.</p>}
      <ul className="list">
        {upcoming.map((o) => (
          <Item key={`${o.releaseId}-${o.at.getFullYear()}`} r={byRelease.get(o.releaseId)!} milestone={o.milestone}
            line={`${o.at.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })} · turns ${o.age}${o.milestone ? ' · milestone' : ''}`} />
        ))}
      </ul>

      <h2 className="section-title">Turning a year older in {year}</h2>
      <p className="small muted">Discogs only has a year for these, so they don’t get a notification. Open one and add the exact date if you know it.</p>
      <ul className="list">
        {yearOnly.map((a) => (
          <Item key={a.releaseId} r={byRelease.get(a.releaseId)!} milestone={a.milestone}
            line={`Turning ${a.age} in ${year} · released ${formatPartialDate(a.date)}`} />
        ))}
      </ul>
    </div>
  );
}
