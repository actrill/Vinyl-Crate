import { describe, expect, it } from 'vitest';
import { diffCollection, fingerprint, releasesToFetch, releasesToPrune, summarizeDiff, type ItemSnapshot } from './diff';

const s = (instanceId: number, releaseId: number, folderId: number, fp = 'x'): ItemSnapshot => ({ instanceId, releaseId, folderId, fingerprint: fp });

describe('diffCollection', () => {
  it('detects added, removed, moved and edited items', () => {
    const prev = [s(1, 10, 1), s(2, 20, 1), s(3, 30, 2), s(4, 40, 2, 'a')];
    const next = [s(1, 10, 1), s(3, 30, 3), s(4, 40, 2, 'b'), s(5, 50, 1)];
    const d = diffCollection(prev, next);
    expect(d.added.map((i) => i.instanceId)).toEqual([5]);
    expect(d.removed.map((i) => i.instanceId)).toEqual([2]);
    expect(d.moved).toEqual([{ item: s(3, 30, 3), from: 2, to: 3 }]);
    expect(d.edited.map((i) => i.instanceId)).toEqual([4]);
    expect(d.unchanged).toBe(1);
    expect(summarizeDiff(d)).toBe('1 added, 1 removed, 1 moved, 1 updated');
  });

  it('reports no changes for identical listings', () => {
    const items = [s(1, 10, 1), s(2, 20, 2)];
    const d = diffCollection(items, [...items]);
    expect(d).toEqual({ added: [], removed: [], moved: [], edited: [], unchanged: 2 });
    expect(summarizeDiff(d)).toBe('No changes');
  });

  it('tracks two copies of the same release separately', () => {
    const d = diffCollection([s(1, 10, 1)], [s(1, 10, 1), s(2, 10, 2)]);
    expect(d.added.map((i) => i.instanceId)).toEqual([2]);
  });

  it('treats everything as added on first sync', () => {
    expect(diffCollection([], [s(1, 10, 1), s(2, 20, 1)]).added).toHaveLength(2);
  });

  it('treats a removed-and-re-added copy as remove + add (new instance id)', () => {
    const d = diffCollection([s(1, 10, 1)], [s(9, 10, 1)]);
    expect(d.added.map((i) => i.instanceId)).toEqual([9]);
    expect(d.removed.map((i) => i.instanceId)).toEqual([1]);
  });
});

describe('release fetch planning', () => {
  it('only fetches details for releases not already cached', () => {
    const next = [s(1, 10, 1), s(2, 20, 1), s(3, 20, 2), s(4, 30, 1)];
    expect(releasesToFetch(next, new Set([10]))).toEqual([20, 30]);
  });
  it('does not refetch a release that only moved or was re-added', () => {
    expect(releasesToFetch([s(9, 10, 3)], new Set([10]))).toEqual([]);
  });
  it('prunes releases no longer in the collection', () => {
    expect(releasesToPrune([s(1, 10, 1)], [10, 20])).toEqual([20]);
  });
});

describe('fingerprint', () => {
  it('is order-independent and changes with rating or notes', () => {
    const a = fingerprint(3, [{ field_id: 2, value: 'VG' }, { field_id: 1, value: 'NM' }]);
    const b = fingerprint(3, [{ field_id: 1, value: 'NM' }, { field_id: 2, value: 'VG' }]);
    expect(a).toBe(b);
    expect(fingerprint(4, [{ field_id: 1, value: 'NM' }, { field_id: 2, value: 'VG' }])).not.toBe(a);
    expect(fingerprint(3, [{ field_id: 1, value: 'NM' }])).not.toBe(a);
  });
});
