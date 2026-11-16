import {
  BarChart3,
  LayoutGrid,
  Plus,
  ReceiptText,
  Settings,
  Tags,
} from 'lucide-react';
import React, { useCallback, useState } from 'react';
import { NavLink } from 'react-router-dom';
import type { ExpenseRecord } from '../db/database';
import { ExpenseModalContext } from '../hooks/useExpenseModal';
import { cn } from '../lib/utils';
import { BottomNavigation } from './BottomNavigation';
import { ExpenseFormModal } from './ExpenseForm';

const DESKTOP_NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutGrid, end: true },
  { to: '/transactions', label: 'Transactions', icon: ReceiptText, end: false },
  { to: '/insights', label: 'Insights', icon: BarChart3, end: false },
  { to: '/tags', label: 'Tags', icon: Tags, end: false },
  { to: '/settings', label: 'Settings', icon: Settings, end: false },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);

  const openAddExpense = useCallback(() => {
    setEditingExpense(null);
    setModalOpen(true);
  }, []);

  const openEditExpense = useCallback((expense: ExpenseRecord) => {
    setEditingExpense(expense);
    setModalOpen(true);
  }, []);

  return (
    <ExpenseModalContext.Provider value={{ openAddExpense, openEditExpense }}>
      <div className="min-h-[100dvh] bg-canvas text-ink md:flex">
        {/* Desktop Sidebar */}
        <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:flex md:w-64 md:flex-col md:border-r md:border-line md:bg-surface md:px-5 md:py-7">
          <div className="mb-8 flex items-center gap-3 px-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-lime text-lg font-bold text-ink">
              ₹
            </span>
            <div>
              <div className="text-base font-semibold tracking-tight text-ink">
                My Expenses
              </div>
              <div className="text-xs text-ink-muted">Local &amp; Offline</div>
            </div>
          </div>

          <button
            type="button"
            onClick={openAddExpense}
            className="mb-6 flex h-12 w-full items-center justify-center gap-2 rounded-pill bg-lime text-sm font-semibold text-ink shadow-soft transition hover:bg-lime-hover active:scale-[0.99]"
          >
            <Plus className="h-4 w-4 stroke-[2.3]" />
            <span>Add Expense</span>
          </button>

          <nav aria-label="Sidebar navigation" className="space-y-1.5">
            {DESKTOP_NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-pill px-4 py-3 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-ink text-white'
                      : 'text-ink-muted hover:bg-canvas hover:text-ink'
                  )
                }
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto rounded-[20px] border border-line bg-canvas p-4 text-xs text-ink-muted leading-relaxed">
            Stored 100% locally in your browser’s IndexedDB. Works offline without an account.
          </div>
        </aside>

        {/* Main Responsive Content Container */}
        <div className="flex-1 md:pl-64">
          <main className="mx-auto w-full max-w-xl px-4 pb-28 md:max-w-3xl md:px-8 md:py-6 md:pb-12">
            {children}
          </main>
        </div>

        {/* Mobile Fixed Bottom Navigation */}
        <BottomNavigation />

        {/* Global Add / Edit Expense Sheet */}
        <ExpenseFormModal
          open={modalOpen}
          initialExpense={editingExpense}
          onClose={() => setModalOpen(false)}
        />
      </div>
    </ExpenseModalContext.Provider>
  );
}
