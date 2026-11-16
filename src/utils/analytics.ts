import type { ExpenseRecord, TagRecord } from '../db/database';
import {
  addLocalDays,
  getMonthDateRange,
  getTodayLocalDate,
  getWeekDateRange,
  getYearDateRange,
  parseLocalDateString,
  toLocalDateString,
} from './date';

export type DashboardPeriod = 'all' | 'week' | 'month' | 'year';
export type TransactionDateFilter = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';
export type InsightsPeriod = 'week' | 'month' | 'year';

export interface CategoryBreakdownItem {
  key: string; // tagId or 'uncategorized'
  tagId: string | null;
  name: string;
  amountPaise: number;
  percentage: number;
  count: number;
}

export interface TimeSeriesPoint {
  label: string;
  tooltipLabel: string;
  amountPaise: number;
  amountRupees: number;
  isPeak: boolean;
}

export function filterExpensesByDate(
  expenses: ExpenseRecord[],
  filter: TransactionDateFilter,
  now: Date = new Date(),
  customRange?: { start?: string; end?: string }
): ExpenseRecord[] {
  if (filter === 'all') return expenses;

  if (filter === 'today') {
    const today = getTodayLocalDate(now);
    return expenses.filter((e) => e.date === today);
  }

  if (filter === 'week') {
    const { start, end } = getWeekDateRange(now);
    return expenses.filter((e) => e.date >= start && e.date <= end);
  }

  if (filter === 'month') {
    const { start, end } = getMonthDateRange(now);
    return expenses.filter((e) => e.date >= start && e.date <= end);
  }

  if (filter === 'year') {
    const { start, end } = getYearDateRange(now);
    return expenses.filter((e) => e.date >= start && e.date <= end);
  }

  if (filter === 'custom') {
    const start = customRange?.start || '';
    const end = customRange?.end || '';
    return expenses.filter((e) => {
      if (start && e.date < start) return false;
      if (end && e.date > end) return false;
      return true;
    });
  }

  return expenses;
}

export function sortExpensesReverseChronological(expenses: ExpenseRecord[]): ExpenseRecord[] {
  return [...expenses].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.createdAt - a.createdAt;
  });
}

export function calculateTotalPaise(expenses: ExpenseRecord[]): number {
  return expenses.reduce((sum, item) => sum + item.amountPaise, 0);
}

/**
 * Counts unique user-assigned tags used across the given expenses.
 */
export function countUniqueTagsUsed(expenses: ExpenseRecord[], validTagIds: Set<string>): number {
  const used = new Set<string>();
  for (const exp of expenses) {
    if (exp.tagId && validTagIds.has(exp.tagId)) {
      used.add(exp.tagId);
    }
  }
  return used.size;
}

/**
 * Aggregates spending across tags (plus Uncategorized if any expenses have null/missing tagId).
 */
export function computeCategoryBreakdown(
  expenses: ExpenseRecord[],
  tags: TagRecord[]
): CategoryBreakdownItem[] {
  const totalPaise = calculateTotalPaise(expenses);
  if (expenses.length === 0 || totalPaise === 0) return [];

  const tagMap = new Map<string, string>();
  for (const t of tags) {
    tagMap.set(t.id, t.name);
  }

  const buckets = new Map<string, { tagId: string | null; name: string; amountPaise: number; count: number }>();

  for (const exp of expenses) {
    const hasValidTag = Boolean(exp.tagId && tagMap.has(exp.tagId));
    const key = hasValidTag ? (exp.tagId as string) : 'uncategorized';
    const name = hasValidTag ? (tagMap.get(exp.tagId as string) as string) : 'Uncategorized';

    const existing = buckets.get(key);
    if (existing) {
      existing.amountPaise += exp.amountPaise;
      existing.count += 1;
    } else {
      buckets.set(key, {
        tagId: hasValidTag ? (exp.tagId as string) : null,
        name,
        amountPaise: exp.amountPaise,
        count: 1,
      });
    }
  }

  return Array.from(buckets.entries())
    .map(([key, val]) => ({
      key,
      tagId: val.tagId,
      name: val.name,
      amountPaise: val.amountPaise,
      count: val.count,
      percentage: Math.round((val.amountPaise / totalPaise) * 100),
    }))
    .sort((a, b) => b.amountPaise - a.amountPaise);
}

/**
 * Builds time-series bar chart points for Insights:
 * - week:  Mon..Sun (7 bars)
 * - month: 7 day-range buckets ('1', '5', '10', '15', '20', '25', '30') covering 100% of month days
 * - year:  Jan..Dec (12 bars)
 */
export function computeInsightsTimeSeries(
  allExpenses: ExpenseRecord[],
  period: InsightsPeriod,
  refDate: Date = new Date()
): TimeSeriesPoint[] {
  const points: Omit<TimeSeriesPoint, 'isPeak'>[] = [];

  if (period === 'week') {
    const { start } = getWeekDateRange(refDate);
    const monday = parseLocalDateString(start);
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    for (let i = 0; i < 7; i++) {
      const d = addLocalDays(monday, i);
      const dStr = toLocalDateString(d);
      const paise = allExpenses
        .filter((e) => e.date === dStr)
        .reduce((s, e) => s + e.amountPaise, 0);

      points.push({
        label: dayNames[i],
        tooltipLabel: d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
        amountPaise: paise,
        amountRupees: paise / 100,
      });
    }
  } else if (period === 'month') {
    const year = refDate.getFullYear();
    const month = refDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthShort = refDate.toLocaleDateString('en-US', { month: 'short' });
    const ymPrefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
    const monthExpenses = allExpenses.filter((e) => e.date.startsWith(ymPrefix));

    const ranges: Array<{ label: string; from: number; to: number }> = [
      { label: '1', from: 1, to: 4 },
      { label: '5', from: 5, to: 9 },
      { label: '10', from: 10, to: 14 },
      { label: '15', from: 15, to: 19 },
      { label: '20', from: 20, to: 24 },
      { label: '25', from: 25, to: Math.min(28, daysInMonth) },
      { label: String(daysInMonth >= 30 ? 30 : daysInMonth), from: 29, to: daysInMonth },
    ];

    for (const r of ranges) {
      if (r.from > daysInMonth) continue;
      const paise = monthExpenses
        .filter((e) => {
          const dayNum = Number(e.date.slice(8, 10));
          return dayNum >= r.from && dayNum <= r.to;
        })
        .reduce((s, e) => s + e.amountPaise, 0);

      points.push({
        label: r.label,
        tooltipLabel:
          r.from === r.to ? `${monthShort} ${r.from}` : `${monthShort} ${r.from}–${r.to}`,
        amountPaise: paise,
        amountRupees: paise / 100,
      });
    }
  } else {
    const year = refDate.getFullYear();
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let m = 0; m < 12; m++) {
      const prefix = `${year}-${String(m + 1).padStart(2, '0')}-`;
      const paise = allExpenses
        .filter((e) => e.date.startsWith(prefix))
        .reduce((s, e) => s + e.amountPaise, 0);

      points.push({
        label: monthLabels[m],
        tooltipLabel: `${monthLabels[m]} ${year}`,
        amountPaise: paise,
        amountRupees: paise / 100,
      });
    }
  }

  const maxPaise = points.reduce((m, p) => (p.amountPaise > m ? p.amountPaise : m), 0);
  let markedPeak = false;

  return points.map((p) => {
    const isPeak = maxPaise > 0 && !markedPeak && p.amountPaise === maxPaise;
    if (isPeak) markedPeak = true;
    return { ...p, isPeak };
  });
}
