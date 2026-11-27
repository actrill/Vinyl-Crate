import { Search as SearchIcon, X } from 'lucide-react';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import type { Library } from '../../db/records';
import { buildDocs, search } from '../../lib/search';
import { useApp } from '../../state/store';
import { Cover } from '../../ui/Cover';
import { ShelfLine } from '../../ui/ShelfLine';
import './search.css';

export function SearchScreen({ lib, initialQuery, covered }: { lib: Library; initialQuery?: string; covered: boolean }) {
  const [query, setQuery] = useState(initialQuery ?? '');
  const deferred = useDeferredValue(query);
  const navigate = useApp((s) => s.navigate);
  const input = useRef<HTMLInputElement>(null);
  const docs = useMemo(() => buildDocs(lib.records), [lib.records]);
  const results = useMemo(() => search(docs, deferred), [docs, deferred]);

  useEffect(() => { if (initialQuery !== undefined) setQuery(initialQuery); }, [initialQuery]);
  useEffect(() => { if (!initialQuery) input.current?.focus(); }, [initialQuery]);

  return (
    <div className="screen">
      <div className="search-box">
        <SearchIcon size={20} aria-hidden className="muted" />
        <input
          ref={input} className="search-input" type="search" inputMode="search" enterKeyHint="search" autoCapitalize="none"
          placeholder="Artist, title, label, sideman, notes…" aria-label="Search your collection"
          value={query} onChange={(e) => setQuery(e.target.value)}
        />
        {query && <button className="icon-btn" onClick={() => { setQuery(''); input.current?.focus(); }} aria-label="Clear search"><X size={20} aria-hidden /></button>}
      </div>

      {deferred && results.length === 0 && <p className="empty">Nothing in your collection matches “{deferred}”.</p>}
      {!deferred && <p className="search-hint muted small">Search across artists, titles, labels, catalog numbers, years, credits like “Paul Chambers”, styles and your notes.</p>}

      <ul className="list" aria-label="Results">
        {results.map((r) => (
          <li key={r.instanceId}>
            <button className="list-button list-item result" onClick={() => navigate({ name: 'record', instanceId: r.instanceId, from: 'search' })}>
              <Cover url={r.coverUrl} alt="" fallback={r.title} layoutId={covered ? undefined : `cover-${r.instanceId}`} className="result-cover" />
              <span className="grow">
                <span className="result-title ellipsis">{r.title}</span>
                <span className="muted small ellipsis">{r.artist}{r.original ? ` · ${r.original.date.year}` : ''}</span>
                <ShelfLine r={r} compact />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
