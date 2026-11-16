/**
 * Local calendar date utilities (YYYY-MM-DD) avoiding UTC timezone shift bugs.
 * Weeks start on Monday and end on Sunday.
 */

export function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getTodayLocalDate(now: Date = new Date()): string {
  return toLocalDateString(now);
}

export function isValidLocalDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export function parseLocalDateString(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addLocalDays(date: Date, days: number): Date {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  copy.setDate(copy.getDate() + days);
  return copy;
}

/**
 * Monday = start of week, Sunday = end of week.
 */
export function getWeekDateRange(refDate: Date = new Date()): { start: string; end: string } {
  const localMidnight = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
  const dayIndexMondayZero = (localMidnight.getDay() + 6) % 7; // Mon=0 ... Sun=6
  const monday = addLocalDays(localMidnight, -dayIndexMondayZero);
  const sunday = addLocalDays(monday, 6);
  return {
    start: toLocalDateString(monday),
    end: toLocalDateString(sunday),
  };
}

export function getMonthDateRange(refDate: Date = new Date()): { start: string; end: string } {
  const first = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
  const last = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0);
  return {
    start: toLocalDateString(first),
    end: toLocalDateString(last),
  };
}

export function getYearDateRange(refDate: Date = new Date()): { start: string; end: string } {
  const y = refDate.getFullYear();
  return {
    start: `${y}-01-01`,
    end: `${y}-12-31`,
  };
}

/**
 * Formats a YYYY-MM-DD string as "Today", "Yesterday", or "17 Nov" / "17 Nov 2025".
 */
export function formatExpenseRelativeDate(dateStr: string, now: Date = new Date()): string {
  const todayStr = toLocalDateString(now);
  if (dateStr === todayStr) return 'Today';

  const yesterdayStr = toLocalDateString(addLocalDays(now, -1));
  if (dateStr === yesterdayStr) return 'Yesterday';

  const dt = parseLocalDateString(dateStr);
  const sameYear = dt.getFullYear() === now.getFullYear();
  return dt.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

/**
 * Formats a YYYY-MM-DD string for the Add/Edit Expense date field: e.g. "Nov 17, 2026".
 */
export function formatReadableInputDate(dateStr: string): string {
  if (!isValidLocalDateString(dateStr)) return dateStr;
  const dt = parseLocalDateString(dateStr);
  return dt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatPeriodLabel(
  period: 'week' | 'month' | 'year',
  refDate: Date = new Date()
): string {
  if (period === 'month') {
    return refDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
  if (period === 'year') {
    return String(refDate.getFullYear());
  }
  const { start, end } = getWeekDateRange(refDate);
  const s = parseLocalDateString(start);
  const e = parseLocalDateString(end);
  const sLabel = s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const eLabel = e.toLocaleDateString('en-US', {
    month: s.getMonth() === e.getMonth() ? undefined : 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${sLabel} – ${eLabel}`;
}
