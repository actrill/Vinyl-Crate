import type { SyncProgress } from '../../sync/sync';

const LABEL: Partial<Record<SyncProgress['phase'], string>> = {
  collection: 'Checking your folders',
  details: 'Syncing',
  dates: 'Finding original release dates',
  prices: 'Updating prices',
};

export function SyncStatus({ sync, value, hasRecords }: {
  sync: SyncProgress; lastSync?: number; value?: { minimum: string; median: string; maximum: string }; currencyHint: string; hasRecords: boolean;
}) {
  const active = sync.phase in LABEL;
  return (
    <div className="sync-status">
      {active && (
        <div className="sync-progress" role="status" aria-live="polite">
          <span className="small">
            {LABEL[sync.phase]}
            {sync.total > 0 && ` ${Math.min(sync.done + 1, sync.total)} of ${sync.total}`}
            {sync.phase === 'details' && hasRecords && <span className="muted"> · browse while you wait</span>}
          </span>
          <div className="bar"><div style={{ width: sync.total ? `${(sync.done / sync.total) * 100}%` : '15%' }} /></div>
        </div>
      )}
      {sync.phase === 'error' && <p className="sync-error small" role="alert">{sync.error}</p>}
      {value && hasRecords && (
        <p className="small muted value-line">
          Collection value <span className="value-num">{value.median}</span> median · {value.minimum} to {value.maximum}
        </p>
      )}
    </div>
  );
}
