import { CalendarHeart } from 'lucide-react';
import type { Library } from '../../db/records';
import { anniversariesOn } from '../../lib/anniversary';
import { useApp } from '../../state/store';
import { Cover } from '../../ui/Cover';

export function OnThisDay({ lib }: { lib: Library }) {
  const navigate = useApp((s) => s.navigate);
  const seen = new Set<number>();
  const today = anniversariesOn(
    lib.records.filter((r) => r.original && !seen.has(r.releaseId) && seen.add(r.releaseId)).map((r) => ({ releaseId: r.releaseId, date: r.original!.date })),
    new Date(),
  );
  if (!today.length) return null;
  const byRelease = new Map(lib.records.map((r) => [r.releaseId, r]));
  return (
    <section className="on-this-day" aria-label="On this day">
      <h2 className="section-title row"><CalendarHeart size={18} aria-hidden /> On this day</h2>
      <ul className="otd-list">
        {today.map((a) => {
          const r = byRelease.get(a.releaseId)!;
          return (
            <li key={a.releaseId}>
              <button className={`otd-card ${a.milestone ? 'milestone' : ''}`} onClick={() => navigate({ name: 'record', instanceId: r.instanceId, from: 'other' })}>
                <Cover url={r.coverUrl} alt="" fallback={r.title} />
                <span className="grow">
                  <strong className="ellipsis">{r.title}</strong>
                  <span className="small">{a.milestone ? `${a.age} years today` : `Turns ${a.age} today`}</span>
                  <span className="small muted ellipsis">{r.artist}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
