import { generateUUID } from '../lib/utils';
import { isValidLocalDateString } from '../utils/date';
import { db, type ExpenseRecord, type MyExpensesDatabase } from './database';

export interface ExpenseInput {
  amountPaise: number;
  description?: string;
  tagId?: string | null;
  date: string;
}

export class ExpenseValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExpenseValidationError';
  }
}

function validateExpenseInput(input: ExpenseInput) {
  if (!Number.isInteger(input.amountPaise) || input.amountPaise <= 0) {
    throw new ExpenseValidationError('Please enter a valid positive amount.');
  }
  if (!isValidLocalDateString(input.date)) {
    throw new ExpenseValidationError('Please select a valid calendar date.');
  }
}

export async function createExpense(
  input: ExpenseInput,
  database: MyExpensesDatabase = db
): Promise<ExpenseRecord> {
  validateExpenseInput(input);

  const now = Date.now();
  const record: ExpenseRecord = {
    id: generateUUID(),
    amountPaise: input.amountPaise,
    description: (input.description ?? '').trim(),
    tagId: input.tagId ? input.tagId : null,
    date: input.date,
    createdAt: now,
    updatedAt: now,
  };

  await database.expenses.add(record);
  return record;
}

export async function updateExpense(
  id: string,
  input: ExpenseInput,
  database: MyExpensesDatabase = db
): Promise<ExpenseRecord> {
  validateExpenseInput(input);

  return database.transaction('rw', database.expenses, async () => {
    const existing = await database.expenses.get(id);
    if (!existing) {
      throw new ExpenseValidationError('Expense record not found.');
    }

    const updated: ExpenseRecord = {
      ...existing,
      amountPaise: input.amountPaise,
      description: (input.description ?? '').trim(),
      tagId: input.tagId ? input.tagId : null,
      date: input.date,
      updatedAt: Date.now(),
    };

    await database.expenses.put(updated);
    return updated;
  });
}

export async function deleteExpense(
  id: string,
  database: MyExpensesDatabase = db
): Promise<void> {
  await database.expenses.delete(id);
}

export async function clearAllLocalData(database: MyExpensesDatabase = db): Promise<void> {
  await database.transaction('rw', database.expenses, database.tags, async () => {
    await database.expenses.clear();
    await database.tags.clear();
  });
}
