import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { ExpenseRecord, TagRecord } from '../db/database';
import { formatINR } from '../utils/currency';
import { formatExpenseRelativeDate } from '../utils/date';
import { TagIcon } from './TagIcon';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from './ui/alert-dialog';

interface ExpenseListProps {
  expenses: ExpenseRecord[];
  tagsById: Map<string, TagRecord>;
  onSelectExpense: (expense: ExpenseRecord) => void;
  onDeleteExpense?: (expenseId: string) => Promise<void>;
  showQuickActions?: boolean;
}

export function ExpenseList({
  expenses,
  tagsById,
  onSelectExpense,
  onDeleteExpense,
  showQuickActions = false,
}: ExpenseListProps) {
  const [pendingDelete, setPendingDelete] = useState<ExpenseRecord | null>(null);

  return (
    <>
      <div className="divide-y divide-line/70 rounded-card border border-line/70 bg-surface px-4 shadow-soft">
        {expenses.map((expense) => {
          const tag = expense.tagId ? tagsById.get(expense.tagId) : undefined;
          const tagLabel = tag ? tag.name : 'Uncategorized';
          const title = expense.description || (tag ? tag.name : 'Expense');
          const dateLabel = formatExpenseRelativeDate(expense.date);

          return (
            <div
              key={expense.id}
              className="flex items-center justify-between gap-3 py-3.5 first:pt-4 last:pb-4"
            >
              <button
                type="button"
                onClick={() => onSelectExpense(expense)}
                className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left transition hover:opacity-80 focus:outline-none"
              >
                <div className="flex min-w-0 items-center gap-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ECECE2] text-ink">
                    <TagIcon tagName={tag?.name} />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-medium text-ink">
                      {title}
                    </div>
                    <div className="mt-0.5 truncate text-[13px] text-ink-muted">
                      {tagLabel} · {dateLabel}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 text-[15px] font-semibold text-ink tabular-nums">
                  {formatINR(expense.amountPaise)}
                </div>
              </button>

              {showQuickActions && onDeleteExpense && (
                <div className="ml-1 flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onSelectExpense(expense)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition hover:bg-canvas hover:text-ink"
                    aria-label={`Edit ${title}`}
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(expense)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition hover:bg-red-50 hover:text-red-600"
                    aria-label={`Delete ${title}`}
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Delete expense?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete{' '}
            <strong className="text-ink">
              {pendingDelete?.description || 'this expense'}
            </strong>{' '}
            ({pendingDelete ? formatINR(pendingDelete.amountPaise) : ''})? This cannot be undone.
          </AlertDialogDescription>
          <div className="mt-5 flex gap-2.5">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (pendingDelete && onDeleteExpense) {
                  await onDeleteExpense(pendingDelete.id);
                  setPendingDelete(null);
                }
              }}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
