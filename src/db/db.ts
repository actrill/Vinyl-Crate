import Dexie, { type EntityTable } from 'dexie';
import type {
  DiscogsArtistRef, DiscogsCollectionValue, DiscogsCustomField, DiscogsFormat, DiscogsLabelRef,
  DiscogsPrice, DiscogsRelease,
} from '../api/types';

export interface FolderRow { id: number; name: string; count: number; order: number }

export interface ItemRow {
  instanceId: number;
  releaseId: number;
  folderId: number;
  dateAdded: string;
  rating: number;
  /** Custom field values keyed by field id. */
  fields: Record<number, string>;
  fingerprint: string;
  basic: {
    title: string;
    artists: DiscogsArtistRef[];
    year: number;
    thumb: string;
    cover: string;
    labels: DiscogsLabelRef[];
    formats: DiscogsFormat[];
    genres: string[];
    styles: string[];
    masterId: number;
  };
}

export interface ReleaseRow { id: number; data: DiscogsRelease; fetchedAt: number }

export interface MasterRow { id: number; year: number; mainReleaseId: number; mainReleased?: string; fetchedAt: number }

export interface PriceRow {
  releaseId: number;
  currency: string;
  suggestions?: Record<string, DiscogsPrice>;
  suggestionsStatus: 'ok' | 'needs-seller-settings' | 'unavailable';
  suggestionsMessage?: string;
  lowest?: DiscogsPrice | null;
  numForSale?: number | null;
  fetchedAt: number;
}

export type ImageRole = 'front' | 'back' | 'labelA' | 'labelB' | 'other';

/** Everything the user sets on-device. Survives syncs; never sent to Discogs. */
export interface LocalRow {
  releaseId: number;
  sortName?: string;
  manualDate?: string;
  /** Image roles keyed by image index in release.images. */
  imageRoles?: Record<number, ImageRole>;
}

export interface ImageRow { key: string; blob?: Blob; path?: string; bytes: number; createdAt: number }

export interface MetaRow { key: string; value: unknown }

export interface Meta {
  lastSync: number;
  lastSyncSummary: string;
  fields: DiscogsCustomField[];
  currency: string;
  collectionValue: DiscogsCollectionValue & { fetchedAt: number };
}

export class CrateDB extends Dexie {
  folders!: EntityTable<FolderRow, 'id'>;
  items!: EntityTable<ItemRow, 'instanceId'>;
  releases!: EntityTable<ReleaseRow, 'id'>;
  masters!: EntityTable<MasterRow, 'id'>;
  prices!: EntityTable<PriceRow, 'releaseId'>;
  local!: EntityTable<LocalRow, 'releaseId'>;
  images!: EntityTable<ImageRow, 'key'>;
  meta!: EntityTable<MetaRow, 'key'>;

  constructor() {
    super('crate');
    this.version(1).stores({
      folders: 'id, order',
      items: 'instanceId, releaseId, folderId',
      releases: 'id, fetchedAt',
      masters: 'id',
      prices: 'releaseId, fetchedAt',
      local: 'releaseId',
      images: 'key',
      meta: 'key',
    });
  }
}

export const db = new CrateDB();

export async function getMeta<K extends keyof Meta>(key: K): Promise<Meta[K] | undefined> {
  return (await db.meta.get(key))?.value as Meta[K] | undefined;
}

export async function setMeta<K extends keyof Meta>(key: K, value: Meta[K]): Promise<void> {
  await db.meta.put({ key, value });
}

export async function updateLocal(releaseId: number, patch: Partial<Omit<LocalRow, 'releaseId'>>): Promise<void> {
  await db.transaction('rw', db.local, async () => {
    const cur = (await db.local.get(releaseId)) ?? { releaseId };
    const next: LocalRow = { ...cur, ...patch };
    for (const k of Object.keys(patch) as Array<keyof typeof patch>) if (patch[k] === undefined) delete next[k];
    await db.local.put(next);
  });
}

/** Wipe everything synced from Discogs. Local edits are kept unless `includeLocal`. */
export async function clearSyncedData(includeLocal = false): Promise<void> {
  const tables = [db.folders, db.items, db.releases, db.masters, db.prices, db.meta, ...(includeLocal ? [db.local] : [])];
  await db.transaction('rw', tables, async () => { for (const t of tables) await t.clear(); });
}
