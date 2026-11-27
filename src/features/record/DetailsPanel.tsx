import { ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { releasePageUrl } from '../../api/client';
import type { DiscogsArtistRef, DiscogsTrack } from '../../api/types';
import { updateLocal } from '../../db/db';
import type { Library, RecordView } from '../../db/records';
import { formatPartialDate, isMilestone, parseDiscogsDate, toIsoDate } from '../../lib/anniversary';
import { formatAddedDate, formatArtists } from '../../lib/format';
import { stripDisambiguation } from '../../lib/sortName';
import { useApp } from '../../state/store';
import { PricesTable } from './PricesTable';

const SOURCE_TEXT: Record<string, string> = {
  manual: 'Date you added',
  'master-main': 'From the original release on Discogs',
  master: 'Year of the original release on Discogs',
  release: 'From this release on Discogs',
  'release-year': 'Year of this release on Discogs',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="liner-section"><h2>{title}</h2>{children}</section>;
}

/** Discogs notes use light markup like [a=Name] and [url=…]text[/url]. Show it as plain text. */
export function cleanDiscogsMarkup(s: string): string {
  return s
    .replace(/\[url=[^\]]*\]([^[]*)\[\/url\]/gi, '$1')
    .replace(/\[(?:a|l|m|r)=([^\]]+)\]/gi, '$1')
    .replace(/\[(?:a|l|m|r)(\d+)\]/gi, '')
    .replace(/\[\/?(?:b|i|u)\]/gi, '');
}

function groupTracks(list: DiscogsTrack[]) {
  const groups: Array<{ side: string; heading?: string; tracks: DiscogsTrack[] }> = [];
  for (const t of list.flatMap((t) => (t.type_ === 'index' && t.sub_tracks?.length ? t.sub_tracks : [t]))) {
    if (t.type_ === 'heading') { groups.push({ side: '', heading: t.title, tracks: [] }); continue; }
    const side = t.position.match(/^([A-Za-z]+)/)?.[1]?.toUpperCase() ?? '';
    const last = groups[groups.length - 1];
    if (last && (last.side === side || (last.heading && !last.side && !last.tracks.length))) { last.side ||= side; last.tracks.push(t); }
    else groups.push({ side, tracks: [t] });
  }
  return groups;
}

function credits(r: RecordView) {
  const people = new Map<string, Set<string>>();
  const add = (a: DiscogsArtistRef, scope?: string) => {
    const name = stripDisambiguation(a.anv || a.name);
    if (!people.has(name)) people.set(name, new Set());
    const role = a.role || 'Performer';
    people.get(name)!.add(a.tracks || scope ? `${role} (${a.tracks || scope})` : role);
  };
  for (const a of r.release?.extraartists ?? []) add(a);
  for (const t of r.release?.tracklist ?? []) for (const a of t.extraartists ?? []) add(a, t.position);
  return [...people.entries()].map(([name, roles]) => ({ name, roles: [...roles].join(', ') }));
}

function DateEditor({ r }: { r: RecordView }) {
  const [editing, setEditing] = useState(false);
  const initial = r.local?.manualDate ?? (r.original ? toIsoDate(r.original.date) : '');
  const [value, setValue] = useState(initial.includes('-00') ? '' : initial);
  if (!editing) {
    return (
      <button className="liner-btn" onClick={() => setEditing(true)}>
        {r.local?.manualDate ? 'Change date' : r.original?.date.day ? 'Correct the date' : 'Add exact release date'}
      </button>
    );
  }
  return (
    <form className="date-editor" onSubmit={(e) => {
      e.preventDefault();
      const d = parseDiscogsDate(value);
      void updateLocal(r.releaseId, { manualDate: d && d.day ? value : undefined });
      setEditing(false);
    }}>
      <label className="sr-only" htmlFor="manual-date">Original release date</label>
      <input id="manual-date" className="liner-input" type="date" min="1880-01-01" max={new Date().toISOString().slice(0, 10)} value={value} onChange={(e) => setValue(e.target.value)} />
      <button className="liner-btn" type="submit">Save</button>
      {r.local?.manualDate && <button className="liner-btn" type="button" onClick={() => { void updateLocal(r.releaseId, { manualDate: undefined }); setEditing(false); }}>Use Discogs date</button>}
    </form>
  );
}

