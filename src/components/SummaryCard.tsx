import { ArrowUpRight } from 'lucide-react';
import { formatINR } from '../utils/currency';

interface SummaryCardProps {
  totalPaise: number;
  categoriesCount: number;
  onOpenInsights: () => void;
}

export function SummaryCard({
  totalPaise,
  categoriesCount,
  onOpenInsights,
}: SummaryCardProps) {
  return (
    <section
      aria-label="Spending summary"
      className="flex items-center justify-between rounded-card border border-line/70 bg-surface px-5 py-4 shadow-soft"
    >
      <div className="flex items-center gap-7 sm:gap-10">
        <div>
          <div className="text-[30px] sm:text-[32px] font-semibold tracking-tight text-ink tabular-nums leading-tight">
            {formatINR(totalPaise)}
          </div>
          <div className="mt-0.5 text-[13px] text-ink-muted">Total Expenses</div>
        </div>

        <div>
          <div className="text-[28px] sm:text-[30px] font-medium tracking-tight text-ink tabular-nums leading-tight">
            {categoriesCount}
          </div>
          <div className="mt-0.5 text-[13px] text-ink-muted">Categories</div>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenInsights}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-lime text-ink transition hover:bg-lime-hover active:scale-95"
        aria-label="Open spending insights"
      >
        <ArrowUpRight className="h-5 w-5" strokeWidth={2} />
      </button>
    </section>
  );
}
