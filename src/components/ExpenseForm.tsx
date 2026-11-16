import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronDown,
  Plus,
  Settings2,
  Tag,
  Trash2,
} from 'lucide-react';
import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ExpenseRecord } from '../db/database';
import { useExpenses } from '../hooks/useExpenses';
import { useTags } from '../hooks/useTags';
import { useToast } from '../hooks/useToast';
import { paiseToInputString, parseRupeesToPaise } from '../utils/currency';
import {
  formatReadableInputDate,
  getTodayLocalDate,
  isValidLocalDateString,
} from '../utils/date';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';

interface ExpenseFormModalProps {
  open: boolean;
  initialExpense?: ExpenseRecord | null;
  onClose: () => void;
}

export function ExpenseFormModal({
  open,
  initialExpense,
  onClose,
}: ExpenseFormModalProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      {open && (
        <DialogContent hideCloseButton className="pb-safe">
          <ExpenseFormBody
            key={initialExpense ? `${initialExpense.id}_${initialExpense.updatedAt}` : 'new'}
            initialExpense={initialExpense}
            onClose={onClose}
          />
        </DialogContent>
      )}
    </Dialog>
  );
}

function ExpenseFormBody({
  initialExpense,
  onClose,
}: {
  initialExpense?: ExpenseRecord | null;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { addExpense, editExpense, removeExpense } = useExpenses();
  const { tags, createTag } = useTags();

  const isEditing = Boolean(initialExpense);

  const [amountInput, setAmountInput] = useState(() =>
    initialExpense ? paiseToInputString(initialExpense.amountPaise) : ''
  );
  const [description, setDescription] = useState(() => initialExpense?.description ?? '');
  const [selectedTagId, setSelectedTagId] = useState<string>(
    () => initialExpense?.tagId ?? ''
  );
  const [date, setDate] = useState(() =>
    initialExpense ? initialExpense.date : getTodayLocalDate()
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [isTagMenuOpen, setIsTagMenuOpen] = useState(false);
  const [isCreatingInlineTag, setIsCreatingInlineTag] = useState(false);
  const [inlineTagName, setInlineTagName] = useState('');
  const [inlineTagError, setInlineTagError] = useState<string | null>(null);

  const amountRef = useRef<HTMLInputElement | null>(null);
  const dateInputRef = useRef<HTMLInputElement | null>(null);

  const selectedTag = tags.find((t) => t.id === selectedTagId) ?? null;

  const handleCreateInlineTag = async () => {
    setInlineTagError(null);
    try {
      const created = await createTag(inlineTagName);
      setSelectedTagId(created.id);
      setInlineTagName('');
      setIsCreatingInlineTag(false);
      setIsTagMenuOpen(false);
      showToast(`Created tag "${created.name}"`);
    } catch (err) {
      setInlineTagError(err instanceof Error ? err.message : 'Unable to create tag.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amountPaise = parseRupeesToPaise(amountInput);
    if (amountPaise === null) {
      setError('Enter a valid amount greater than ₹0 (up to 2 decimal places).');
      amountRef.current?.focus();
      return;
    }

    if (!isValidLocalDateString(date)) {
      setError('Please choose a valid date.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        amountPaise,
        description,
        tagId: selectedTagId || null,
        date,
      };

      if (initialExpense) {
        await editExpense(initialExpense.id, payload);
        showToast('Expense updated');
      } else {
        await addExpense(payload);
        showToast('Expense saved');
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save expense.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!initialExpense) return;
    try {
      await removeExpense(initialExpense.id);
      showToast('Expense deleted');
      onClose();
    } catch {
      setError('Could not delete expense.');
    }
  };

  const handleManageTagsNavigate = () => {
    onClose();
    navigate('/tags');
  };

  return (
    <>
      <div className="mb-6 flex items-center gap-3.5">
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line/70 bg-surface text-ink shadow-soft transition hover:bg-white"
          aria-label="Back"
        >
          <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={2} />
        </button>
        <div>
          <DialogTitle>{isEditing ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
          <DialogDescription className="sr-only">
            {isEditing
              ? 'Update or delete this recorded expense.'
              : 'Record a new daily expense in Indian Rupees.'}
          </DialogDescription>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {/* 1. Amount */}
        <div>
          <label
            htmlFor="expense-amount-input"
            className="mb-2 block text-[14px] font-medium text-ink"
          >
            Amount
          </label>
          <div className="flex items-center gap-1.5 rounded-[24px] border border-ink/60 bg-lime-tint px-6 py-3.5 transition focus-within:border-ink focus-within:ring-2 focus-within:ring-ink/10">
            <span className="select-none text-[30px] font-medium text-ink leading-none">
              ₹
            </span>
            <input
              ref={amountRef}
              id="expense-amount-input"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={amountInput}
              onChange={(e) => {
                setAmountInput(e.target.value);
                if (error) setError(null);
              }}
              className="w-full bg-transparent text-[30px] font-medium leading-none text-ink placeholder:text-ink/30 tabular-nums focus:outline-none"
              required
            />
          </div>
        </div>

        {/* 2. Description (optional) */}
        <div>
          <label
            htmlFor="expense-description-input"
            className="mb-2 block text-[14px] font-medium text-ink"
          >
            Description (optional)
          </label>
          <input
            id="expense-description-input"
            type="text"
            maxLength={120}
            placeholder="What did you spend on?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-14 w-full rounded-pill border border-[#DCDCD2] bg-white px-6 text-[15px] text-ink placeholder:text-ink-muted transition focus:border-ink focus:outline-none"
          />
        </div>

        {/* 3. Category */}
        <div className="relative">
          <div className="mb-2 flex items-center justify-between">
            <label
              id="expense-category-label"
              className="text-[14px] font-medium text-ink"
            >
              Category
            </label>
            <button
              type="button"
              onClick={handleManageTagsNavigate}
              className="inline-flex items-center gap-1 text-xs font-medium text-ink-muted transition hover:text-ink"
            >
              <Settings2 className="h-3.5 w-3.5" />
              <span>Manage tags</span>
            </button>
          </div>

          <button
            type="button"
            aria-labelledby="expense-category-label"
            aria-expanded={isTagMenuOpen}
            onClick={() => setIsTagMenuOpen((prev) => !prev)}
            className="flex h-14 w-full items-center justify-between rounded-pill border border-[#DCDCD2] bg-white px-5 text-left text-[15px] transition hover:border-ink/50 focus:border-ink focus:outline-none"
          >
            <span className="flex items-center gap-3 min-w-0">
              <Tag className="h-[18px] w-[18px] shrink-0 text-ink" strokeWidth={1.8} />
              <span
                className={
                  selectedTag ? 'truncate text-ink font-medium' : 'truncate text-ink-muted'
                }
              >
                {selectedTag ? selectedTag.name : 'Choose category'}
              </span>
            </span>
            <ChevronDown
              className={`h-[18px] w-[18px] shrink-0 text-ink transition-transform ${
                isTagMenuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {isTagMenuOpen && (
            <div className="mt-2 rounded-[22px] border border-line bg-white p-2 shadow-float">
              <div className="max-h-48 overflow-y-auto space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTagId('');
                    setIsTagMenuOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-[14px] px-3.5 py-2.5 text-left text-sm text-ink-muted transition hover:bg-canvas"
                >
                  <span>No tag (Uncategorized)</span>
                  {!selectedTagId && <Check className="h-4 w-4 text-ink" />}
                </button>

                {tags.map((tag) => {
                  const isSelected = tag.id === selectedTagId;
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => {
                        setSelectedTagId(tag.id);
                        setIsTagMenuOpen(false);
                      }}
                      className="flex w-full items-center justify-between rounded-[14px] px-3.5 py-2.5 text-left text-sm font-medium text-ink transition hover:bg-canvas"
                    >
                      <span className="truncate">{tag.name}</span>
                      {isSelected && <Check className="h-4 w-4 text-ink" />}
                    </button>
                  );
                })}
              </div>

              <div className="mt-1.5 border-t border-line pt-2">
                {!isCreatingInlineTag ? (
                  <div className="flex items-center justify-between gap-2 px-1">
                    <button
                      type="button"
                      onClick={() => setIsCreatingInlineTag(true)}
                      className="inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-canvas"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>New tag</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleManageTagsNavigate}
                      className="rounded-pill px-3 py-1.5 text-xs font-medium text-ink-muted transition hover:bg-canvas hover:text-ink"
                    >
                      Manage all tags
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 p-1.5">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={inlineTagName}
                        onChange={(e) => {
                          setInlineTagName(e.target.value);
                          if (inlineTagError) setInlineTagError(null);
                        }}
                        placeholder="e.g. Groceries"
                        maxLength={40}
                        className="h-9 flex-1 rounded-pill border border-line bg-canvas px-3.5 text-sm text-ink focus:border-ink focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleCreateInlineTag}
                        className="h-9 rounded-pill bg-lime px-4 text-xs font-semibold text-ink hover:bg-lime-hover"
                      >
                        Add
                      </button>
                    </div>
                    {inlineTagError && (
                      <p className="px-2 text-xs text-red-600">{inlineTagError}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 4. Date */}
        <div>
          <label
            htmlFor="expense-date-input"
            className="mb-2 block text-[14px] font-medium text-ink"
          >
            Date
          </label>
          <div
            onClick={() => {
              try {
                dateInputRef.current?.showPicker?.();
              } catch {
                // Native input handles fallback
              }
            }}
            className="relative flex h-14 w-full items-center justify-between rounded-pill border border-[#DCDCD2] bg-white px-5 transition focus-within:border-ink"
          >
            <div className="flex items-center gap-3 pointer-events-none">
              <Calendar className="h-[18px] w-[18px] text-ink" strokeWidth={1.8} />
              <span className="h-4 w-px bg-line" aria-hidden="true" />
              <span className="text-[15px] font-medium text-ink">
                {formatReadableInputDate(date)}
              </span>
            </div>
            <ChevronDown className="h-[18px] w-[18px] text-ink pointer-events-none" />
            <input
              ref={dateInputRef}
              id="expense-date-input"
              type="date"
              value={date}
              onChange={(e) => {
                if (e.target.value) setDate(e.target.value);
              }}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              required
            />
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-[16px] border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <div className="pt-2 space-y-2.5">
          <button
            type="submit"
            disabled={isSaving}
            className="flex h-14 w-full items-center justify-center rounded-pill bg-lime text-[17px] font-semibold text-ink shadow-soft transition hover:bg-lime-hover active:scale-[0.99] disabled:opacity-60"
          >
            {isSaving ? 'Saving...' : isEditing ? 'Update Expense' : 'Save Expense'}
          </button>

          {isEditing && initialExpense && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-pill border border-red-200 bg-white text-sm font-medium text-red-600 transition hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete Expense</span>
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogTitle>Delete this expense?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove{' '}
                  <strong className="text-ink">
                    {initialExpense.description || 'this expense'}
                  </strong>{' '}
                  from your device. This action cannot be undone.
                </AlertDialogDescription>
                <div className="mt-5 flex gap-2.5">
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleConfirmDelete}
                    className="bg-red-600 text-white hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </div>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </form>
    </>
  );
}
