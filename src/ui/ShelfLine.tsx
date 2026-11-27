import { MapPin } from 'lucide-react';
import type { RecordView } from '../db/records';
import { folderDisplayName } from '../lib/format';
import { describeNeighbours } from '../lib/shelf';

/** "Bebop & Hard Bop, slot 23 of 41, between Monk and Parker." The most important line in the app. */
export function ShelfLine({ r, compact = false }: { r: RecordView; compact?: boolean }) {
  return (
    <p className={`shelf-line ${compact ? 'compact' : ''}`}>
      <MapPin size={compact ? 14 : 18} aria-hidden className="shelf-pin" />
      <span>
        {folderDisplayName(r.folderName)}, <strong>slot {r.shelf.slot}</strong> of {r.shelf.of}
        {!compact && <>, {describeNeighbours(r.shelf)}</>}
      </span>
    </p>
  );
}
