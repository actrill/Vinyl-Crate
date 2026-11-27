import type { DiscogsArtistRef } from '../api/types';
import { stripDisambiguation } from './sortName';

/** "Duke Ellington & John Coltrane", honouring each credit's anv and join. */
export function formatArtists(artists: Array<Pick<DiscogsArtistRef, 'name' | 'anv' | 'join'>>): string {
  return artists
    .map((a, i) => {
      const name = stripDisambiguation(a.anv || a.name);
      if (i === artists.length - 1) return name;
      const j = (a.join || ',').trim();
      return j === ',' ? `${name}, ` : `${name} ${j} `;
    })
    .join('')
    .trim();
}

/** "04 Modal, Post-Bop & Avant-Garde" -> "Modal, Post-Bop & Avant-Garde" for use in sentences. */
export function folderDisplayName(name: string): string {
  return name.replace(/^\d+\s*[-.:)]?\s+/, '');
}

export function formatPrice(value: number | null | undefined, currency: string | undefined): string {
  if (value === null || value === undefined) return '—';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency ?? ''}`.trim();
  }
}

export function relativeTime(ts: number | null | undefined, now = Date.now()): string {
  if (!ts) return 'never';
  const s = Math.round((now - ts) / 1000);
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  if (d < 30) return d === 1 ? 'yesterday' : `${d} days ago`;
  return new Date(ts).toLocaleDateString();
}

export function formatAddedDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

