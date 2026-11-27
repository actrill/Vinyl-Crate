import { useEffect, useState } from 'react';
import * as THREE from 'three';
import type { RecordView } from '../../db/records';
import { imageForRole } from '../../db/records';
import { cacheImage, cachedImage } from '../../lib/imageCache';
import type { InspectorTextures } from '../inspector/Inspector';
import { DISC } from '../inspector/geometry';
import {
  cardboardBump, coverTexture, durationSeconds, grooveTextures, labelTexture, loadBitmap, plainBackTexture, trackBands,
} from '../inspector/textures';

async function localSrc(url: string | undefined): Promise<string | null> {
  if (!url) return null;
  return (await cachedImage(url, 'full')) ?? (await cacheImage(url, 'full')) ?? (url.startsWith('mock://') ? null : url);
}

function shade(hex: string, f: number): string {
  const c = new THREE.Color(hex);
  c.multiplyScalar(f);
  return `#${c.getHexString()}`;
}

/** Durations per side, from tracklist positions like "A1", "B2" (or numeric halves). */
export function sideDurations(r: RecordView): { A: number[]; B: number[] } {
  const tracks = (r.release?.tracklist ?? []).flatMap((t) => (t.sub_tracks?.length ? t.sub_tracks : [t])).filter((t) => t.type_ !== 'heading');
  const lettered = tracks.filter((t) => /^[A-Za-z]/.test(t.position));
  if (lettered.length) {
    const letters = [...new Set(lettered.map((t) => t.position[0]!.toUpperCase()))];
    const pick = (l?: string) => lettered.filter((t) => t.position[0]!.toUpperCase() === l).map((t) => durationSeconds(t.duration) || 240);
    return { A: pick(letters[0]), B: pick(letters[1]) };
  }
  const d = tracks.map((t) => durationSeconds(t.duration) || 240);
  const half = Math.ceil(d.length / 2);
  return { A: d.slice(0, half), B: d.slice(half) };
}

/** Builds (and disposes) every texture the inspector needs for one record. */
export function useRecordTextures(r: RecordView | undefined, baseColor: string | null): InspectorTextures | null {
  const [tex, setTex] = useState<InspectorTextures | null>(null);
  const roleKey = JSON.stringify(r?.local?.imageRoles ?? {});
  const releaseKey = r?.release ? r.releaseId : 0;

  useEffect(() => {
    if (!r) return;
    let alive = true;
    let made: InspectorTextures | null = null;
    void (async () => {
      await document.fonts.ready;
      const color = baseColor ?? '#5A3E2B';
      const urls = {
        front: imageForRole(r.release, r.local, 'front') ?? r.coverUrl,
        back: imageForRole(r.release, r.local, 'back'),
        labelA: imageForRole(r.release, r.local, 'labelA'),
        labelB: imageForRole(r.release, r.local, 'labelB'),
      };
      const [front = null, back = null, labelA = null, labelB = null] = await Promise.all(
        [urls.front, urls.back, urls.labelA, urls.labelB].map(async (u) => loadBitmap(await localSrc(u))),
      );
      if (!alive) { for (const b of [front, back, labelA, labelB]) b?.close(); return; }
      const sides = sideDurations(r);
      const innerFrac = DISC.grooveIn / DISC.grooveOut;
      const info = { label: r.label || 'Crate', catno: r.catno, title: r.title, artist: r.artist, color: shade(color, 0.9) };
      made = {
        front: coverTexture(front, { seed: r.releaseId, fallbackTitle: r.title, fallbackArtist: r.artist, color, maxAniso: 8 }),
        back: back ? coverTexture(back, { seed: r.releaseId + 1, fallbackTitle: '', fallbackArtist: '', color, maxAniso: 8 }) : null,
        labelA: labelTexture(labelA, { ...info, side: 'A' }, 8),
        labelB: labelTexture(labelB, { ...info, side: 'B' }, 8),
        groovesA: grooveTextures(trackBands(sides.A), innerFrac, r.releaseId),
        groovesB: grooveTextures(trackBands(sides.B), innerFrac, r.releaseId + 7),
        bump: cardboardBump(r.releaseId),
        edgeColor: shade(color, 0.75),
        backColor: '#E4DCCB',
      };
      if (!back) made.back = plainBackTexture('#E4DCCB', 8, r.releaseId);
      for (const b of [front, back, labelA, labelB]) b?.close();
      setTex(made);
    })();
    return () => {
      alive = false;
      if (made) {
        for (const t of [made.front, made.back, made.labelA, made.labelB, made.groovesA.normal, made.groovesA.aniso, made.groovesB.normal, made.groovesB.aniso, made.bump]) t?.dispose();
      }
      setTex(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r?.instanceId, releaseKey, roleKey, baseColor]);

  return tex;
}
