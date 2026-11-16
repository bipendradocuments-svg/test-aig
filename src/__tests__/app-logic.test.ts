import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { MyExpensesDatabase } from '../db/database';
import { createExpense, deleteExpense, updateExpense } from '../db/expenses';
import { createTag, deleteTag, renameTag, TagValidationError } from '../db/tags';
import {
  calculateTotalPaise,
  computeCategoryBreakdown,
  computeInsightsTimeSeries,
  countUniqueTagsUsed,
  filterExpensesByDate,
} from '../utils/analytics';
import { formatINR, paiseToInputString, parseRupeesToPaise } from '../utils/currency';
import {
  formatExpenseRelativeDate,
  formatReadableInputDate,
  getWeekDateRange,
} from '../utils/date';

describe('Currency & Paise Utilities', () => {
  it('converts rupees to integer paise without floating-point drift', () => {
    expect(parseRupeesToPaise('500')).toBe(50000);
    expect(parseRupeesToPaise('19.99')).toBe(1999);
    expect(parseRupeesToPaise('0.1 + 0.2')).toBeNull();
    expect(parseRupeesToPaise('1,25,000.50')).toBe(12500050);
  });

  it('rejects zero, negative, and malformed amounts', () => {
    expect(parseRupeesToPaise('')).toBeNull();
    expect(parseRupeesToPaise('0')).toBeNull();
    expect(parseRupeesToPaise('0.00')).toBeNull();
    expect(parseRupeesToPaise('-250')).toBeNull();
    expect(parseRupeesToPaise('12.345')).toBeNull();
  });

  it('formats paise using Indian numbering system (en-IN)', () => {
    expect(formatINR(50000)).toBe('₹500');
    expect(formatINR(500000)).toBe('₹5,000');
    expect(formatINR(2485000)).toBe('₹24,850');
    expect(formatINR(12500000)).toBe('₹1,25,000');
    expect(formatINR(85050)).toBe('₹850.50');
    expect(paiseToInputString(50000)).toBe('500');
    expect(paiseToInputString(50050)).toBe('500.5');
  });
});

describe('Date & Monday-Sunday Week Logic', () => {
  it('calculates Monday-to-Sunday week boundaries accurately including Sundays', () => {
    // Nov 16, 2026 is a Monday; Nov 22, 2026 is a Sunday
    const monRef = new Date(2026, 10, 16);
    expect(getWeekDateRange(monRef)).toEqual({
      start: '2026-11-16',
      end: '2026-11-22',
    });

    const sunRef = new Date(2026, 10, 22);
    expect(getWeekDateRange(sunRef)).toEqual({
      start: '2026-11-16',
      end: '2026-11-22',
    });
  });

  it('formats relative and readable dates reliably', () => {
    const ref = new Date(2026, 10, 17);
    expect(formatExpenseRelativeDate('2026-11-17', ref)).toBe('Today');
    expect(formatExpenseRelativeDate('2026-11-16', ref)).toBe('Yesterday');
    expect(formatReadableInputDate('2026-11-17')).toBe('Nov 17, 2026');
  });
});

describe('IndexedDB (Dexie.js) CRUD & Tag Rules', () => {
  let testDb: MyExpensesDatabase;

  beforeEach(async () => {
    testDb = new MyExpensesDatabase(`TestDB_${Date.now()}_${Math.random()}`);
    await testDb.open();
  });

  it('prevents empty and case-insensitive duplicate tag names', async () => {
    await expect(createTag('   ', testDb)).rejects.toThrow(TagValidationError);

    const groceries = await createTag('Groceries', testDb);
    expect(groceries.name).toBe('Groceries');

    await expect(createTag('groceries', testDb)).rejects.toThrow(TagValidationError);
    await expect(createTag(' GROCERIES ', testDb)).rejects.toThrow(TagValidationError);
  });

  it('allows optional description and optional tag on expenses, and supports edit/delete', async () => {
    const exp = await createExpense(
      {
        amountPaise: 50000,
        date: '2026-11-16',
      },
      testDb
    );

    expect(exp.description).toBe('');
    expect(exp.tagId).toBeNull();

    const updated = await updateExpense(
      exp.id,
      {
        amountPaise: 85000,
        description: 'Zomato',
        tagId: null,
        date: '2026-11-17',
      },
      testDb
    );

    expect(updated.amountPaise).toBe(85000);
    expect(updated.description).toBe('Zomato');
    expect(updated.date).toBe('2026-11-17');

    await deleteExpense(exp.id, testDb);
    expect(await testDb.expenses.count()).toBe(0);
  });

  it('renames tags globally and uncategorizes expenses without deleting them when a tag is deleted', async () => {
    const food = await createTag('Food', testDb);
    const travel = await createTag('Travel', testDb);

    await createExpense(
      { amountPaise: 85000, description: 'Zomato', tagId: food.id, date: '2026-11-16' },
      testDb
    );
    await createExpense(
      { amountPaise: 30000, description: 'Uber', tagId: travel.id, date: '2026-11-16' },
      testDb
    );

    await renameTag(food.id, 'Food & Dining', testDb);
    const tagsAfterRename = await testDb.tags.toArray();
    const expensesAfterRename = await testDb.expenses.toArray();
    const breakdown1 = computeCategoryBreakdown(expensesAfterRename, tagsAfterRename);
    expect(breakdown1[0].name).toBe('Food & Dining');

    // Delete Food & Dining tag -> Zomato expense must remain and become Uncategorized
    await deleteTag(food.id, testDb);
    const remainingExpenses = await testDb.expenses.toArray();
    expect(remainingExpenses).toHaveLength(2);

    const zomato = remainingExpenses.find((e) => e.description === 'Zomato');
    expect(zomato?.tagId).toBeNull();

    const remainingTags = await testDb.tags.toArray();
    const breakdown2 = computeCategoryBreakdown(remainingExpenses, remainingTags);
    expect(breakdown2.find((b) => b.key === 'uncategorized')?.amountPaise).toBe(85000);
  });

  it('computes accurate period totals and weekly/monthly/yearly time series', async () => {
    const groceries = await createTag('Groceries', testDb);
    await createExpense(
      { amountPaise: 850000, description: 'Instamart', tagId: groceries.id, date: '2026-11-16' },
      testDb
    );
    await createExpense(
      { amountPaise: 150000, description: 'Vegetables', tagId: groceries.id, date: '2026-11-25' },
      testDb
    );
    await createExpense(
      { amountPaise: 200000, description: 'Last Year Item', tagId: groceries.id, date: '2025-12-10' },
      testDb
    );

    const all = await testDb.expenses.toArray();
    const refNov16 = new Date(2026, 10, 16);

    const weekFiltered = filterExpensesByDate(all, 'week', refNov16);
    expect(calculateTotalPaise(weekFiltered)).toBe(850000);

    const monthFiltered = filterExpensesByDate(all, 'month', refNov16);
    expect(calculateTotalPaise(monthFiltered)).toBe(1000000);
    expect(countUniqueTagsUsed(monthFiltered, new Set([groceries.id]))).toBe(1);

    const monthSeries = computeInsightsTimeSeries(all, 'month', refNov16);
    expect(monthSeries).toHaveLength(7);
    const seriesSum = monthSeries.reduce((s, p) => s + p.amountPaise, 0);
    expect(seriesSum).toBe(1000000);
    expect(monthSeries.find((p) => p.isPeak)?.label).toBe('15');
  });
});
