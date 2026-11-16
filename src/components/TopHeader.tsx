import {
  ArrowLeft,
  BarChart3,
  Bell,
  CheckCircle2,
  MoreVertical,
  Plus,
  Settings,
  Tags,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface TopHeaderProps {
  title: string;
  onBack?: () => void;
  onAddExpense?: () => void;
}

export function TopHeader({ title, onBack, onAddExpense }: TopHeaderProps) {
  const navigate = useNavigate();
  const [showStatusCard, setShowStatusCard] = useState(false);

  return (
    <header className="pt-safe mb-5">
      {/* Top action icons row matching mockup */}
      <div className="mb-2 flex items-center justify-end gap-2.5 relative">
        <button
          type="button"
          onClick={() => setShowStatusCard((prev) => !prev)}
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-line/70 bg-surface text-ink shadow-soft transition hover:bg-white"
          aria-label="Local storage status"
        >
          <Bell className="h-[18px] w-[18px]" strokeWidth={1.9} />
          <span className="absolute right-2.5 top-2 h-2 w-2 rounded-full bg-lime ring-2 ring-surface" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-line/70 bg-surface text-ink shadow-soft transition hover:bg-white"
              aria-label="More options"
            >
              <MoreVertical className="h-[18px] w-[18px]" strokeWidth={1.9} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onAddExpense && (
              <>
                <DropdownMenuItem onSelect={onAddExpense}>
                  <Plus className="h-4 w-4" />
                  <span>Add Expense</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onSelect={() => navigate('/insights')}>
              <BarChart3 className="h-4 w-4" />
              <span>Spending Insights</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate('/tags')}>
              <Tags className="h-4 w-4" />
              <span>Manage Tags</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate('/settings')}>
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {showStatusCard && (
          <div className="absolute right-0 top-12 z-40 w-72 rounded-[20px] border border-line bg-white p-4 shadow-float">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-lime text-ink">
                <CheckCircle2 className="h-4 w-4" />
              </span>
              <div className="text-xs leading-relaxed">
                <p className="font-semibold text-ink">Local-First &amp; Offline Ready</p>
                <p className="mt-0.5 text-ink-muted">
                  All expenses and tags are saved privately in your browser’s IndexedDB. No internet or account needed.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Title row */}
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line/70 bg-surface text-ink shadow-soft transition hover:bg-white"
            aria-label="Go back"
          >
            <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={2} />
          </button>
        )}
        <h1 className="text-[28px] font-semibold tracking-tight text-ink leading-tight">
          {title}
        </h1>
      </div>
    </header>
  );
}
