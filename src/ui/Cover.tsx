import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { cacheImage, cachedImage, type ImageSize } from '../lib/imageCache';

/** Resolve a Discogs image URL to a cached local src, downloading it if needed. */
export function useImageSrc(url: string | undefined, size: ImageSize = 'thumb'): string | null {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setSrc(null);
    if (!url) return;
    void (async () => {
      const local = (await cachedImage(url, size)) ?? (await cacheImage(url, size));
      if (!alive) return;
      // Fall back to the remote URL (works online, in the browser and on the phone).
      setSrc(local ?? (url.startsWith('mock://') ? null : url));
    })();
    return () => { alive = false; };
  }, [url, size]);
  return src;
}

interface CoverProps {
  url?: string;
  alt: string;
  fallback: string;
  size?: ImageSize;
  layoutId?: string;
  className?: string;
}

export function Cover({ url, alt, fallback, size = 'thumb', layoutId, className }: CoverProps) {
  const src = useImageSrc(url, size);
  return (
    <motion.div layoutId={layoutId} className={`cover ${className ?? ''}`} transition={{ type: 'spring', stiffness: 380, damping: 38 }}>
      {src ? <img src={src} alt={alt} loading="lazy" decoding="async" draggable={false} /> : <div className="cover-fallback" aria-label={alt}>{fallback}</div>}
    </motion.div>
  );
}
