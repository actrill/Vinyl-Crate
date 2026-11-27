import { animate, motion, useDragControls, useMotionValue } from 'framer-motion';
import { ChevronUp } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Library, RecordView } from '../../db/records';
import { useBackHandler } from '../../state/hooks';
import { ShelfLine } from '../../ui/ShelfLine';
import { DetailsPanel } from './DetailsPanel';

type Snap = 'peek' | 'half' | 'full';
export const PEEK = 148;

/** Pull-up sheet styled like an LP's back-cover liner notes. */
export function DetailsSheet({ r, lib }: { r: RecordView; lib: Library }) {
  const [snap, setSnap] = useState<Snap>('peek');
  const [vh, setVh] = useState(() => window.innerHeight);
  const y = useMotionValue(window.innerHeight - 56 - PEEK); // start closed, so the sheet never flashes open
  const controls = useDragControls();
  const scroller = useRef<HTMLDivElement>(null);
  const H = vh - 56;
  const pos = useCallback((s: Snap) => (s === 'full' ? 0 : s === 'half' ? H * 0.42 : H - PEEK), [H]);

  useEffect(() => {
    const on = () => setVh(window.innerHeight);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  useEffect(() => {
    const a = animate(y, pos(snap), { type: 'spring', stiffness: 420, damping: 42 });
    if (snap === 'peek') scroller.current?.scrollTo({ top: 0 });
    return () => a.stop();
  }, [snap, pos, y]);

  useBackHandler(useCallback(() => { if (snap !== 'peek') { setSnap('peek'); return true; } return false; }, [snap]));

  const toggle = () => setSnap((s) => (s === 'peek' ? 'half' : 'peek'));

  return (
    <motion.section
      className={`details-sheet snap-${snap}`}
      style={{ y, height: H }}
      drag="y"
      dragControls={controls}
      dragListener={false}
      dragConstraints={{ top: 0, bottom: H - PEEK }}
      dragElastic={0.08}
      dragMomentum={false}
      onDragEnd={(_, info) => {
        const cur = y.get() + info.velocity.y * 0.15;
        const options: Snap[] = ['full', 'half', 'peek'];
        const best = options.reduce((a, b) => (Math.abs(pos(b) - cur) < Math.abs(pos(a) - cur) ? b : a));
        setSnap(best);
        void animate(y, pos(best), { type: 'spring', stiffness: 420, damping: 42 });
      }}
      aria-label="Record details"
    >
      <div className="sheet-head" onPointerDown={(e) => controls.start(e)}>
        <button className="sheet-grip" onClick={toggle} aria-expanded={snap !== 'peek'} aria-label={snap === 'peek' ? 'Show record details' : 'Hide record details'}>
          <span className="grip-bar" aria-hidden />
          <ChevronUp size={18} aria-hidden style={{ transform: snap === 'peek' ? undefined : 'rotate(180deg)' }} className="grip-chevron" />
        </button>
        <h1 className="liner-title">{r.title}</h1>
        <p className="liner-artist">{r.artist}</p>
        <div className="liner-shelf"><ShelfLine r={r} /></div>
      </div>
      <div ref={scroller} className="sheet-body" style={{ overflowY: snap === 'peek' ? 'hidden' : 'auto' }}
        onScroll={(e) => { if (snap === 'half' && e.currentTarget.scrollTop > 24) setSnap('full'); }}>
        <DetailsPanel r={r} lib={lib} />
      </div>
    </motion.section>
  );
}