export function DetailsPanel({ r }: { r: RecordView; lib: Library }) {
  const navigate = useApp((s) => s.navigate);
  const rel = r.release;
  const age = r.original ? new Date().getFullYear() - r.original.date.year : null;
  const companies = (rel?.companies ?? []).filter((c) => c.entity_type_name);
  const identifiers = rel?.identifiers ?? [];
  const people = credits(r);
  const labels = rel?.labels ?? [];

  return (
    <div className="liner">
      {!rel && <p className="liner-note">Full details for this record arrive during the sync.</p>}

      <Section title="Release">
        <dl className="facts">
          <div><dt>Label</dt><dd>{labels.length ? labels.map((l) => `${stripDisambiguation(l.name)} ${l.catno}`).join(' · ') : `${r.label} ${r.catno}`}</dd></div>
          <div>
            <dt>Original release</dt>
            <dd>
              {r.original ? formatPartialDate(r.original.date) : 'Unknown'}
              {age !== null && age > 0 && <span className={isMilestone(age) ? 'milestone-tag' : undefined}> · {age} years{isMilestone(age) ? ', a milestone this year' : ''}</span>}
              {r.original && <span className="liner-note block">{SOURCE_TEXT[r.original.source]}</span>}
              <DateEditor r={r} />
            </dd>
          </div>
          <div><dt>This pressing</dt><dd>{r.pressingYear ?? '—'}{rel?.released_formatted && rel.released_formatted !== String(r.pressingYear) ? ` (${rel.released_formatted})` : ''}</dd></div>
          {rel?.country && <div><dt>Country</dt><dd>{rel.country}</dd></div>}
          <div><dt>Format</dt><dd>{(rel?.formats ?? []).map((f) => [f.qty !== '1' ? `${f.qty} × ` : '', f.name, ...(f.descriptions?.length ? [`, ${f.descriptions.join(', ')}`] : []), f.text ? ` (${f.text})` : ''].join('')).join('; ') || r.formatSummary}</dd></div>
        </dl>
      </Section>

      <Section title="My copy">
        <dl className="facts">
          <div><dt>Media</dt><dd>{r.media ?? 'Not graded'}</dd></div>
          <div><dt>Sleeve</dt><dd>{r.sleeve ?? 'Not graded'}</dd></div>
          {r.otherFields.map((f) => <div key={f.name}><dt>{f.name}</dt><dd>{f.value}</dd></div>)}
          <div><dt>Added</dt><dd>{formatAddedDate(r.dateAdded)}</dd></div>
          <div><dt>My rating</dt><dd aria-label={r.rating ? `${r.rating} out of 5` : 'Not rated'}>{r.rating ? '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating) : 'Not rated'}</dd></div>
        </dl>
        {r.notes && <p className="liner-notes-text">{r.notes}</p>}
      </Section>

      <Section title="Prices"><PricesTable r={r} /></Section>

      {rel?.tracklist?.length ? (
        <Section title="Tracklist">
          {groupTracks(rel.tracklist).map((g, i) => (
            <div key={i} className="side">
              {(g.heading || g.side) && <h3>{g.heading ?? `Side ${g.side}`}</h3>}
              <ol className="tracks">
                {g.tracks.map((t, j) => (
                  <li key={j}>
                    <span className="pos">{t.position}</span>
                    <span className="t-title">{t.title}{t.extraartists?.length ? <span className="liner-note block">{formatArtists(t.extraartists.filter((a) => a.role)).slice(0, 120)}</span> : null}</span>
                    <span className="dur">{t.duration}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </Section>
      ) : null}

      {people.length > 0 && (
        <Section title="Credits">
          <ul className="credits">
            {people.map((p) => (
              <li key={p.name}>
                <button className="credit-name" onClick={() => navigate({ name: 'search', query: p.name })} aria-label={`Find other records with ${p.name}`}>{p.name}</button>
                <span className="role">{p.roles}</span>
              </li>
            ))}
          </ul>
          <p className="liner-note">Tap a name to find other records with them in your collection.</p>
        </Section>
      )}

      {(identifiers.length > 0 || companies.length > 0) && (
        <Section title="Identifiers">
          <dl className="facts">
            {identifiers.map((id, i) => (
              <div key={i}><dt>{id.type}{id.description ? <span className="liner-note block">{id.description}</span> : null}</dt><dd className="etched">{id.value}</dd></div>
            ))}
            {companies.map((c, i) => <div key={`c${i}`}><dt>{c.entity_type_name}</dt><dd>{stripDisambiguation(c.name)}{c.catno ? ` · ${c.catno}` : ''}</dd></div>)}
          </dl>
        </Section>
      )}

      <Section title="On Discogs">
        <dl className="facts">
          <div><dt>Genres</dt><dd>{r.genres.join(', ') || '—'}</dd></div>
          <div><dt>Styles</dt><dd>{r.styles.join(', ') || '—'}</dd></div>
          {rel?.community && <div><dt>Have / want</dt><dd>{rel.community.have.toLocaleString()} / {rel.community.want.toLocaleString()}</dd></div>}
          {rel?.community?.rating && <div><dt>Community rating</dt><dd>{rel.community.rating.average.toFixed(2)} out of 5 · {rel.community.rating.count.toLocaleString()} ratings</dd></div>}
        </dl>
        {rel?.notes && (
          <details className="release-notes">
            <summary>Release notes</summary>
            <p className="liner-notes-text">{cleanDiscogsMarkup(rel.notes)}</p>
          </details>
        )}
        <a className="liner-link" href={rel?.uri || releasePageUrl(r.releaseId)} target="_blank" rel="noopener noreferrer">Open in Discogs <ExternalLink size={14} aria-hidden /></a>
      </Section>
    </div>
  );
}
