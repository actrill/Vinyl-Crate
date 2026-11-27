import { Capacitor, CapacitorHttp } from '@capacitor/core';

export interface HttpResponse<T = unknown> {
  status: number;
  /** Header names are lower-cased. */
  headers: Record<string, string>;
  data: T;
}

export interface Transport {
  getJson(url: string, headers: Record<string, string>): Promise<HttpResponse>;
  getBinary(url: string, headers: Record<string, string>): Promise<Blob>;
}

export const API_BASE = 'https://api.discogs.com';
export const USER_AGENT = 'CrateVinylApp/1.0 (personal, read-only Discogs collection viewer)';

function lowerHeaders(h: Record<string, string> | Headers): Record<string, string> {
  const out: Record<string, string> = {};
  if (h instanceof Headers) h.forEach((v, k) => (out[k.toLowerCase()] = v));
  else for (const [k, v] of Object.entries(h ?? {})) out[k.toLowerCase()] = String(v);
  return out;
}

function base64ToBlob(b64: string, type = 'image/jpeg'): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

/** On the phone: native HTTP, so CORS never applies and User-Agent is honoured. */
export const nativeTransport: Transport = {
  async getJson(url, headers) {
    const res = await CapacitorHttp.get({
      url,
      headers: { ...headers, 'User-Agent': USER_AGENT, Accept: 'application/vnd.discogs.v2.discogs+json' },
      responseType: 'json',
      connectTimeout: 20000,
      readTimeout: 30000,
    });
    let data: unknown = res.data;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch { /* leave as text */ }
    }
    return { status: res.status, headers: lowerHeaders(res.headers), data };
  },
  async getBinary(url, headers) {
    const res = await CapacitorHttp.get({
      url,
      headers: { ...headers, 'User-Agent': USER_AGENT },
      responseType: 'blob',
      connectTimeout: 20000,
      readTimeout: 60000,
    });
    if (res.status >= 400) throw new Error(`Image request failed (${res.status})`);
    const type = lowerHeaders(res.headers)['content-type'] ?? 'image/jpeg';
    return base64ToBlob(String(res.data), type);
  },
};

/** In the desktop browser: route through the Vite dev proxy (see vite.config.ts). */
function toDevProxy(url: string): string {
  return url
    .replace(/^https:\/\/api\.discogs\.com/, '/discogs-api')
    .replace(/^https:\/\/i\.discogs\.com/, '/discogs-img');
}

export const webTransport: Transport = {
  async getJson(url, headers) {
    const res = await fetch(toDevProxy(url), { headers });
    const text = await res.text();
    let data: unknown = text;
    try { data = JSON.parse(text); } catch { /* not JSON */ }
    return { status: res.status, headers: lowerHeaders(res.headers), data };
  },
  async getBinary(url) {
    const res = await fetch(toDevProxy(url));
    if (!res.ok) throw new Error(`Image request failed (${res.status})`);
    return res.blob();
  },
};

export function defaultTransport(): Transport {
  return Capacitor.isNativePlatform() ? nativeTransport : webTransport;
}
