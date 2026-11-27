import * as THREE from 'three';

// All inspector textures are built here at a capped size (covers 1024 px,
// labels 512 px, groove maps 1024 px) and are disposed by the caller when the
// inspector closes.

export const COVER_SIZE = 1024;
export const LABEL_SIZE = 512;
/** Fraction of the groove ring (from the inside) that is smooth run-out. */
const RUNOUT = 0.2;

export async function loadBitmap(src: string | null | undefined): Promise<ImageBitmap | null> {
  if (!src) return null;
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    return await createImageBitmap(await res.blob());
  } catch {
    return null;
  }
}

function canvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return [c, c.getContext('2d')!];
}

function rng(seed: number) {
  let s = (seed % 2147483646) + 1;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

function finish(c: HTMLCanvasElement, maxAniso: number, srgb = true): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(8, maxAniso);
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.needsUpdate = true;
  return t;
}

/** Draw `img` to fill a square (centre crop). */
function drawCover(ctx: CanvasRenderingContext2D, img: ImageBitmap, size: number, inset = 1) {
  const s = Math.min(img.width, img.height) * inset;
  ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
}

/** Paper grain and worn edges, so the jacket reads as printed cardboard. */
function ageSurface(ctx: CanvasRenderingContext2D, size: number, seed: number) {
  const r = rng(seed);
  // Fine grain.
  const grain = ctx.getImageData(0, 0, size, size);
  const d = grain.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * 10;
    d[i] = d[i]! + n; d[i + 1] = d[i + 1]! + n; d[i + 2] = d[i + 2]! + n;
  }
  ctx.putImageData(grain, 0, 0);
  // Edge wear: faint, fibrous scuffs hugging the edges, a little heavier at the corners.
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.lineCap = 'round';
  for (let i = 0; i < 220; i++) {
    const side = Math.floor(r() * 4);
    const t = r() * size;
    const inset = Math.pow(r(), 4) * size * 0.012;
    const len = 2 + r() * size * 0.02;
    ctx.strokeStyle = `rgba(236,228,210,${0.03 + r() * 0.08})`;
    ctx.lineWidth = 0.6 + r() * 1.6;
    ctx.beginPath();
    if (side === 0) { ctx.moveTo(t, inset); ctx.lineTo(t + len, inset + (r() - 0.5) * 2); }
    else if (side === 1) { ctx.moveTo(t, size - inset); ctx.lineTo(t + len, size - inset + (r() - 0.5) * 2); }
    else if (side === 2) { ctx.moveTo(inset, t); ctx.lineTo(inset + (r() - 0.5) * 2, t + len); }
    else { ctx.moveTo(size - inset, t); ctx.lineTo(size - inset + (r() - 0.5) * 2, t + len); }
    ctx.stroke();
  }
  for (const [x, y] of [[0, 0], [size, 0], [0, size], [size, size]] as const) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, size * 0.035);
    g.addColorStop(0, 'rgba(236,228,210,0.22)');
    g.addColorStop(1, 'rgba(236,228,210,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - size * 0.035, y - size * 0.035, size * 0.07, size * 0.07);
  }
  ctx.restore();
  // Soft ring wear where the record has pressed through the jacket over the years.
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.028)';
  ctx.lineWidth = size * 0.012;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.47, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function coverTexture(img: ImageBitmap | null, opts: { seed: number; fallbackTitle: string; fallbackArtist: string; color: string; maxAniso: number }): THREE.CanvasTexture {
  const [c, ctx] = canvas(COVER_SIZE);
  if (img) {
    drawCover(ctx, img, COVER_SIZE);
  } else {
    // No image: a plain printed jacket with the title.
    ctx.fillStyle = opts.color;
    ctx.fillRect(0, 0, COVER_SIZE, COVER_SIZE);
    ctx.fillStyle = '#E9E2D2';
    ctx.font = '600 84px Jost, sans-serif';
    let y = 640;
    for (const line of wrapLines(ctx, opts.fallbackTitle, COVER_SIZE - 140).slice(0, 3)) { ctx.fillText(line, 70, y); y += 92; }
    ctx.font = '400 48px Jost, sans-serif';
    ctx.fillText(opts.fallbackArtist, 70, Math.min(960, y + 30));
  }
  ageSurface(ctx, COVER_SIZE, opts.seed);
  return finish(c, opts.maxAniso);
}

/** Plain back for jackets without a back-cover image. */
export function plainBackTexture(color: string, maxAniso: number, seed: number): THREE.CanvasTexture {
  const [c, ctx] = canvas(512);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 512, 512);
  ageSurface(ctx, 512, seed);
  return finish(c, maxAniso);
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const w of text.split(/\s+/)) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

export interface LabelInfo { label: string; catno: string; title: string; artist: string; side: 'A' | 'B'; color: string }

/**
 * Centre label. Uses the Discogs label photo when there is one (centre-cropped
 * to the paper label), otherwise prints a clean label with the label name,
 * catalogue number and side.
 */
