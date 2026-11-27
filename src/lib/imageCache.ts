import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { db } from '../db/db';

// Two sizes per image:
//  - 'thumb': 400 px, for grids and lists
//  - 'full': up to 1600 px, for 3D textures and the assign-images sheet
// On the phone, files live in the app's private data directory and are served
// to the WebView from the local origin. In the browser, blobs live in IndexedDB.

export type ImageSize = 'thumb' | 'full';
const MAX: Record<ImageSize, number> = { thumb: 400, full: 1600 };
const native = Capacitor.isNativePlatform();
const DIR = 'images';

let fetcher: ((url: string) => Promise<Blob>) | null = null;
export function setImageFetcher(f: ((url: string) => Promise<Blob>) | null) { fetcher = f; }

const keyFor = (url: string, size: ImageSize) => `${size}:${url}`;

function fileName(key: string): string {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return `${(h >>> 0).toString(36)}-${key.length}.jpg`;
}

const objectUrls = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();

async function resize(blob: Blob, max: number): Promise<Blob> {
  const bmp = await createImageBitmap(blob);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  if (scale === 1 && blob.type === 'image/jpeg') { bmp.close(); return blob; }
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('encode failed'))), 'image/jpeg', 0.86));
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let s = '';
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(s);
}

async function srcFromRow(key: string): Promise<string | null> {
  if (objectUrls.has(key)) return objectUrls.get(key)!;
  const row = await db.images.get(key);
  if (!row) return null;
  let src: string | null = null;
  if (row.path) {
    const { uri } = await Filesystem.getUri({ path: row.path, directory: Directory.Data });
    src = Capacitor.convertFileSrc(uri);
  } else if (row.blob) {
    src = URL.createObjectURL(row.blob);
  }
  if (src) objectUrls.set(key, src);
  return src;
}

async function store(key: string, blob: Blob): Promise<void> {
  if (native) {
    const path = `${DIR}/${fileName(key)}`;
    await Filesystem.writeFile({ path, data: await blobToBase64(blob), directory: Directory.Data, recursive: true });
    await db.images.put({ key, path, bytes: blob.size, createdAt: Date.now() });
  } else {
    await db.images.put({ key, blob, bytes: blob.size, createdAt: Date.now() });
  }
}

/** Download (once) and cache both sizes of an image. Returns the local src for `size`. */
export async function cacheImage(url: string, size: ImageSize = 'thumb'): Promise<string | null> {
  if (!url) return null;
  const key = keyFor(url, size);
  const existing = await srcFromRow(key);
  if (existing) return existing;
  if (inflight.has(key)) return inflight.get(key)!;
  const job = (async () => {
    if (!fetcher) return null;
    try {
      const original = await fetcher(url);
      const [full, thumb] = await Promise.all([resize(original, MAX.full), resize(original, MAX.thumb)]);
      await store(keyFor(url, 'full'), full);
      await store(keyFor(url, 'thumb'), thumb);
      return srcFromRow(key);
    } catch {
      return null;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, job);
  return job;
}

/** Local src if cached, without downloading. */
export function cachedImage(url: string, size: ImageSize): Promise<string | null> {
  return url ? srcFromRow(keyFor(url, size)) : Promise.resolve(null);
}

export async function imageCacheSize(): Promise<{ count: number; bytes: number }> {
  let bytes = 0;
  let count = 0;
  await db.images.each((r) => { bytes += r.bytes; count++; });
  return { count, bytes };
}

export async function clearImageCache(): Promise<void> {
  for (const u of objectUrls.values()) if (u.startsWith('blob:')) URL.revokeObjectURL(u);
  objectUrls.clear();
  await db.images.clear();
  if (native) {
    try { await Filesystem.rmdir({ path: DIR, directory: Directory.Data, recursive: true }); } catch { /* already gone */ }
  }
}
