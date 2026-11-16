import { ArrowRight, Check, Pencil, Plus, Tags as TagsIcon, Trash2, X } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TagIcon } from '../components/TagIcon';
import { TopHeader } from '../components/TopHeader';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import type { TagRecord } from '../db/database';
import { useExpenseModal } from '../hooks/useExpenseModal';
import { useExpenses } from '../hooks/useExpenses';
import { useTags } from '../hooks/useTags';
import { useToast } from '../hooks/useToast';
import { formatINR } from '../utils/currency';

const EXAMPLE_TAG_SUGGESTIONS = [
  'Groceries',
  'Food',
  'Shopping',
  'Travel',
  'Rent',
  'Bills',
  'Entertainment',
  'Medical',
  'Personal',
  'Miscellaneous',
];

export function ManageTags() {
  const navigate = useNavigate();
  const { openAddExpense } = useExpenseModal();
  const { showToast } = useToast();
  const { tags, createTag, renameTag, deleteTag } = useTags();
  const { expenses } = useExpenses();

  const [newTagName, setNewTagName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);

  const [deletingTag, setDeletingTag] = useState<TagRecord | null>(null);

  // Per-tag expense count and total paise
  const statsByTagId = useMemo(() => {
    const map = new Map<string, { count: number; totalPaise: number }>();
    for (const exp of expenses) {
      if (!exp.tagId) continue;
      const cur = map.get(exp.tagId) || { count: 0, totalPaise: 0 };
      cur.count += 1;
      cur.totalPaise += exp.amountPaise;
      map.set(exp.tagId, cur);
    }
    return map;
  }, [expenses]);

  const existingLowerSet = useMemo(
    () => new Set(tags.map((t) => t.name.trim().toLowerCase())),
    [tags]
  );

  const availableSuggestions = useMemo(
    () => EXAMPLE_TAG_SUGGESTIONS.filter((s) => !existingLowerSet.has(s.toLowerCase())),
    [existingLowerSet]
  );

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    try {
      const created = await createTag(newTagName);
      setNewTagName('');
      showToast(`Created "${created.name}"`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Could not create tag.');
    }
  };

  const handleQuickCreate = async (suggestion: string) => {
    setCreateError(null);
    try {
      const created = await createTag(suggestion);
      showToast(`Added "${created.name}"`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Could not add tag.');
    }
  };

  const startRename = (tag: TagRecord) => {
    setEditingTagId(tag.id);
    setEditingName(tag.name);
    setRenameError(null);
  };

  const handleSaveRename = async (tagId: string) => {
    setRenameError(null);
    try {
      const updated = await renameTag(tagId, editingName);
      setEditingTagId(null);
      showToast(`Renamed to "${updated.name}"`);
    } catch (err) {
      setRenameError(err instanceof Error ? err.message : 'Could not rename tag.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingTag) return;
    const deletedName = deletingTag.name;
    await deleteTag(deletingTag.id);
    setDeletingTag(null);
    showToast(`Deleted "${deletedName}"`);
  };

  return (
    <div className="space-y-5">
      <TopHeader title="Tags" onAddExpense={openAddExpense} />

      {/* Create Tag Card */}
      <section
        aria-label="Create custom tag"
        className="rounded-card border border-line/70 bg-surface p-5 shadow-soft"
      >
        <h2 className="text-[16px] font-semibold text-ink">Create a Tag</h2>
        <p className="mt-0.5 text-[13px] text-ink-muted">
          Organize your expenses with your own custom categories.
        </p>

        <form onSubmit={handleCreateSubmit} className="mt-4 flex gap-2.5">
          <input
            type="text"
            value={newTagName}
            onChange={(e) => {
              setNewTagName(e.target.value);
              if (createError) setCreateError(null);
            }}
            placeholder="e.g. Groceries, Coffee, Metro..."
            maxLength={40}
            aria-label="New tag name"
            className="h-12 flex-1 rounded-pill border border-line bg-white px-5 text-sm text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none"
          />
          <button
            type="submit"
            className="inline-flex h-12 shrink-0 items-center gap-1.5 rounded-pill bg-lime px-5 text-sm font-semibold text-ink transition hover:bg-lime-hover active:scale-[0.99]"
          >
            <Plus className="h-4 w-4 stroke-[2.3]" />
            <span>Create</span>
          </button>
        </form>

        {createError && (
          <p role="alert" className="mt-2.5 text-xs font-medium text-red-600">
            {createError}
          </p>
        )}

        {/* User-triggered quick suggestions (never auto-created) */}
        {availableSuggestions.length > 0 && (
          <div className="mt-4 border-t border-line/70 pt-3.5">
            <div className="mb-2 text-xs font-medium text-ink-muted">
              Tap to add common tags:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {availableSuggestions.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleQuickCreate(label)}
                  className="inline-flex items-center gap-1 rounded-pill border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-lime/40"
                >
                  <Plus className="h-3 w-3" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Tags List */}
      <section aria-label="Your tags">
        <div className="mb-3 flex items-center justify-between px-0.5">
          <h2 className="text-[17px] font-semibold tracking-tight text-ink">
            Your Tags ({tags.length})
          </h2>
        </div>

        {tags.length === 0 ? (
          <div className="rounded-card border border-line/70 bg-surface px-6 py-11 text-center shadow-soft">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-canvas text-ink-muted">
              <TagsIcon className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <p className="text-[15px] font-semibold text-ink">No custom tags yet</p>
            <p className="mx-auto mt-1 max-w-xs text-[13px] text-ink-muted">
              Create your own tags above or tap any quick suggestion to start organizing expenses.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-line/70 rounded-card border border-line/70 bg-surface px-4 shadow-soft">
            {tags.map((tag) => {
              const stat = statsByTagId.get(tag.id) || { count: 0, totalPaise: 0 };
              const isEditing = editingTagId === tag.id;

              return (
                <div key={tag.id} className="py-3.5 first:pt-4 last:pb-4">
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => {
                            setEditingName(e.target.value);
                            if (renameError) setRenameError(null);
                          }}
                          maxLength={40}
                          aria-label="Rename tag"
                          className="h-10 flex-1 rounded-pill border border-ink bg-white px-4 text-sm font-medium text-ink focus:outline-none"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveRename(tag.id)}
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-lime text-ink hover:bg-lime-hover"
                          aria-label="Save new tag name"
                        >
                          <Check className="h-4 w-4 stroke-[2.4]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTagId(null);
                            setRenameError(null);
                          }}
                          className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-ink-muted hover:text-ink"
                          aria-label="Cancel rename"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      {renameError && (
                        <p className="px-2 text-xs text-red-600">{renameError}</p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/transactions?tag=${encodeURIComponent(tag.id)}`)
                        }
                        className="flex min-w-0 flex-1 items-center gap-3.5 text-left transition hover:opacity-80"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ECECE2] text-ink">
                          <TagIcon tagName={tag.name} />
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 truncate text-[15px] font-medium text-ink">
                            <span className="truncate">{tag.name}</span>
                            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
                          </div>
                          <div className="mt-0.5 text-[13px] text-ink-muted tabular-nums">
                            {stat.count} {stat.count === 1 ? 'expense' : 'expenses'} ·{' '}
                            {formatINR(stat.totalPaise)}
                          </div>
                        </div>
                      </button>

                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => startRename(tag)}
                          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition hover:bg-canvas hover:text-ink"
                          aria-label={`Rename ${tag.name}`}
                          title="Rename tag"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingTag(tag)}
                          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition hover:bg-red-50 hover:text-red-600"
                          aria-label={`Delete ${tag.name}`}
                          title="Delete tag"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Delete Tag Confirmation Dialog */}
      <AlertDialog
        open={Boolean(deletingTag)}
        onOpenChange={(open) => !open && setDeletingTag(null)}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Delete tag “{deletingTag?.name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            Your recorded expenses will <strong className="text-ink">not</strong> be deleted.
            Any expenses currently assigned to <strong className="text-ink">{deletingTag?.name}</strong>{' '}
            will become <strong className="text-ink">Uncategorized</strong>.
          </AlertDialogDescription>
          <div className="mt-5 flex gap-2.5">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete Tag
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
