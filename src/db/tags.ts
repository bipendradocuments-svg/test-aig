import { generateUUID } from '../lib/utils';
import { db, type MyExpensesDatabase, type TagRecord } from './database';

export class TagValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TagValidationError';
  }
}

export async function createTag(
  rawName: string,
  database: MyExpensesDatabase = db
): Promise<TagRecord> {
  const name = rawName.trim().replace(/\s+/g, ' ');
  if (!name) {
    throw new TagValidationError('Tag name must not be empty.');
  }

  const normalized = name.toLowerCase();
  return database.transaction('rw', database.tags, async () => {
    const existing = await database.tags.toArray();
    if (existing.some((t) => t.name.trim().toLowerCase() === normalized)) {
      throw new TagValidationError(`A tag named "${name}" already exists.`);
    }

    const now = Date.now();
    const record: TagRecord = {
      id: generateUUID(),
      name,
      createdAt: now,
      updatedAt: now,
    };

    await database.tags.add(record);
    return record;
  });
}

export async function renameTag(
  id: string,
  rawNewName: string,
  database: MyExpensesDatabase = db
): Promise<TagRecord> {
  const name = rawNewName.trim().replace(/\s+/g, ' ');
  if (!name) {
    throw new TagValidationError('Tag name must not be empty.');
  }

  const normalized = name.toLowerCase();
  return database.transaction('rw', database.tags, async () => {
    const current = await database.tags.get(id);
    if (!current) {
      throw new TagValidationError('Tag not found.');
    }

    const existing = await database.tags.toArray();
    if (existing.some((t) => t.id !== id && t.name.trim().toLowerCase() === normalized)) {
      throw new TagValidationError(`Another tag named "${name}" already exists.`);
    }

    const updatedAt = Date.now();
    await database.tags.update(id, { name, updatedAt });
    return { ...current, name, updatedAt };
  });
}

/**
 * Deletes a tag and sets associated expenses' tagId to null (Uncategorized)
 * within an atomic IndexedDB transaction. Associated expenses are NEVER deleted.
 */
export async function deleteTag(
  id: string,
  database: MyExpensesDatabase = db
): Promise<void> {
  await database.transaction('rw', database.tags, database.expenses, async () => {
    const updatedAt = Date.now();
    await database.expenses
      .where('tagId')
      .equals(id)
      .modify({ tagId: null, updatedAt });
    await database.tags.delete(id);
  });
}

export async function getAllTags(database: MyExpensesDatabase = db): Promise<TagRecord[]> {
  const list = await database.tags.toArray();
  return list.sort((a, b) => a.name.localeCompare(b.name));
}
