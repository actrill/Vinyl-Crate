import { DiscogsClient, DiscogsError } from '../api/client';
import type { DiscogsCollectionItem, DiscogsRelease } from '../api/types';
import { db, getMeta, setMeta, type ItemRow, type PriceRow } from '../db/db';
import { cacheImage } from '../lib/imageCache';
import { diffCollection, fingerprint, releasesToFetch, releasesToPrune, summarizeDiff, type ItemSnapshot } from './diff';

export const PRICE_STALE_MS = 7 * 24 * 3600 * 1000;
export const AUTO_SYNC_AFTER_MS = 24 * 3600 * 1000;

export type SyncPhase = 'idle' | 'collection' | 'details' | 'dates' | 'prices' | 'done' | 'error';

export interface SyncProgress {
  phase: SyncPhase;
  done: number;
  total: number;
  summary?: string;
  error?: string;
}

type Report = (p: SyncProgress) => void;

function toRow(it: DiscogsCollectionItem): ItemRow {
  const b = it.basic_information;
  return {
    instanceId: it.instance_id,
    releaseId: it.id,
    folderId: it.folder_id,
    dateAdded: it.date_added,
    rating: it.rating,
    fields: Object.fromEntries((it.notes ?? []).map((n) => [n.field_id, n.value])),
    fingerprint: fingerprint(it.rating, it.notes),
    basic: {
      title: b.title, artists: b.artists, year: b.year, thumb: b.thumb, cover: b.cover_image, labels: b.labels,
      formats: b.formats, genres: b.genres ?? [], styles: b.styles ?? [], masterId: b.master_id ?? 0,
    },
  };
}

export function describeSyncError(e: unknown): string {
  if (e instanceof DiscogsError) {
    if (e.isAuth) return 'Discogs did not accept your token. Check it in Settings, then try again.';
    if (e.status === 404) return 'Discogs could not find that username. Check it in Settings.';
    if (e.status >= 500) return 'Discogs is having trouble right now. Your collection is still available offline. Pull down to try again later.';
    return `Discogs returned an error (${e.message}). Pull down to try again.`;
  }
  return "Can't reach Discogs. Your collection is still available offline. Pull down to try again.";
}

/** Run up to `n` async tasks at a time. */
async function pool<T>(items: T[], n: number, fn: (t: T) => Promise<void>): Promise<void> {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) await fn(items[i++]!);
  }));
}

/** Cache cover thumbnails (not rate-limited: images are not API calls). */
async function cacheCovers(rows: ItemRow[]): Promise<void> {
  await pool(rows.filter((r) => r.basic.cover), 3, async (r) => { await cacheImage(r.basic.cover, 'thumb'); });
}

async function cacheReleaseImages(r: DiscogsRelease): Promise<void> {
  for (const img of r.images ?? []) await cacheImage(img.uri, 'full');
}

let running: Promise<void> | null = null;
export const isSyncing = () => running !== null;

/**
 * Sync the collection. First run fetches everything; later runs are incremental:
 * the folder listing is always refreshed, but release details are fetched only
 * for releases we haven't seen, and prices only when older than 7 days.
 * Records are written as they arrive, so the library fills in during the sync.
 */
export function runSync(client: DiscogsClient, report: Report): Promise<void> {
  if (running) return running;
  running = doSync(client, report).finally(() => { running = null; });
  return running;
}

