// Pure diffing between the cached collection and a fresh folder listing.
// Items are keyed by instance_id (one physical copy), so two copies of the
// same release are tracked separately, and a move between folders keeps
// the same instance_id.

export interface ItemSnapshot {
  instanceId: number;
  releaseId: number;
  folderId: number;
  /** Hash of rating + custom field values, to spot edits made on Discogs. */
  fingerprint: string;
}

export interface CollectionDiff {
  added: ItemSnapshot[];
  removed: ItemSnapshot[];
  moved: Array<{ item: ItemSnapshot; from: number; to: number }>;
  edited: ItemSnapshot[];
  unchanged: number;
}

export function diffCollection(prev: ItemSnapshot[], next: ItemSnapshot[]): CollectionDiff {
  const before = new Map(prev.map((i) => [i.instanceId, i]));
  const seen = new Set<number>();
  const diff: CollectionDiff = { added: [], removed: [], moved: [], edited: [], unchanged: 0 };
  for (const item of next) {
    seen.add(item.instanceId);
    const old = before.get(item.instanceId);
    if (!old) { diff.added.push(item); continue; }
    let changed = false;
    if (old.folderId !== item.folderId) { diff.moved.push({ item, from: old.folderId, to: item.folderId }); changed = true; }
    if (old.fingerprint !== item.fingerprint) { diff.edited.push(item); changed = true; }
    if (!changed) diff.unchanged++;
  }
  for (const item of prev) if (!seen.has(item.instanceId)) diff.removed.push(item);
  return diff;
}

/** Release ids in the new listing whose full details we don't have yet. */
export function releasesToFetch(next: ItemSnapshot[], known: Set<number>): number[] {
  return [...new Set(next.map((i) => i.releaseId))].filter((id) => !known.has(id));
}

/** Cached release ids no longer referenced by any item (safe to prune). */
export function releasesToPrune(next: ItemSnapshot[], cached: Iterable<number>): number[] {
  const live = new Set(next.map((i) => i.releaseId));
  return [...cached].filter((id) => !live.has(id));
}

export function fingerprint(rating: number, notes: Array<{ field_id: number; value: string }> | undefined): string {
  const n = [...(notes ?? [])].sort((a, b) => a.field_id - b.field_id).map((x) => `${x.field_id}=${x.value}`).join('|');
  return `${rating}|${n}`;
}

export function summarizeDiff(d: CollectionDiff): string {
  const parts: string[] = [];
  if (d.added.length) parts.push(`${d.added.length} added`);
  if (d.removed.length) parts.push(`${d.removed.length} removed`);
  if (d.moved.length) parts.push(`${d.moved.length} moved`);
  if (d.edited.length) parts.push(`${d.edited.length} updated`);
  return parts.length ? parts.join(', ') : 'No changes';
}
