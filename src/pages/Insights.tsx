import { ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExpenseModal } from '../hooks/useExpenseModal';
import { TagIcon } from '../components/TagIcon';
import { TimeSeriesChart } from '../components/TimeSeriesChart';
import { TopHeader } from '../components/TopHeader';
import { useExpenses } from '../hooks/useExpenses';
import { useTags } from '../hooks/useTags';
import { cn } from '../lib/utils';
import {
  calculateTotalPaise,
  computeCategoryBreakdown,
  computeInsightsTimeSeries,
  filterExpensesByDate,
  type InsightsPeriod,
} from '../utils/analytics';
import { formatINR } from '../utils/currency';
import { addLocalDays, formatPeriodLabel } from '../utils/date';

const INSIGHTS_TABS: Array<{ value: InsightsPeriod; label: string }> = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
];

export function Insights() {
  const navigate = useNavigate();
  const { openAddExpense } = useExpenseModal();
  const { expenses } = useExpenses();
  const { tags } = useTags();

  const [period, setPeriod] = useState<InsightsPeriod>('month');
  const [anchorDate, setAnchorDate] = useState<Date>(() => new Date());

  const shiftPeriod = (direction: -1 | 1) => {
    setAnchorDate((prev) => {
      if (period === 'week') {
        return addLocalDays(prev, direction * 7);
      }
      if (period === 'month') {
        return new Date(prev.getFullYear(), prev.getMonth() + direction, 1);
      }
      return new Date(prev.getFullYear() + direction, prev.getMonth(), 1);
    });
  };

  const periodExpenses = useMemo(
    () => filterExpensesByDate(expenses, period, anchorDate),
    [expenses, period, anchorDate]
  );

  const periodTotalPaise = useMemo(
    () => calculateTotalPaise(periodExpenses),
    [periodExpenses]
  );

  const timeSeries = useMemo(
    () => computeInsightsTimeSeries(expenses, period, anchorDate),
    [expenses, period, anchorDate]
  );

  const categoryBreakdown = useMemo(
    () => computeCategoryBreakdown(periodExpenses, tags),
    [periodExpenses, tags]
  );

  const periodSubtitle = useMemo(
    () => formatPeriodLabel(period, anchorDate),
    [period, anchorDate]
  );

  return (
    <div className="space-y-5">
      <TopHeader
        title="Insights"
        onBack={() => navigate('/')}
        onAddExpense={openAddExpense}
      />

      {/* Week / Month / Year Pill Selector matching Screen 3 */}
      <div
        role="tablist"
        aria-label="Insights period"
        className="mx-auto grid max-w-sm grid-cols-3 gap-2 rounded-pill bg-surface p-1 border border-line/70"
      >
        {INSIGHTS_TABS.map((tab) => {
          const isActive = period === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => {
                setPeriod(tab.value);
                setAnchorDate(new Date());
              }}
              className={cn(
                'h-10 rounded-pill text-[14px] font-medium transition-all',
                isActive ? 'bg-ink text-white shadow-soft' : 'text-ink hover:bg-white/70'
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Period Total Card matching Screen 3 */}
      <section
        aria-label="Period spending summary"
        className="flex items-center justify-between rounded-card border border-line/70 bg-surface px-5 py-4 shadow-soft"
      >
        <div>
          <div className="text-[32px] font-semibold tracking-tight text-ink tabular-nums leading-tight">
            {formatINR(periodTotalPaise)}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[13px] text-ink-muted">
            <button
              type="button"
              onClick={() => shiftPeriod(-1)}
              className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-canvas hover:text-ink"
              aria-label="Previous period"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-medium">{periodSubtitle}</span>
            <button
              type="button"
              onClick={() => shiftPeriod(1)}
              className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-canvas hover:text-ink"
              aria-label="Next period"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate(`/transactions?date=${period}`)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-lime text-ink transition hover:bg-lime-hover active:scale-95"
          aria-label="View transactions for this period"
        >
          <ArrowUpRight className="h-5 w-5" strokeWidth={2} />
        </button>
      </section>

      {/* Neon-Lime Recharts Spending Over Time Card */}
      <TimeSeriesChart data={timeSeries} />

      {/* Category Breakdown List matching Screen 3 */}
      <section aria-label="Category breakdown" className="pt-1">
        <h2 className="mb-3.5 px-0.5 text-[17px] font-semibold tracking-tight text-ink">
          Category Breakdown
        </h2>

        {categoryBreakdown.length === 0 ? (
          <div className="rounded-card border border-line/70 bg-surface px-6 py-8 text-center shadow-soft">
            <p className="text-[15px] font-medium text-ink">
              No spending recorded for {periodSubtitle}
            </p>
            <p className="mt-1 text-[13px] text-ink-muted">
              Expenses recorded in this period will automatically appear here by tag.
            </p>
          </div>
        ) : (
          <div className="space-y-4 rounded-card border border-line/70 bg-surface p-5 shadow-soft">
            {categoryBreakdown.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() =>
                  navigate(
                    `/transactions?tag=${encodeURIComponent(item.key)}`
                  )
                }
                className="flex w-full items-center gap-3.5 text-left transition hover:opacity-85 focus:outline-none"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ECECE2] text-ink">
                  <TagIcon tagName={item.name} />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex items-baseline justify-between gap-2">
                    <span className="truncate text-[15px] font-medium text-ink">
                      {item.name}
                    </span>
                    <span className="shrink-0 text-[14px] tabular-nums">
                      <strong className="font-semibold text-ink">
                        {formatINR(item.amountPaise)}
                      </strong>
                      <span className="ml-2.5 text-[13px] text-ink-muted">
                        {item.percentage}%
                      </span>
                    </span>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-pill bg-[#E7E7DD]">
                    <div
                      className="h-full rounded-pill bg-lime transition-all duration-300"
                      style={{ width: `${Math.max(4, item.percentage)}%` }}
                    />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
