import type { RecordView } from '../db/records';

// Instant, in-memory search. ~200 records means a linear scan is well under a millisecond.

interface Doc { r: RecordView; fields: Array<[text: string, weight: number]> }

export function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function buildDocs(records: RecordView[]): Doc[] {
  return records.map((r) => {
    const rel = r.release;
    const credits = [
      ...(rel?.extraartists ?? []).map((a) => a.anv || a.name),
      ...(rel?.tracklist ?? []).flatMap((t) => (t.extraartists ?? []).map((a) => a.anv || a.name)),
      ...(rel?.artists ?? []).map((a) => a.name),
    ];
    const labels = (rel?.labels ?? []).map((l) => `${l.name} ${l.catno}`);
    const tracks = (rel?.tracklist ?? []).map((t) => t.title);
    return {
      r,
      fields: [
        [normalize(r.artist), 6], [normalize(r.title), 6], [normalize(r.sortName), 3],
        [normalize(credits.join(' | ')), 3],
        [normalize(`${r.label} ${r.catno} ${labels.join(' ')}`), 2], [normalize(r.catno.replace(/\s+/g, '')), 2],
        [normalize(`${r.pressingYear ?? ''} ${r.original?.date.year ?? ''}`), 2],
        [normalize([...r.genres, ...r.styles].join(' ')), 1.5],
        [normalize(tracks.join(' | ')), 1],
        [normalize(`${r.notes ?? ''} ${r.otherFields.map((f) => f.value).join(' ')}`), 1],
      ],
    };
  });
}

export function search(docs: Doc[], query: string, limit = 80): RecordView[] {
  const tokens = normalize(query).split(' ').filter(Boolean);
  if (!tokens.length) return [];
  const phrase = tokens.join(' ');
  const scored: Array<[number, RecordView]> = [];
  for (const d of docs) {
    let total = 0;
    let all = true;
    for (const t of tokens) {
      let best = 0;
      for (const [text, w] of d.fields) {
        if (!text) continue;
        const idx = text.indexOf(t);
        if (idx < 0) continue;
        const wordStart = idx === 0 || text[idx - 1] === ' ';
        best = Math.max(best, w * (wordStart ? 1 : 0.4));
      }
      if (!best) { all = false; break; }
      total += best;
    }
    if (!all) continue;
    for (const [text, w] of d.fields) if (tokens.length > 1 && text.includes(phrase)) total += w;
    scored.push([total, d.r]);
  }
  return scored.sort((a, b) => b[0] - a[0] || a[1].sortName.localeCompare(b[1].sortName)).slice(0, limit).map((x) => x[1]);
}
