import { Plus, ReceiptText } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExpenseModal } from '../hooks/useExpenseModal';
import { CategoryChart } from '../components/CategoryChart';
import { ExpenseList } from '../components/ExpenseList';
import { SummaryCard } from '../components/SummaryCard';
import { TopHeader } from '../components/TopHeader';
import { useExpenses } from '../hooks/useExpenses';
import { useTags } from '../hooks/useTags';
import { cn } from '../lib/utils';
import {
  calculateTotalPaise,
  computeCategoryBreakdown,
  countUniqueTagsUsed,
  type DashboardPeriod,
  filterExpensesByDate,
} from '../utils/analytics';

const PERIOD_OPTIONS: Array<{ value: DashboardPeriod; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
];

export function Dashboard() {
  const navigate = useNavigate();
  const { openAddExpense, openEditExpense } = useExpenseModal();
  const { expenses, removeExpense } = useExpenses();
  const { tags, tagsById } = useTags();

  const [period, setPeriod] = useState<DashboardPeriod>('all');

  const filteredExpenses = useMemo(
    () => filterExpensesByDate(expenses, period),
    [expenses, period]
  );

  const totalPaise = useMemo(
    () => calculateTotalPaise(filteredExpenses),
    [filteredExpenses]
  );

  const validTagIds = useMemo(() => new Set(tags.map((t) => t.id)), [tags]);

  const categoriesUsedCount = useMemo(
    () => countUniqueTagsUsed(filteredExpenses, validTagIds),
    [filteredExpenses, validTagIds]
  );

  const categoryBreakdown = useMemo(
    () => computeCategoryBreakdown(filteredExpenses, tags),
    [filteredExpenses, tags]
  );

  const recentExpenses = useMemo(
    () => filteredExpenses.slice(0, 5),
    [filteredExpenses]
  );

  const cyclePeriod = () => {
    const idx = PERIOD_OPTIONS.findIndex((p) => p.value === period);
    const next = PERIOD_OPTIONS[(idx + 1) % PERIOD_OPTIONS.length];
    setPeriod(next.value);
  };

  return (
    <div className="space-y-5">
      <TopHeader title="My Expenses" onAddExpense={openAddExpense} />

      {/* Time Filter Pills (All / Week / Month / Year) */}
      <div
        role="tablist"
        aria-label="Time period filter"
        className="grid grid-cols-4 gap-2"
      >
        {PERIOD_OPTIONS.map((opt) => {
          const isActive = period === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setPeriod(opt.value)}
              className={cn(
                'h-10 rounded-pill text-[14px] font-medium transition-all',
                isActive
                  ? 'bg-ink text-white shadow-soft'
                  : 'border border-line/60 bg-surface text-ink hover:bg-white'
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Spending Summary Card */}
      <SummaryCard
        totalPaise={totalPaise}
        categoriesCount={categoriesUsedCount}
        onOpenInsights={() => navigate('/insights')}
      />

      {/* Signature Neon-Lime Category Spending Card */}
      <CategoryChart
        items={categoryBreakdown}
        onOpenInsights={() => navigate('/insights')}
        onCyclePeriod={cyclePeriod}
      />

      {/* Recent Expenses Section */}
      <section aria-label="Recent expenses" className="pt-1">
        <div className="mb-3 flex items-center justify-between px-0.5">
          <h2 className="text-[17px] font-semibold tracking-tight text-ink">
            Recent Expenses
          </h2>
          <button
            type="button"
            onClick={() => navigate('/transactions')}
            className="text-[13px] font-medium text-ink-muted transition hover:text-ink"
          >
            View all
          </button>
        </div>

        {recentExpenses.length === 0 ? (
          <div className="rounded-card border border-line/70 bg-surface px-6 py-9 text-center shadow-soft">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-canvas text-ink-muted">
              <ReceiptText className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <p className="text-[15px] font-medium text-ink">
              {expenses.length === 0
                ? 'No expenses recorded yet'
                : 'No expenses in this period'}
            </p>
            <p className="mt-1 text-[13px] text-ink-muted">
              Tap Add Expense below to log a daily spend in seconds.
            </p>
          </div>
        ) : (
          <ExpenseList
            expenses={recentExpenses}
            tagsById={tagsById}
            onSelectExpense={openEditExpense}
            onDeleteExpense={removeExpense}
          />
        )}
      </section>

      {/* Prominent Neon-Lime Add Expense CTA */}
      <div className="pt-1">
        <button
          type="button"
          onClick={openAddExpense}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-pill bg-lime text-[16px] font-semibold text-ink shadow-soft transition hover:bg-lime-hover active:scale-[0.99]"
        >
          <Plus className="h-5 w-5 stroke-[2.2]" />
          <span>Add Expense</span>
        </button>
      </div>
    </div>
  );
}
