import Dexie, { type EntityTable } from 'dexie';

export interface ExpenseRecord {
  id: string;
  amountPaise: number;
  description: string;
  tagId: string | null;
  date: string; // Local calendar date YYYY-MM-DD
  createdAt: number;
  updatedAt: number;
}

export interface TagRecord {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export class MyExpensesDatabase extends Dexie {
  expenses!: EntityTable<ExpenseRecord, 'id'>;
  tags!: EntityTable<TagRecord, 'id'>;

  constructor(dbName = 'MyExpensesDB') {
    super(dbName);
    this.version(1).stores({
      expenses: 'id, date, tagId, createdAt, updatedAt',
      tags: 'id, name, createdAt, updatedAt',
    });
  }
}

export const db = new MyExpensesDatabase();
