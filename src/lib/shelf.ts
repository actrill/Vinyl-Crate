import { shortShelfLabel, sortKey } from './sortName';

export interface ShelfEntry {
  instanceId: number;
  folderId: number;
  sortName: string;
  /** Original release year (master year when known), used within one artist. */
  year: number | null;
  title: string;
}

const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });

export function compareShelf(a: ShelfEntry, b: ShelfEntry): number {
  return (
    collator.compare(sortKey(a.sortName), sortKey(b.sortName)) ||
    (a.year ?? 9999) - (b.year ?? 9999) ||
    collator.compare(a.title, b.title) ||
    a.instanceId - b.instanceId
  );
}

export interface ShelfPosition {
  folderId: number;
  slot: number; // 1-based
  of: number;
  before?: string; // neighbour to the left
  after?: string; // neighbour to the right
}

/** Shelf positions for every item, computed per folder. */
export function computeShelf(entries: ShelfEntry[]): Map<number, ShelfPosition> {
  const byFolder = new Map<number, ShelfEntry[]>();
  for (const e of entries) {
    const list = byFolder.get(e.folderId) ?? [];
    list.push(e);
    byFolder.set(e.folderId, list);
  }
  const out = new Map<number, ShelfPosition>();
  for (const [folderId, list] of byFolder) {
    list.sort(compareShelf);
    list.forEach((e, i) => {
      const prev = list[i - 1];
      const next = list[i + 1];
      out.set(e.instanceId, {
        folderId,
        slot: i + 1,
        of: list.length,
        before: prev ? shortShelfLabel(prev.sortName) : undefined,
        after: next ? shortShelfLabel(next.sortName) : undefined,
      });
    });
  }
  return out;
}

export function describeNeighbours(p: ShelfPosition): string {
  if (p.before && p.after) return `between ${p.before} and ${p.after}`;
  if (p.after) return `first on the shelf, before ${p.after}`;
  if (p.before) return `last on the shelf, after ${p.before}`;
  return 'the only record in this folder';
}
