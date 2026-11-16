import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { db, type TagRecord } from '../db/database';
import { createTag, deleteTag, renameTag } from '../db/tags';

const EMPTY_TAGS: TagRecord[] = [];

export function useTags() {
  const rawTags = useLiveQuery(async () => {
    const items = await db.tags.toArray();
    return items.sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const tags: TagRecord[] = rawTags ?? EMPTY_TAGS;
  const isLoading = rawTags === undefined;

  const tagsById = useMemo(() => {
    const map = new Map<string, TagRecord>();
    for (const tag of tags) {
      map.set(tag.id, tag);
    }
    return map;
  }, [tags]);

  return {
    tags,
    tagsById,
    isLoading,
    createTag: (name: string) => createTag(name),
    renameTag: (id: string, name: string) => renameTag(id, name),
    deleteTag: (id: string) => deleteTag(id),
  };
}
