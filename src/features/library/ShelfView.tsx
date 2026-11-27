import { useEffect, useRef, useState } from 'react';
import type { Library, RecordView } from '../../db/records';
import { contrastRatio, extractDominantColor } from '../../lib/color';
import { cachedImage } from '../../lib/imageCache';
import { useApp } from '../../state/store';

const SPINE_W = 38;
const GAP = 2;
const colorCache = new Map<string, string | null>();

/** Spine colour taken from the cover, so the shelf looks like the real one. */
function useSpineColor(url: string): string | null {
  const [c, setC] = useState(() => colorCache.get(url) ?? null);
  useEffect(() => {
    if (colorCache.has(url)) { setC(colorCache.get(url)!); return; }
    let alive = true;
    void (async () => {
      const src = await cachedImage(url, 'thumb');
      const color = src ? await extractDominantColor(src) : null;
      colorCache.set(url, color);
      if (alive) setC(color);
    })();
    return () => { alive = false; };
  }, [url]);
  return c;
}

function Spine({ r }: { r: RecordView }) {
  const navigate = useApp((s) => s.navigate);
  const bg = useSpineColor(r.coverUrl) ?? '#5A3E2B';
  const ink = contrastRatio(bg, '#E9E2D2') >= contrastRatio(bg, '#1f1d1a') ? '#E9E2D2' : '#1f1d1a';
  const h = 200 + ((r.releaseId * 7) % 5) * 4; // slight height variation, like real jackets
  return (
    <li>
      <button className="spine" style={{ background: bg, color: ink, height: h, width: SPINE_W }}
        onClick={() => navigate({ name: 'record', instanceId: r.instanceId, from: 'shelf' })}
        aria-label={`${r.artist}, ${r.title}. Slot ${r.shelf.slot} of ${r.shelf.of}.`}>
        <span className="spine-text"><strong>{r.artist}</strong>{'  '}{r.title}</span>
        <span className="spine-slot">{r.shelf.slot}</span>
      </button>
    </li>
  );
}

function Shelf({ records }: { records: RecordView[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [perRow, setPerRow] = useState(8);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setPerRow(Math.max(4, Math.floor((e!.contentRect.width - 16 + GAP) / (SPINE_W + GAP)))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const rows: RecordView[][] = [];
  for (let i = 0; i < records.length; i += perRow) rows.push(records.slice(i, i + perRow));
  return (
    <div ref={ref} className="shelf">
      {rows.map((row, i) => (
        <ul key={i} className="shelf-row" aria-label={`Shelf row ${i + 1}`}>
          {row.map((r) => <Spine key={r.instanceId} r={r} />)}
        </ul>
      ))}
    </div>
  );
}

export function ShelfView({ records, showFolderHeaders, lib }: { records: RecordView[]; showFolderHeaders: boolean; lib: Library }) {
  if (!showFolderHeaders) return <Shelf records={records} />;
  return (
    <>
      {lib.folders.filter((f) => f.id !== 0).map((f) => {
        const list = records.filter((r) => r.folderId === f.id);
        return list.length ? (
          <section key={f.id}>
            <h2 className="folder-heading">{f.name}</h2>
            <Shelf records={list} />
          </section>
        ) : null;
      })}
    </>
  );
}
