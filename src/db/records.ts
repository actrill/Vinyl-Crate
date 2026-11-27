import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import type { DiscogsCustomField, DiscogsRelease } from '../api/types';
import { resolveOriginalDate, type DateSource, type PartialDate } from '../lib/anniversary';
import { formatArtists, folderDisplayName } from '../lib/format';
import { computeShelf, type ShelfPosition } from '../lib/shelf';
import { defaultSortName } from '../lib/sortName';
import { db, type FolderRow, type ImageRole, type ItemRow, type LocalRow, type MasterRow, type PriceRow } from './db';

/** Everything the UI needs about one copy in the collection. */
export interface RecordView {
  instanceId: number;
  releaseId: number;
  folderId: number;
  folderName: string;
  title: string;
  artist: string;
  sortName: string;
  defaultSortName: string;
  sortNameIsCustom: boolean;
  pressingYear: number | null;
  original: { date: PartialDate; source: DateSource } | null;
  label: string;
  catno: string;
  formatSummary: string;
  genres: string[];
  styles: string[];
  coverUrl: string;
  media?: string;
  sleeve?: string;
  notes?: string;
  otherFields: Array<{ name: string; value: string }>;
  rating: number;
  dateAdded: string;
  release?: DiscogsRelease;
  price?: PriceRow;
  local?: LocalRow;
  shelf: ShelfPosition;
}

export interface Library {
  folders: FolderRow[];
  records: RecordView[];
  byInstance: Map<number, RecordView>;
  /** Shelf-ordered records per folder id (0 = all folders, by folder then slot). */
  byFolder: Map<number, RecordView[]>;
  fields: DiscogsCustomField[];
  currency: string;
  loaded: boolean;
}

function findField(fields: DiscogsCustomField[], re: RegExp) {
  return fields.find((f) => re.test(f.name));
}

export function formatSummary(rel: DiscogsRelease | undefined, item: ItemRow): string {
  const formats = rel?.formats ?? item.basic.formats;
  const parts = formats.flatMap((f) => [...(f.descriptions ?? []), ...(f.text ? [f.text] : [])]);
  return [...new Set(parts)].join(', ');
}

export function buildLibrary(
  folders: FolderRow[], items: ItemRow[], releases: Map<number, DiscogsRelease>, masters: Map<number, MasterRow>,
  prices: Map<number, PriceRow>, locals: Map<number, LocalRow>, fields: DiscogsCustomField[], currency: string,
): Omit<Library, 'loaded'> {
  const mediaF = findField(fields, /media\s*condition/i);
  const sleeveF = findField(fields, /sleeve\s*condition/i);
  const notesF = findField(fields, /^notes?$/i) ?? fields.find((f) => f.type === 'textarea');
  const folderName = new Map(folders.map((f) => [f.id, f.name]));

  const pre = items.map((it) => {
    const rel = releases.get(it.releaseId);
    const local = locals.get(it.releaseId);
    const masterId = rel?.master_id || it.basic.masterId;
    const master = masterId ? masters.get(masterId) : undefined;
    const artists = rel?.artists ?? it.basic.artists;
    const def = defaultSortName({
      artists, title: rel?.title ?? it.basic.title, genres: rel?.genres ?? it.basic.genres, extraartists: rel?.extraartists,
    });
    const original = resolveOriginalDate({
      manualDate: local?.manualDate, releaseReleased: rel?.released, releaseYear: rel?.year || it.basic.year || null,
      masterYear: master?.year || null, masterMainReleased: master?.mainReleased,
    });
    const label = (rel?.labels ?? it.basic.labels)[0];
    return { it, rel, local, def, original, label };
  });

  const shelf = computeShelf(pre.map((p) => ({
    instanceId: p.it.instanceId, folderId: p.it.folderId, sortName: p.local?.sortName || p.def,
    year: p.original?.date.year ?? null, title: p.rel?.title ?? p.it.basic.title,
  })));

  const records: RecordView[] = pre.map(({ it, rel, local, def, original, label }) => {
    const known = new Set([mediaF?.id, sleeveF?.id, notesF?.id]);
    return {
      instanceId: it.instanceId,
      releaseId: it.releaseId,
      folderId: it.folderId,
      folderName: folderName.get(it.folderId) ?? 'Uncategorized',
      title: rel?.title ?? it.basic.title,
      artist: formatArtists(rel?.artists ?? it.basic.artists),
      sortName: local?.sortName || def,
      defaultSortName: def,
      sortNameIsCustom: !!local?.sortName,
      pressingYear: (rel?.year || it.basic.year) || null,
      original,
      label: label?.name.replace(/\s+\(\d+\)$/, '') ?? '',
      catno: label?.catno ?? '',
      formatSummary: formatSummary(rel, it),
      genres: rel?.genres ?? it.basic.genres,
      styles: rel?.styles ?? it.basic.styles,
      coverUrl: coverFor(rel, local) ?? it.basic.cover,
      media: mediaF ? it.fields[mediaF.id] : undefined,
      sleeve: sleeveF ? it.fields[sleeveF.id] : undefined,
      notes: notesF ? it.fields[notesF.id] : undefined,
      otherFields: fields.filter((f) => !known.has(f.id) && it.fields[f.id]).map((f) => ({ name: f.name, value: it.fields[f.id]! })),
      rating: it.rating,
      dateAdded: it.dateAdded,
      release: rel,
      price: prices.get(it.releaseId),
      local,
      shelf: shelf.get(it.instanceId)!,
    };
  });

  const ordered = [...folders].sort((a, b) => a.order - b.order);
  const folderOrder = new Map(ordered.map((f, i) => [f.id, i]));
  const byFolder = new Map<number, RecordView[]>();
  const all = [...records].sort((a, b) =>
    (folderOrder.get(a.folderId) ?? 999) - (folderOrder.get(b.folderId) ?? 999) || a.shelf.slot - b.shelf.slot);
  byFolder.set(0, all);
  for (const r of all) {
    if (!byFolder.has(r.folderId)) byFolder.set(r.folderId, []);
    byFolder.get(r.folderId)!.push(r);
  }
  return { folders: ordered, records, byInstance: new Map(records.map((r) => [r.instanceId, r])), byFolder, fields, currency };
}