async function doSync(client: DiscogsClient, report: Report): Promise<void> {
  try {
    report({ phase: 'collection', done: 0, total: 0 });
    const profile = await client.profile();
    const currency = profile.curr_abbr || (await getMeta('currency')) || 'USD';
    await setMeta('currency', currency);
    await setMeta('fields', await client.fields());

    const folders = await client.folders();
    await db.transaction('rw', db.folders, async () => {
      await db.folders.clear();
      await db.folders.bulkPut(folders.map((f, order) => ({ id: f.id, name: f.name, count: f.count, order })));
    });

    // Folder 0 ("All") lists every copy with its folder_id, which is fewer
    // requests than listing each folder separately and gives the same data.
    const listing = await client.collectionItems(0);
    const rows = listing.map(toRow);
    const prev: ItemSnapshot[] = (await db.items.toArray()).map((r) => ({
      instanceId: r.instanceId, releaseId: r.releaseId, folderId: r.folderId, fingerprint: r.fingerprint,
    }));
    const next: ItemSnapshot[] = rows.map((r) => ({ instanceId: r.instanceId, releaseId: r.releaseId, folderId: r.folderId, fingerprint: r.fingerprint }));
    const diff = diffCollection(prev, next);
    await db.transaction('rw', db.items, async () => {
      await db.items.bulkDelete(diff.removed.map((i) => i.instanceId));
      await db.items.bulkPut(rows);
    });
    const coverJob = cacheCovers(rows);

    try {
      const value = await client.collectionValue();
      await setMeta('collectionValue', { ...value, fetchedAt: Date.now() });
    } catch { /* value is optional */ }

    // Release details, only for releases we don't have.
    const known = new Set((await db.releases.toCollection().primaryKeys()) as number[]);
    const toFetch = releasesToFetch(next, known);
    const imageJobs: Promise<void>[] = [];
    for (let i = 0; i < toFetch.length; i++) {
      report({ phase: 'details', done: i, total: toFetch.length });
      const id = toFetch[i]!;
      try {
        const rel = await client.release(id, currency);
        await db.releases.put({ id, data: rel, fetchedAt: Date.now() });
        if (rel.lowest_price !== undefined && !(await db.prices.get(id))) {
          // The release response carries lowest price and count, so the first sync
          // has something to show before the slower price pass runs.
          await db.prices.put({
            releaseId: id, currency, suggestionsStatus: 'unavailable', suggestionsMessage: 'Not fetched yet',
            lowest: rel.lowest_price == null ? null : { currency, value: rel.lowest_price }, numForSale: rel.num_for_sale ?? null, fetchedAt: 0,
          });
        }
        imageJobs.push(cacheReleaseImages(rel));
      } catch (e) {
        if (e instanceof DiscogsError && e.isNotFound) continue; // release removed from Discogs
        throw e;
      }
    }
    const stale = releasesToPrune(next, known);
    if (stale.length) await db.releases.bulkDelete(stale);

    // Original release dates from master releases.
    const releases = await db.releases.toArray();
    const haveMasters = new Set((await db.masters.toCollection().primaryKeys()) as number[]);
    const needMasters = [...new Set(releases.map((r) => r.data.master_id).filter((m): m is number => !!m && !haveMasters.has(m)))];
    for (let i = 0; i < needMasters.length; i++) {
      report({ phase: 'dates', done: i, total: needMasters.length });
      const mid = needMasters[i]!;
      try {
        const m = await client.master(mid);
        let mainReleased: string | undefined;
        const ownCopy = releases.find((r) => r.id === m.main_release);
        if (ownCopy) mainReleased = ownCopy.data.released;
        else if (m.main_release) {
          try { mainReleased = (await client.release(m.main_release, undefined, 'low')).released; } catch { /* year is enough */ }
        }
        await db.masters.put({ id: mid, year: m.year, mainReleaseId: m.main_release, mainReleased, fetchedAt: Date.now() });
      } catch (e) {
        if (e instanceof DiscogsError && e.isNotFound) continue;
        throw e;
      }
    }

    // Prices on a slower schedule: only when missing or older than 7 days.
    const priceRows = new Map((await db.prices.toArray()).map((p) => [p.releaseId, p]));
    const liveIds = [...new Set(next.map((i) => i.releaseId))];
    const stalePrices = liveIds.filter((id) => (priceRows.get(id)?.fetchedAt ?? 0) < Date.now() - PRICE_STALE_MS);
    let sellerSettingsMissing = false;
    for (let i = 0; i < stalePrices.length; i++) {
      report({ phase: 'prices', done: i, total: stalePrices.length });
      try {
        await refreshPrices(client, stalePrices[i]!, currency, 'low', sellerSettingsMissing);
        // Only skip the rest when Discogs explicitly says seller settings are missing.
        const row = await db.prices.get(stalePrices[i]!);
        sellerSettingsMissing ||= row?.suggestionsStatus === 'needs-seller-settings' && /seller|settings/i.test(row.suggestionsMessage ?? '');
      } catch (e) {
        if (e instanceof DiscogsError && e.isNotFound) continue;
        throw e;
      }
    }

    await Promise.all([coverJob, ...imageJobs]);
    const summary = summarizeDiff(diff);
    await setMeta('lastSync', Date.now());
    await setMeta('lastSyncSummary', summary);
    report({ phase: 'done', done: 1, total: 1, summary });
  } catch (e) {
    report({ phase: 'error', done: 0, total: 0, error: describeSyncError(e) });
    throw e;
  }
}

/** Fetch price suggestions + marketplace stats for one release. */
export async function refreshPrices(
  client: DiscogsClient, releaseId: number, currency: string,
  priority: 'high' | 'low' = 'high', skipSuggestions = false,
): Promise<PriceRow> {
  const prev = await db.prices.get(releaseId);
  const stats = await client.marketplaceStats(releaseId, currency, priority);
  let row: PriceRow = {
    releaseId, currency,
    lowest: stats.lowest_price, numForSale: stats.num_for_sale,
    suggestionsStatus: prev?.suggestionsStatus ?? 'unavailable',
    suggestions: prev?.suggestions, suggestionsMessage: prev?.suggestionsMessage,
    fetchedAt: Date.now(),
  };
  if (skipSuggestions) {
    row = { ...row, suggestionsStatus: 'needs-seller-settings', suggestions: undefined };
  } else {
    const s = await client.priceSuggestions(releaseId, priority);
    if (s.kind === 'ok') row = { ...row, suggestionsStatus: 'ok', suggestions: s.suggestions, suggestionsMessage: undefined };
    else row = { ...row, suggestionsStatus: s.kind, suggestions: undefined, suggestionsMessage: s.message };
  }
  await db.prices.put(row);
  return row;
}