export function labelTexture(img: ImageBitmap | null, info: LabelInfo, maxAniso: number): THREE.CanvasTexture {
  const S = LABEL_SIZE;
  const [c, ctx] = canvas(S);
  ctx.save();
  ctx.beginPath();
  ctx.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2);
  ctx.clip();
  if (img) {
    // Label photos usually show some vinyl around the paper; crop in a little.
    drawCover(ctx, img, S, 0.9);
  } else {
    ctx.fillStyle = info.color;
    ctx.fillRect(0, 0, S, S);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(S / 2, S / 2, S * 0.46, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#F3EEE3';
    ctx.textAlign = 'center';
    ctx.font = `600 ${S * 0.085}px Jost, sans-serif`;
    ctx.fillText(info.label.slice(0, 24), S / 2, S * 0.27);
    ctx.font = `400 ${S * 0.05}px Jost, sans-serif`;
    ctx.fillText(info.catno, S / 2, S * 0.345);
    ctx.font = `500 ${S * 0.06}px Jost, sans-serif`;
    let y = S * 0.66;
    for (const line of wrapLines(ctx, info.title, S * 0.62).slice(0, 2)) { ctx.fillText(line, S / 2, y); y += S * 0.07; }
    ctx.font = `400 ${S * 0.045}px Jost, sans-serif`;
    ctx.fillText(info.artist.slice(0, 40), S / 2, y + S * 0.01);
    ctx.font = `600 ${S * 0.055}px Jost, sans-serif`;
    ctx.fillText(`Side ${info.side}`, S * 0.78, S * 0.52);
  }
  ctx.restore();
  // Spindle hole edge.
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.beginPath(); ctx.arc(S / 2, S / 2, S * 0.036, 0, Math.PI * 2); ctx.fill();
  return finish(c, maxAniso);
}

/**
 * Groove maps for one side. Radial ripples in a tangent-space normal map make
 * light catch the grooves; quiet bands between tracks (from the tracklist
 * durations) come out as the smooth, shinier rings you see on a real LP.
 * The anisotropy map points along the grooves so highlights stretch around the disc.
 */
export function grooveTextures(bands: number[], innerFrac: number, seed: number, size = 1024): { normal: THREE.DataTexture; aniso: THREE.DataTexture } {
  const n = new Uint8Array(size * size * 4);
  const a = new Uint8Array(size * size * 4);
  const r = rng(seed);
  const ringAmp = Array.from({ length: 512 }, () => 0.55 + r() * 0.45);
  const RINGS = 70;
  for (let j = 0; j < size; j++) {
    const y = (j + 0.5) / size * 2 - 1;
    for (let i = 0; i < size; i++) {
      const x = (i + 0.5) / size * 2 - 1;
      const rad = Math.sqrt(x * x + y * y) || 1e-6;
      const k = (j * size + i) * 4;
      const u = (rad - innerFrac) / (1 - innerFrac); // 0 at run-out, 1 at the edge
      let slope = 0;
      let strength = 1;
      if (u >= 0 && u <= 1) {
        let gap = u < RUNOUT || u > 0.985;
        for (const b of bands) if (Math.abs(u - b) < 0.008) gap = true;
        if (gap) {
          strength = 0.25;
          slope = 0;
        } else {
          const ph = u * RINGS * Math.PI * 2;
          const amp = ringAmp[Math.floor(u * 511)]!;
          slope = Math.cos(ph) * 0.55 * amp + Math.cos(ph * 3.1) * 0.12;
        }
      } else {
        strength = 0;
      }
      // normal = normalize(-dh/dx, -dh/dy, 1), with dh/dr = slope
      const nx = -slope * (x / rad);
      const ny = -slope * (y / rad);
      const inv = 1 / Math.sqrt(nx * nx + ny * ny + 1);
      n[k] = (nx * inv * 0.5 + 0.5) * 255;
      n[k + 1] = (ny * inv * 0.5 + 0.5) * 255;
      n[k + 2] = (inv * 0.5 + 0.5) * 255;
      n[k + 3] = 255;
      // Anisotropy direction: tangential (-y, x)/r, encoded in [0,1].
      a[k] = (-y / rad * 0.5 + 0.5) * 255;
      a[k + 1] = (x / rad * 0.5 + 0.5) * 255;
      a[k + 2] = strength * 255;
      a[k + 3] = 255;
    }
  }
  const mk = (data: Uint8Array) => {
    const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.colorSpace = THREE.NoColorSpace;
    t.needsUpdate = true;
    return t;
  };
  return { normal: mk(n), aniso: mk(a) };
}

/** Where the quiet bands between tracks fall, as 0–1 positions from run-out to edge. */
export function trackBands(durations: number[]): number[] {
  const total = durations.reduce((s, d) => s + d, 0);
  if (durations.length < 2 || total <= 0) return [];
  const bands: number[] = [];
  let acc = 0;
  // Tracks are cut from the outside in; groove pitch is roughly constant.
  for (let i = 0; i < durations.length - 1; i++) {
    acc += durations[i]!;
    bands.push(0.985 - (acc / total) * (0.985 - RUNOUT));
  }
  return bands.map((b) => Math.max(RUNOUT + 0.01, Math.min(0.98, b)));
}

/** Cardboard grain used as a bump map on the jacket. */
export function cardboardBump(seed: number): THREE.CanvasTexture {
  const S = 256;
  const [c, ctx] = canvas(S);
  const img = ctx.createImageData(S, S);
  const r = rng(seed);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (r() - 0.5) * 60;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  ctx.globalAlpha = 0.25;
  ctx.drawImage(c, 1, 0); // slight horizontal fibre smear
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 4);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

/** Parse "9:22" into seconds. */
export function durationSeconds(d: string | undefined): number {
  if (!d) return 0;
  const parts = d.split(':').map(Number);
  if (parts.some((p) => !Number.isFinite(p))) return 0;
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}