/** Image chosen by the user for a role, else a reasonable guess. */
export function imageForRole(rel: DiscogsRelease | undefined, local: LocalRow | undefined, role: ImageRole): string | undefined {
  const imgs = rel?.images ?? [];
  if (!imgs.length) return undefined;
  const roles = local?.imageRoles;
  if (roles) {
    const idx = Object.entries(roles).find(([, r]) => r === role)?.[0];
    if (idx !== undefined) return imgs[Number(idx)]?.uri;
    if (Object.keys(roles).length) {
      // The user has assigned some images; don't guess for roles they left empty, except the front.
      if (role !== 'front') return undefined;
    }
  }
  return guessImage(imgs, role)?.uri;
}

/**
 * Discogs doesn't label which image is which. Common upload order is:
 * front (primary), back, label side A, label side B. Square images near
 * 1:1 that come after the back are likely labels.
 */
export function guessImage<T extends { type: string; width: number; height: number }>(imgs: T[], role: ImageRole): T | undefined {
  const primary = imgs.find((i) => i.type === 'primary') ?? imgs[0];
  const rest = imgs.filter((i) => i !== primary);
  switch (role) {
    case 'front': return primary;
    case 'back': return rest[0];
    case 'labelA': return rest[1];
    case 'labelB': return rest[2];
    default: return undefined;
  }
}

export function roleOfImage(rel: DiscogsRelease | undefined, local: LocalRow | undefined, index: number): ImageRole {
  const explicit = local?.imageRoles?.[index];
  if (explicit) return explicit;
  const imgs = rel?.images ?? [];
  for (const role of ['front', 'back', 'labelA', 'labelB'] as const) {
    if (imgs[index] && guessImage(imgs, role) === imgs[index]) return role;
  }
  return 'other';
}

function coverFor(rel: DiscogsRelease | undefined, local: LocalRow | undefined): string | undefined {
  return imageForRole(rel, local, 'front');
}

export function useLibrary(): Library {
  const data = useLiveQuery(async () => {
    const [folders, items, releases, masters, prices, locals, fieldsRow, currencyRow] = await Promise.all([
      db.folders.toArray(), db.items.toArray(), db.releases.toArray(), db.masters.toArray(), db.prices.toArray(),
      db.local.toArray(), db.meta.get('fields'), db.meta.get('currency'),
    ]);
    return { folders, items, releases, masters, prices, locals, fields: (fieldsRow?.value ?? []) as DiscogsCustomField[], currency: (currencyRow?.value as string) ?? 'USD' };
  }, []);
  return useMemo(() => {
    if (!data) return { folders: [], records: [], byInstance: new Map(), byFolder: new Map(), fields: [], currency: 'USD', loaded: false };
    return {
      ...buildLibrary(
        data.folders, data.items, new Map(data.releases.map((r) => [r.id, r.data])), new Map(data.masters.map((m) => [m.id, m])),
        new Map(data.prices.map((p) => [p.releaseId, p])), new Map(data.locals.map((l) => [l.releaseId, l])), data.fields, data.currency,
      ),
      loaded: true,
    };
  }, [data]);
}

export function shelfSentence(r: Pick<RecordView, 'folderName' | 'shelf'>): string {
  return `${folderDisplayName(r.folderName)}, slot ${r.shelf.slot} of ${r.shelf.of}`;
}
