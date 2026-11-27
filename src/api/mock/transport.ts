import type { HttpResponse, Transport } from '../transport';
import type {
  DiscogsArtistRef, DiscogsCollectionItem, DiscogsImage, DiscogsRelease, DiscogsTrack,
} from '../types';
import { MOCK_FIELDS, MOCK_FOLDERS, MOCK_RECORDS, type MockRecord } from './data';
import { drawMockImage } from './images';

const MOCK_USER = 'demo';
const CONDITIONS: Array<[string, number]> = [
  ['Mint (M)', 1.7], ['Near Mint (NM or M-)', 1.35], ['Very Good Plus (VG+)', 1], ['Very Good (VG)', 0.62],
  ['Good Plus (G+)', 0.38], ['Good (G)', 0.26], ['Fair (F)', 0.16], ['Poor (P)', 0.1],
];

let used = 0;
const ok = (data: unknown): HttpResponse => {
  used = Math.min(60, used + 1);
  return {
    status: 200,
    headers: { 'x-discogs-ratelimit': '60', 'x-discogs-ratelimit-used': String(used), 'x-discogs-ratelimit-remaining': '58' },
    data,
  };
};
const notFound = (): HttpResponse => ({ status: 404, headers: {}, data: { message: 'Resource not found.' } });

const artistRefs = (r: MockRecord): DiscogsArtistRef[] =>
  r.artists.map(([name, join], i) => ({ id: 5000 + i, name, anv: '', join: join ?? '', role: '', tracks: '' }));

function images(r: MockRecord): DiscogsImage[] {
  const kinds = ['front', 'back', 'labelA', 'labelB'].slice(0, r.images);
  return kinds.map((k, i) => ({
    type: i === 0 ? 'primary' : 'secondary',
    uri: `mock://img/${r.id}/${k}`,
    uri150: `mock://img/${r.id}/${k}`,
    resource_url: `mock://img/${r.id}/${k}`,
    width: 1000,
    height: 1000,
  }));
}

function tracks(r: MockRecord): DiscogsTrack[] {
  const list = r.tracks ?? ['A1', 'A2', 'A3', 'B1', 'B2', 'B3'].map((p, i) => [p, `Track ${p}`, `${4 + (i % 3)}:${String(10 + i * 7).padStart(2, '0')}`] as [string, string, string]);
  return list.map(([position, title, duration]) => ({ position, title, duration, type_: 'track' }));
}

function basic(r: MockRecord) {
  return {
    id: r.id,
    master_id: r.master?.id ?? 0,
    master_url: r.master ? `https://api.discogs.com/masters/${r.master.id}` : null,
    title: r.title,
    year: r.year,
    thumb: `mock://img/${r.id}/front`,
    cover_image: `mock://img/${r.id}/front`,
    formats: [{ name: 'Vinyl', qty: '1', descriptions: r.formats }],
    labels: [{ id: 1, name: r.label, catno: r.catno }],
    artists: artistRefs(r),
    genres: r.genres,
    styles: r.styles,
    resource_url: `https://api.discogs.com/releases/${r.id}`,
  };
}

function item(r: MockRecord, i: number): DiscogsCollectionItem {
  const notes = [{ field_id: 1, value: r.media }, { field_id: 2, value: r.sleeve }];
  if (r.notes) notes.push({ field_id: 3, value: r.notes });
  return { id: r.id, instance_id: 1_000_000 + i, folder_id: r.folder, rating: r.rating, date_added: r.dateAdded, basic_information: basic(r), notes };
}

