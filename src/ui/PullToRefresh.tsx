import { useRef, useState, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

const THRESHOLD = 72;

/** Pull down from the top of the list to sync. */
export function PullToRefresh({ onRefresh, busy, children, className }: { onRefresh: () => void; busy: boolean; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const start = useRef<number | null>(null);
  const [pull, setPull] = useState(0);

  return (
    <div
      ref={ref}
      className={className}
      onTouchStart={(e) => { start.current = ref.current && ref.current.scrollTop <= 0 ? e.touches[0]!.clientY : null; }}
      onTouchMove={(e) => {
        if (start.current === null) return;
        const dy = e.touches[0]!.clientY - start.current;
        setPull(dy > 0 ? Math.min(110, dy * 0.5) : 0);
      }}
      onTouchEnd={() => {
        if (pull >= THRESHOLD && !busy) onRefresh();
        start.current = null;
        setPull(0);
      }}
    >
      <div className="ptr" style={{ height: pull, opacity: Math.min(1, pull / THRESHOLD) }} aria-hidden>
        <RefreshCw size={20} style={{ transform: `rotate(${pull * 3}deg)` }} />
        <span className="small">{pull >= THRESHOLD ? 'Release to sync' : 'Pull to sync'}</span>
      </div>
      {children}
    </div>
  );
}
