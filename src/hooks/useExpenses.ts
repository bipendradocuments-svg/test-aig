import { useLiveQuery } from 'dexie-react-hooks';
import { db, type ExpenseRecord } from '../db/database';
import {
  createExpense,
  deleteExpense,
  type ExpenseInput,
  updateExpense,
} from '../db/expenses';
import { sortExpensesReverseChronological } from '../utils/analytics';

export function useExpenses() {
  const rawExpenses = useLiveQuery(async () => {
    const all = await db.expenses.toArray();
    return sortExpensesReverseChronological(all);
  }, []);

  const expenses: ExpenseRecord[] = rawExpenses ?? [];
  const isLoading = rawExpenses === undefined;

  return {
    expenses,
    isLoading,
    addExpense: (input: ExpenseInput) => createExpense(input),
    editExpense: (id: string, input: ExpenseInput) => updateExpense(id, input),
    removeExpense: (id: string) => deleteExpense(id),
  };
}
