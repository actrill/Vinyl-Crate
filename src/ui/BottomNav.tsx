import { Library, Search, Settings } from 'lucide-react';
import { useApp, type Tab } from '../state/store';

const TABS: Array<{ id: Tab; label: string; Icon: typeof Library }> = [
  { id: 'library', label: 'Library', Icon: Library },
  { id: 'search', label: 'Search', Icon: Search },
  { id: 'settings', label: 'Settings', Icon: Settings },
];

export function BottomNav({ active }: { active: Tab }) {
  const setTab = useApp((s) => s.setTab);
  return (
    <nav className="bottom-nav" aria-label="Main">
      <div className="bottom-nav-inner">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} aria-current={active === id ? 'page' : undefined} onClick={() => setTab(id)}>
            <Icon size={22} strokeWidth={1.75} aria-hidden />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
