// Dominant-colour extraction and WCAG contrast checks for the per-record accent.

export const BRASS = '#B8913E';

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [l1, l2] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [number, number];
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Use the extracted colour if it passes WCAG AA (4.5:1) on the background; otherwise brass. */
export function accessibleAccent(candidate: string | null | undefined, background: string, fallback = BRASS): string {
  if (!candidate) return fallback;
  return contrastRatio(candidate, background) >= 4.5 ? candidate : fallback;
}

/**
 * Dominant colour of an image: colours are bucketed, and each bucket is scored
 * by how often it appears and how saturated it is, so a vivid accent beats
 * large areas of near-black or near-white.
 */
export function dominantColor(data: Uint8ClampedArray): string | null {
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3]! < 128) continue;
    const r = data[i]!, g = data[i + 1]!, b = data[i + 2]!;
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const e = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    e.n++; e.r += r; e.g += g; e.b += b;
    buckets.set(key, e);
  }
  let best: { score: number; hex: string } | null = null;
  for (const e of buckets.values()) {
    const r = e.r / e.n, g = e.g / e.n, b = e.b / e.n;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    const light = (max + min) / 510;
    const score = e.n * (0.25 + sat) * (light > 0.08 && light < 0.95 ? 1 : 0.15);
    if (!best || score > best.score) best = { score, hex: rgbToHex(r, g, b) };
  }
  return best?.hex ?? null;
}

export async function extractDominantColor(src: string): Promise<string | null> {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = c.height = 48;
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0, 48, 48);
    return dominantColor(ctx.getImageData(0, 0, 48, 48).data);
  } catch {
    return null;
  }
}
