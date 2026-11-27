import { motion } from 'framer-motion';
import { ArrowLeft, Disc3, Images, RefreshCw, RotateCcw, RotateCw, Undo2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Library } from '../../db/records';
import { accessibleAccent, BRASS, extractDominantColor } from '../../lib/color';
import { cachedImage } from '../../lib/imageCache';
import { useBackHandler, useReducedMotion } from '../../state/hooks';
import { useApp } from '../../state/store';
import { useImageSrc } from '../../ui/Cover';
import { FIT, Inspector, type InspectorControls, type Stage } from '../inspector/Inspector';
import { AssignImagesSheet } from './AssignImagesSheet';
import { DetailsSheet } from './DetailsSheet';
import { useRecordTextures } from './useRecordTextures';
import './record.css';

const LINER_BG = '#ECE5D5';

export default function RecordScreen({ instanceId, lib }: { instanceId: number; lib: Library }) {
  const r = lib.byInstance.get(instanceId);
  const back = useApp((s) => s.back);
  const theme = useApp((s) => s.settings.theme);
  const reduced = useReducedMotion();
  const [raw, setRaw] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [stage, setStage] = useState<Stage>('jacket');
  const [discSide, setDiscSide] = useState<'A' | 'B'>('A');
  const [assignOpen, setAssignOpen] = useState(false);
  const controls = useRef<InspectorControls | null>(null);
  const area = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const thumb = useImageSrc(r?.coverUrl, 'thumb');

  // Each record gets its own accent from its cover art, checked for contrast.
  useEffect(() => {
    let alive = true;
    if (!r) return;
    void (async () => {
      const src = (await cachedImage(r.coverUrl, 'thumb')) ?? null;
      const c = src ? await extractDominantColor(src) : null;
      if (alive) setRaw(c);
    })();
    return () => { alive = false; };
  }, [r?.coverUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e!.contentRect.width, h: e!.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const tex = useRecordTextures(r, raw);
  useEffect(() => { if (!tex) setReady(false); }, [tex]);
  const onReady = useCallback(() => setReady(true), []);

  useBackHandler(useCallback(() => { if (assignOpen) { setAssignOpen(false); return true; } return false; }, [assignOpen]));

  if (!r) {
    return (
      <div className="record-screen">
        <header className="record-top"><button className="icon-btn" onClick={back} aria-label="Back"><ArrowLeft size={22} aria-hidden /></button></header>
        <p className="empty">This record is no longer in your collection on Discogs.</p>
      </div>
    );
  }

  const bg = theme === 'light' ? '#E9E2D2' : '#2A2D31';
  const accent = accessibleAccent(raw, bg, theme === 'light' ? '#7A5A1A' : BRASS);
  const linerAccent = accessibleAccent(raw, LINER_BG, '#7A5A1A');
  const side = box ? FIT * Math.min(box.w, box.h) : 0;

  return (
    <motion.div
      className="record-screen"
      style={{ '--accent': accent, '--liner-accent': linerAccent, '--glow': raw ?? BRASS } as React.CSSProperties}
      initial={{ opacity: 0.6 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
    >
      <div className="record-glow" aria-hidden />
      <header className="record-top">
        <button className="icon-btn raised" onClick={back} aria-label="Back"><ArrowLeft size={22} aria-hidden /></button>
        <div className="grow" />
        <button className="icon-btn raised" onClick={() => setAssignOpen(true)} aria-label="Assign images: choose front, back and label images">
          <Images size={22} aria-hidden />
        </button>
      </header>

      <div className="stage-area" ref={area}>
        {tex && <Inspector tex={tex} light={theme === 'light'} reduced={reduced} controlsRef={controls} onStage={(st) => { setStage(st); if (st === 'jacket') setDiscSide('A'); }} onReady={onReady} />}
        {box && (
          <motion.div
            layoutId={`cover-${r.instanceId}`}
            className="cover stage-placeholder"
            style={{ width: side, height: side, left: (box.w - side) / 2, top: (box.h - side) / 2 }}
            animate={{ opacity: ready ? 0 : 1 }}
            exit={{ opacity: 1 }}
            transition={{ layout: { type: 'spring', stiffness: 320, damping: 34 }, opacity: { duration: 0.25, delay: ready ? 0.1 : 0 } }}
            aria-hidden
          >
            {thumb && <img src={thumb} alt="" />}
          </motion.div>
        )}
        <p className="sr-only" aria-live="polite">{stage === 'disc' ? 'Record out of its sleeve. Drag in a circle to spin it.' : 'Record jacket. Drag to turn it over.'}</p>
      </div>

      <div className="inspector-controls" role="toolbar" aria-label="Inspect the record">
        {reduced && stage === 'jacket' && (
          <div className="turn-row">
            <button className="icon-btn raised" onClick={() => controls.current?.turn(-1)} aria-label="Turn left"><RotateCcw size={20} aria-hidden /></button>
            <button className="icon-btn raised" onClick={() => controls.current?.turn(1)} aria-label="Turn right"><RotateCw size={20} aria-hidden /></button>
          </div>
        )}
        <button className="btn" onClick={() => { if (stage === 'disc') setDiscSide((d) => (d === 'A' ? 'B' : 'A')); controls.current?.flip(); }}>
          <RefreshCw size={18} aria-hidden /> {stage === 'disc' ? `Flip to side ${discSide === 'A' ? 'B' : 'A'}` : 'Flip over'}
        </button>
        <button className="btn primary" onClick={() => { setDiscSide('A'); controls.current?.toggleRecord(); }}>
          {stage === 'disc' ? <><Undo2 size={18} aria-hidden /> Put back</> : <><Disc3 size={18} aria-hidden /> Take out record</>}
        </button>
      </div>

      <DetailsSheet r={r} lib={lib} />
      {assignOpen && <AssignImagesSheet r={r} onClose={() => setAssignOpen(false)} />}
    </motion.div>
  );
}