function release(r: MockRecord): DiscogsRelease {
  const forSale = (r.id % 17) + 2;
  return {
    id: r.id,
    title: r.title,
    artists: artistRefs(r),
    year: r.year,
    released: r.released,
    labels: [{ id: 1, name: r.label, catno: r.catno }],
    companies: [
      { id: 2, name: 'Sample Pressing Plant', catno: '', entity_type_name: 'Pressed By' },
      { id: 3, name: 'Sample Mastering Studio', catno: '', entity_type_name: 'Lacquer Cut At' },
    ],
    formats: [{ name: 'Vinyl', qty: '1', descriptions: r.formats }],
    country: r.country,
    genres: r.genres,
    styles: r.styles,
    tracklist: tracks(r),
    extraartists: r.credits.map(([name, role], i) => ({ id: 7000 + i, name, anv: '', join: '', role, tracks: '' })),
    identifiers: [
      { type: 'Matrix / Runout', value: `${r.catno.replace(/\s/g, '')}-A`, description: 'Side A, stamped' },
      { type: 'Matrix / Runout', value: `${r.catno.replace(/\s/g, '')}-B`, description: 'Side B, stamped' },
      ...(r.year >= 1975 ? [{ type: 'Barcode', value: `07464${r.id}` }] : []),
    ],
    notes: 'Sample data for development. Release notes from Discogs appear here, such as pressing details and liner credits.',
    images: images(r),
    community: { have: 400 + (r.id % 900) * 7, want: 300 + (r.id % 500) * 5, rating: { count: 120 + (r.id % 300), average: 4 + (r.id % 9) / 10 } },
    master_id: r.master?.id,
    uri: `https://www.discogs.com/release/${r.id}`,
    resource_url: `https://api.discogs.com/releases/${r.id}`,
    lowest_price: Math.round(r.value * 0.7 * 100) / 100,
    num_for_sale: forSale,
  };
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const mockTransport: Transport = {
  async getJson(url) {
    await wait(60 + Math.random() * 60);
    const u = new URL(url.replace(/^https:\/\/api\.discogs\.com/, 'http://mock'));
    const p = u.pathname;
    let m: RegExpMatchArray | null;
    if (p === '/oauth/identity') return ok({ id: 1, username: MOCK_USER, resource_url: '', consumer_name: 'Crate' });
    if (p === `/users/${MOCK_USER}`) return ok({ id: 1, username: MOCK_USER, curr_abbr: 'USD', num_collection: MOCK_RECORDS.length });
    if (p.endsWith('/collection/folders')) {
      return ok({ folders: MOCK_FOLDERS.map((f) => ({
        ...f, resource_url: '', count: f.id === 0 ? MOCK_RECORDS.length : MOCK_RECORDS.filter((r) => r.folder === f.id).length,
      })) });
    }
    if (p.endsWith('/collection/fields')) return ok({ fields: MOCK_FIELDS });
    if (p.endsWith('/collection/value')) return ok({ minimum: '$612.40', median: '$941.75', maximum: '$1,488.20' });
    if ((m = p.match(/\/collection\/folders\/(\d+)\/releases$/))) {
      const folder = Number(m[1]);
      const all = MOCK_RECORDS.map(item).filter((it) => folder === 0 || it.folder_id === folder);
      const per = Number(u.searchParams.get('per_page') ?? 50);
      const page = Number(u.searchParams.get('page') ?? 1);
      return ok({
        pagination: { page, pages: Math.max(1, Math.ceil(all.length / per)), per_page: per, items: all.length, urls: {} },
        releases: all.slice((page - 1) * per, page * per),
      });
    }
    if ((m = p.match(/^\/releases\/(\d+)$/))) {
      const id = Number(m[1]);
      const r = MOCK_RECORDS.find((x) => x.id === id);
      if (r) return ok(release(r));
      const main = MOCK_RECORDS.find((x) => x.master && x.master.id + 200000 === id);
      if (main?.master) return ok({ ...release(main), id, year: main.master.year, released: main.master.released });
      return notFound();
    }
    if ((m = p.match(/^\/masters\/(\d+)$/))) {
      const r = MOCK_RECORDS.find((x) => x.master?.id === Number(m![1]));
      if (!r?.master) return notFound();
      return ok({ id: r.master.id, title: r.title, year: r.master.year, main_release: r.master.id + 200000,
        main_release_url: `https://api.discogs.com/releases/${r.master.id + 200000}`, uri: '' });
    }
    if ((m = p.match(/^\/marketplace\/price_suggestions\/(\d+)$/))) {
      const r = MOCK_RECORDS.find((x) => x.id === Number(m![1]));
      if (!r) return notFound();
      return ok(Object.fromEntries(CONDITIONS.map(([c, k]) => [c, { currency: 'USD', value: Math.round(r.value * k * 100) / 100 }])));
    }
    if ((m = p.match(/^\/marketplace\/stats\/(\d+)$/))) {
      const r = MOCK_RECORDS.find((x) => x.id === Number(m![1]));
      if (!r) return notFound();
      return ok({ lowest_price: { currency: 'USD', value: Math.round(r.value * 0.7 * 100) / 100 }, num_for_sale: (r.id % 17) + 2, blocked_from_sale: false });
    }
    return notFound();
  },
  async getBinary(url) {
    const m = url.match(/^mock:\/\/img\/(\d+)\/(\w+)$/);
    if (!m) throw new Error('Unknown mock image');
    const r = MOCK_RECORDS.find((x) => x.id === Number(m[1]));
    if (!r) throw new Error('Unknown mock image');
    return drawMockImage(r, m[2] as 'front' | 'back' | 'labelA' | 'labelB');
  },
};

export const isMockUser = (username: string) => username.trim().toLowerCase() === MOCK_USER;
