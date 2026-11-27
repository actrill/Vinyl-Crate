import { ExternalLink, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { salesHistoryUrl } from '../../api/client';
import type { RecordView } from '../../db/records';
import { orderedConditions, sameCondition } from '../../lib/conditions';
import { formatPrice, relativeTime } from '../../lib/format';
import { refreshRecordPrices } from '../../state/hooks';

export function PricesTable({ r }: { r: RecordView }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const p = r.price;

  async function refresh() {
    setBusy(true);
    setError(null);
    try { await refreshRecordPrices(r.releaseId); } catch { setError("Couldn't reach Discogs. The prices shown are from the last refresh."); } finally { setBusy(false); }
  }

  const rows = p?.suggestions ? orderedConditions(Object.keys(p.suggestions)) : [];

  return (
    <div className="prices">
      {p?.suggestionsStatus === 'ok' && rows.length > 0 && (
        <>
          <table className="price-table">
            <caption className="liner-note">Discogs’s suggested prices by condition</caption>
            <thead><tr><th scope="col">Media condition</th><th scope="col" className="num">Suggested</th></tr></thead>
            <tbody>
              {rows.map((c) => {
                const mine = sameCondition(c, r.media);
                return (
                  <tr key={c} className={mine ? 'mine' : undefined} aria-current={mine ? 'true' : undefined}>
                    <th scope="row">{c}{mine && <span className="mine-tag"> · your copy</span>}</th>
                    <td className="num">{formatPrice(p.suggestions![c]!.value, p.suggestions![c]!.currency)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
      {p?.suggestionsStatus === 'needs-seller-settings' && (
        <p className="liner-note">
          Discogs only gives price suggestions to accounts with seller settings filled in. You don’t have to sell anything:
          add them at <a href="https://www.discogs.com/settings/seller" target="_blank" rel="noopener noreferrer">discogs.com → Settings → Seller settings</a>, then refresh.
        </p>
      )}
      {p?.suggestionsStatus === 'unavailable' && p.fetchedAt > 0 && <p className="liner-note">Discogs has no price suggestions for this release.</p>}
      {(!p || p.fetchedAt === 0) && <p className="liner-note">Price suggestions arrive with the next sync, or refresh now.</p>}

      <dl className="facts">
        <div><dt>Lowest listing</dt><dd>{p?.lowest ? formatPrice(p.lowest.value, p.lowest.currency) : p ? 'None for sale' : '—'}</dd></div>
        <div><dt>For sale now</dt><dd>{p?.numForSale ?? '—'}</dd></div>
      </dl>

      <div className="price-foot">
        <span className="liner-note">{p?.fetchedAt ? `Prices refreshed ${relativeTime(p.fetchedAt)}` : 'Not refreshed yet'}{p?.currency ? ` · ${p.currency}` : ''}</span>
        <button className="liner-btn" onClick={() => void refresh()} disabled={busy}>
          <RefreshCw size={16} aria-hidden className={busy ? 'spin' : undefined} /> {busy ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      {error && <p className="liner-note error" role="alert">{error}</p>}
      <a className="liner-link" href={salesHistoryUrl(r.releaseId)} target="_blank" rel="noopener noreferrer">
        Sales history on Discogs <ExternalLink size={14} aria-hidden />
      </a>
      <p className="liner-note">Last sold and median sale prices aren’t available through the Discogs API, so they open on the Discogs website.</p>
    </div>
  );
}
