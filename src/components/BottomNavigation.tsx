import { LayoutGrid, ReceiptText, Settings, Tags } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '../lib/utils';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutGrid, end: true },
  { to: '/transactions', label: 'Transactions', icon: ReceiptText, end: false },
  { to: '/tags', label: 'Tags', icon: Tags, end: false },
  { to: '/settings', label: 'Settings', icon: Settings, end: false },
];

export function BottomNavigation() {
  return (
    <nav
      aria-label="Bottom navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-safe backdrop-blur-md md:hidden"
    >
      <div className="mx-auto grid max-w-lg grid-cols-4 px-2 py-1.5">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-1 rounded-[16px] py-2 text-[11px] font-medium transition-colors',
                isActive ? 'text-ink font-semibold' : 'text-ink-muted hover:text-ink'
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    'flex h-7 w-12 items-center justify-center rounded-pill transition-colors',
                    isActive ? 'bg-lime text-ink' : 'bg-transparent'
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.2 : 1.8} />
                </span>
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
