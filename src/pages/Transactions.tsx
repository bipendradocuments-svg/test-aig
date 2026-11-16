import { Plus, ReceiptText, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ExpenseList } from '../components/ExpenseList';
import { TopHeader } from '../components/TopHeader';
import { useExpenseModal } from '../hooks/useExpenseModal';
import { useExpenses } from '../hooks/useExpenses';
import { useTags } from '../hooks/useTags';
import { useToast } from '../hooks/useToast';
import { cn } from '../lib/utils';
import {
  calculateTotalPaise,
  filterExpensesByDate,
  type TransactionDateFilter,
} from '../utils/analytics';
import { formatINR } from '../utils/currency';
import { getTodayLocalDate } from '../utils/date';

const DATE_FILTER_OPTIONS: Array<{ value: TransactionDateFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'year', label: 'This year' },
  { value: 'custom', label: 'Custom' },
];

export function Transactions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { openAddExpense, openEditExpense } = useExpenseModal();
  const { showToast } = useToast();
  const { expenses, removeExpense } = useExpenses();
  const { tags, tagsById } = useTags();

  const [query, setQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<TransactionDateFilter>(() => {
    const param = searchParams.get('date');
    if (param === 'week' || param === 'month' || param === 'year' || param === 'today') {
      return param;
    }
    return 'all';
  });
  const [customStart, setCustomStart] = useState(() => getTodayLocalDate());
  const [customEnd, setCustomEnd] = useState(() => getTodayLocalDate());

  const selectedTagKey = searchParams.get('tag') || 'all';

  const setSelectedTagKey = (nextTag: string) => {
    const next = new URLSearchParams(searchParams);
    if (nextTag === 'all') {
      next.delete('tag');
    } else {
      next.set('tag', nextTag);
    }
    setSearchParams(next, { replace: true });
  };

  const filteredExpenses = useMemo(() => {
    const byDate = filterExpensesByDate(expenses, dateFilter, undefined, {
      start: customStart,
      end: customEnd,
    });

    const trimmedQuery = query.trim().toLowerCase();

    return byDate.filter((exp) => {
      if (selectedTagKey === 'uncategorized') {
        if (exp.tagId && tagsById.has(exp.tagId)) return false;
      } else if (selectedTagKey !== 'all') {
        if (exp.tagId !== selectedTagKey) return false;
      }

      if (trimmedQuery) {
        const tagName = exp.tagId ? tagsById.get(exp.tagId)?.name || '' : 'uncategorized';
        const haystack = `${exp.description} ${tagName} ${exp.date}`.toLowerCase();
        if (!haystack.includes(trimmedQuery)) return false;
      }

      return true;
    });
  }, [expenses, dateFilter, customStart, customEnd, selectedTagKey, query, tagsById]);

  const filteredTotalPaise = useMemo(
    () => calculateTotalPaise(filteredExpenses),
    [filteredExpenses]
  );

  const hasActiveFilters =
    query.trim().length > 0 || dateFilter !== 'all' || selectedTagKey !== 'all';

  const resetFilters = () => {
    setQuery('');
    setDateFilter('all');
    setSearchParams({}, { replace: true });
  };

  const handleDelete = async (id: string) => {
    await removeExpense(id);
    showToast('Expense deleted');
  };

  return (
    <div className="space-y-4">
      <TopHeader title="Transactions" onAddExpense={openAddExpense} />

      {/* Search Bar */}
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
          strokeWidth={2}
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search expenses or tags..."
          aria-label="Search expenses"
          className="h-12 w-full rounded-pill border border-line bg-surface pl-11 pr-10 text-sm text-ink placeholder:text-ink-muted focus:border-ink focus:bg-white focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted hover:bg-canvas hover:text-ink"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Date Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar" role="tablist" aria-label="Filter by date">
        {DATE_FILTER_OPTIONS.map((opt) => {
          const isActive = dateFilter === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setDateFilter(opt.value)}
              className={cn(
                'h-9 shrink-0 rounded-pill px-4 text-[13px] font-medium transition-all',
                isActive
                  ? 'bg-ink text-white'
                  : 'border border-line/70 bg-surface text-ink hover:bg-white'
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Custom Date Range Inputs */}
      {dateFilter === 'custom' && (
        <div className="grid grid-cols-2 gap-3 rounded-[22px] border border-line bg-surface p-3.5">
          <div>
            <label
              htmlFor="filter-start-date"
              className="mb-1 block text-xs font-medium text-ink-muted"
            >
              From
            </label>
            <input
              id="filter-start-date"
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="h-10 w-full rounded-pill border border-line bg-white px-3.5 text-sm text-ink focus:border-ink focus:outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="filter-end-date"
              className="mb-1 block text-xs font-medium text-ink-muted"
            >
              To
            </label>
            <input
              id="filter-end-date"
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="h-10 w-full rounded-pill border border-line bg-white px-3.5 text-sm text-ink focus:border-ink focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Tag Filter Strip */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar" aria-label="Filter by tag">
        <button
          type="button"
          onClick={() => setSelectedTagKey('all')}
          className={cn(
            'h-8 shrink-0 rounded-pill px-3.5 text-xs font-medium transition',
            selectedTagKey === 'all'
              ? 'bg-lime text-ink font-semibold'
              : 'border border-line bg-white text-ink-muted hover:text-ink'
          )}
        >
          All Tags
        </button>

        {tags.map((tag) => (
          <button
            key={tag.id}
            type="button"
            onClick={() => setSelectedTagKey(tag.id)}
            className={cn(
              'h-8 shrink-0 rounded-pill px-3.5 text-xs font-medium transition',
              selectedTagKey === tag.id
                ? 'bg-lime text-ink font-semibold'
                : 'border border-line bg-white text-ink-muted hover:text-ink'
            )}
          >
            {tag.name}
          </button>
        ))}

        <button
          type="button"
          onClick={() => setSelectedTagKey('uncategorized')}
          className={cn(
            'h-8 shrink-0 rounded-pill px-3.5 text-xs font-medium transition',
            selectedTagKey === 'uncategorized'
              ? 'bg-lime text-ink font-semibold'
              : 'border border-line bg-white text-ink-muted hover:text-ink'
          )}
        >
          Uncategorized
        </button>
      </div>

      {/* Filtered Summary Bar */}
      <div className="flex items-center justify-between rounded-[22px] border border-line/70 bg-surface px-4 py-3">
        <div>
          <div className="text-xs text-ink-muted">
            {filteredExpenses.length}{' '}
            {filteredExpenses.length === 1 ? 'transaction' : 'transactions'}
          </div>
          <div className="text-xl font-semibold tracking-tight text-ink tabular-nums">
            {formatINR(filteredTotalPaise)}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="h-9 rounded-pill border border-line bg-white px-3.5 text-xs font-medium text-ink hover:bg-canvas"
            >
              Reset
            </button>
          )}
          <button
            type="button"
            onClick={openAddExpense}
            className="inline-flex h-9 items-center gap-1.5 rounded-pill bg-lime px-4 text-xs font-semibold text-ink hover:bg-lime-hover"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.3]" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Transactions List or Empty State */}
      {filteredExpenses.length === 0 ? (
        <div className="rounded-card border border-line/70 bg-surface px-6 py-12 text-center shadow-soft">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-canvas text-ink-muted">
            <ReceiptText className="h-5 w-5" strokeWidth={1.8} />
          </div>
          <h2 className="text-base font-semibold text-ink">
            {expenses.length === 0
              ? 'Your transaction history is empty'
              : 'No matching expenses'}
          </h2>
          <p className="mx-auto mt-1 max-w-xs text-sm text-ink-muted">
            {expenses.length === 0
              ? 'Record your daily expenses in INR and organize them with your own tags.'
              : 'Try adjusting your search text, tag selection, or date filter.'}
          </p>
          <div className="mt-5">
            {expenses.length === 0 ? (
              <button
                type="button"
                onClick={openAddExpense}
                className="inline-flex h-11 items-center gap-2 rounded-pill bg-lime px-6 text-sm font-semibold text-ink hover:bg-lime-hover"
              >
                <Plus className="h-4 w-4 stroke-[2.2]" />
                <span>Add First Expense</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex h-10 items-center rounded-pill bg-ink px-5 text-sm font-medium text-white hover:bg-ink-soft"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      ) : (
        <ExpenseList
          expenses={filteredExpenses}
          tagsById={tagsById}
          onSelectExpense={openEditExpense}
          onDeleteExpense={handleDelete}
          showQuickActions
        />
      )}
    </div>
  );
}
