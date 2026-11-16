import {
  Download,
  HardDrive,
  Share,
  Smartphone,
  Trash2,
  Upload,
  Wifi,
  WifiOff,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { TopHeader } from '../components/TopHeader';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog';
import { db, type ExpenseRecord, type TagRecord } from '../db/database';
import { clearAllLocalData } from '../db/expenses';
import { useExpenseModal } from '../hooks/useExpenseModal';
import { useExpenses } from '../hooks/useExpenses';
import { useTags } from '../hooks/useTags';
import { useToast } from '../hooks/useToast';
import { getTodayLocalDate, isValidLocalDateString } from '../utils/date';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function Settings() {
  const { openAddExpense } = useExpenseModal();
  const { showToast } = useToast();
  const { expenses } = useExpenses();
  const { tags, tagsById } = useTags();

  const [isOnline, setIsOnline] = useState<boolean>(() => navigator.onLine);
  const [isStandalone] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    );
  });
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
    };
  }, []);

  const triggerDownload = (filename: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Description', 'Tag', 'Amount (INR)', 'Amount (Paise)'];
    const rows = expenses.map((e) => {
      const tagName = e.tagId ? tagsById.get(e.tagId)?.name || 'Uncategorized' : 'Uncategorized';
      const rupees = (e.amountPaise / 100).toFixed(2);
      return [e.date, e.description, tagName, rupees, String(e.amountPaise)]
        .map((val) => `"${String(val).replace(/"/g, '""')}"`)
        .join(',');
    });
    triggerDownload(
      `my-expenses-${getTodayLocalDate()}.csv`,
      [headers.join(','), ...rows].join('\n'),
      'text/csv;charset=utf-8'
    );
    showToast('Exported CSV');
  };

  const handleExportJSON = () => {
    const backup = {
      app: 'My Expenses',
      version: 1,
      exportedAt: new Date().toISOString(),
      tags,
      expenses,
    };
    triggerDownload(
      `my-expenses-backup-${getTodayLocalDate()}.json`,
      JSON.stringify(backup, null, 2),
      'application/json'
    );
    showToast('Backup downloaded');
  };

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as {
        tags?: TagRecord[];
        expenses?: ExpenseRecord[];
      };

      if (!Array.isArray(parsed.expenses) || !Array.isArray(parsed.tags)) {
        throw new Error('Invalid backup format.');
      }

      const validTags = parsed.tags.filter(
        (t) => t && typeof t.id === 'string' && typeof t.name === 'string' && t.name.trim()
      );
      const validExpenses = parsed.expenses.filter(
        (x) =>
          x &&
          typeof x.id === 'string' &&
          Number.isInteger(x.amountPaise) &&
          x.amountPaise > 0 &&
          isValidLocalDateString(x.date)
      );

      await db.transaction('rw', db.tags, db.expenses, async () => {
        await db.tags.bulkPut(validTags);
        await db.expenses.bulkPut(validExpenses);
      });

      showToast(`Imported ${validExpenses.length} expenses`);
    } catch {
      showToast('Invalid JSON backup file');
    } finally {
      e.target.value = '';
    }
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const res = await deferredPrompt.userChoice;
    if (res.outcome === 'accepted') {
      setDeferredPrompt(null);
      showToast('Installing My Expenses...');
    }
  };

  const handleClearAll = async () => {
    await clearAllLocalData();
    showToast('Cleared all local data');
  };

  return (
    <div className="space-y-5">
      <TopHeader title="Settings" onAddExpense={openAddExpense} />

      {/* Local-First & Offline Status Card */}
      <section className="rounded-card border border-line/70 bg-surface p-5 shadow-soft">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-lime text-ink">
              <HardDrive className="h-5 w-5" strokeWidth={1.9} />
            </span>
            <div>
              <h2 className="text-[16px] font-semibold text-ink">Local Device Storage</h2>
              <p className="text-[13px] text-ink-muted">
                IndexedDB · No cloud or account required
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-pill bg-canvas px-3 py-1 text-xs font-medium text-ink">
            {isOnline ? (
              <>
                <Wifi className="h-3.5 w-3.5 text-emerald-600" />
                <span>Online</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5 text-amber-600" />
                <span>Offline</span>
              </>
            )}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2.5 text-center">
          <div className="rounded-[18px] bg-canvas px-3 py-3">
            <div className="text-xl font-semibold text-ink tabular-nums">
              {expenses.length}
            </div>
            <div className="text-xs text-ink-muted">Expenses</div>
          </div>
          <div className="rounded-[18px] bg-canvas px-3 py-3">
            <div className="text-xl font-semibold text-ink tabular-nums">{tags.length}</div>
            <div className="text-xs text-ink-muted">Tags</div>
          </div>
          <div className="rounded-[18px] bg-canvas px-3 py-3">
            <div className="text-sm font-semibold text-ink leading-7">
              {isStandalone ? 'Installed' : 'Browser'}
            </div>
            <div className="text-xs text-ink-muted">App Mode</div>
          </div>
        </div>
      </section>

      {/* Install on iPhone / Mobile PWA Card */}
      <section className="rounded-chart bg-lime p-5 text-ink shadow-soft">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-ink">
            <Smartphone className="h-5 w-5" strokeWidth={1.9} />
          </span>
          <div>
            <h2 className="text-[16px] font-semibold text-ink">
              {isStandalone ? 'Installed on Home Screen' : 'Install on iPhone'}
            </h2>
            <p className="mt-0.5 text-[13px] text-ink/80 leading-relaxed">
              {isStandalone
                ? 'My Expenses is running in standalone full-screen mode with offline caching active.'
                : 'Open this page in Safari on your iPhone, tap the Share icon, and select "Add to Home Screen" for full-screen offline access.'}
            </p>
          </div>
        </div>

        {!isStandalone && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-medium text-ink">
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-surface/90 px-3.5 py-2">
              <Share className="h-3.5 w-3.5" />
              <span>1. Tap Safari Share</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-surface/90 px-3.5 py-2">
              <span>2. Add to Home Screen</span>
            </span>
            {deferredPrompt && (
              <button
                type="button"
                onClick={handleInstallClick}
                className="ml-auto rounded-pill bg-ink px-4 py-2 text-xs font-semibold text-white hover:bg-ink-soft"
              >
                Install App
              </button>
            )}
          </div>
        )}
      </section>

      {/* Local Data Backup & Export */}
      <section className="rounded-card border border-line/70 bg-surface p-5 shadow-soft">
        <h2 className="text-[16px] font-semibold text-ink">Backup &amp; Export</h2>
        <p className="mt-0.5 text-[13px] text-ink-muted">
          Since data stays in this browser, export a local backup anytime.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex h-11 items-center justify-center gap-2 rounded-pill border border-line bg-white px-4 text-sm font-medium text-ink transition hover:bg-canvas"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportJSON}
            className="flex h-11 items-center justify-center gap-2 rounded-pill border border-line bg-white px-4 text-sm font-medium text-ink transition hover:bg-canvas"
          >
            <Download className="h-4 w-4" />
            <span>Backup JSON</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-11 items-center justify-center gap-2 rounded-pill border border-line bg-white px-4 text-sm font-medium text-ink transition hover:bg-canvas sm:col-span-2"
          >
            <Upload className="h-4 w-4" />
            <span>Import JSON Backup</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportJSON}
            className="hidden"
          />
        </div>

        <div className="mt-4 border-t border-line/70 pt-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="flex h-11 w-full items-center justify-center gap-2 rounded-pill border border-red-200 bg-white text-sm font-medium text-red-600 transition hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                <span>Erase All Local Data</span>
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogTitle>Erase all local data?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete all <strong className="text-ink">{expenses.length}</strong>{' '}
                expenses and <strong className="text-ink">{tags.length}</strong> tags from this
                browser. Export a JSON backup first if you want to keep a copy.
              </AlertDialogDescription>
              <div className="mt-5 flex gap-2.5">
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearAll}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  Erase Everything
                </AlertDialogAction>
              </div>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </section>
    </div>
  );
}
