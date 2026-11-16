import { createContext, useContext } from 'react';
import type { ExpenseRecord } from '../db/database';

export interface ExpenseModalContextValue {
  openAddExpense: () => void;
  openEditExpense: (expense: ExpenseRecord) => void;
}

export const ExpenseModalContext = createContext<ExpenseModalContextValue>({
  openAddExpense: () => undefined,
  openEditExpense: () => undefined,
});

export function useExpenseModal() {
  return useContext(ExpenseModalContext);
}
