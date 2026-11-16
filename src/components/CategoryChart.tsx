import { ArrowUpRight, Calendar, Coins } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { CategoryBreakdownItem } from '../utils/analytics';
import { formatINR } from '../utils/currency';

interface CategoryChartProps {
  items: CategoryBreakdownItem[];
  onOpenInsights: () => void;
  onCyclePeriod?: () => void;
}

const BADGE_COLORS = [
  'bg-[#28B899] text-white',
  'bg-[#F15B50] text-white',
  'bg-[#181818] text-white',
  'bg-[#28B899] text-white',
  'bg-[#181818] text-white',
];

/**
 * Reproduces the signature neon-lime "Spending by Category" card from the reference mockup:
 * - Vertical capsule bars
 * - Diagonal striped secondary bars
 * - Solid black highlighted bar with vertical category label, top ring dot, and floating % pill
 */
export function CategoryChart({
  items,
  onOpenInsights,
  onCyclePeriod,
}: CategoryChartProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // Take up to 6 categories and place the highest-spending category prominently near center-right
  // just like the mockup silhouette, while preserving interactive selection on any bar.
  const displayBars = useMemo(() => {
    const top = items.slice(0, 6);
    if (top.length <= 2) return top;

    // Arrange so the largest bar sits naturally in the interior (index ~3 of 6) like the reference image
    const [highest, ...rest] = top;
    const leftCount = Math.min(3, Math.ceil(rest.length / 2));
    const left = rest.slice(0, leftCount).reverse();
    const right = rest.slice(leftCount);
    return [...left, highest, ...right];
  }, [items]);

  const highestKey = items[0]?.key ?? null;
  const activeKey =
    selectedKey && displayBars.some((b) => b.key === selectedKey)
      ? selectedKey
      : highestKey;

  const activeItem = displayBars.find((b) => b.key === activeKey) ?? items[0] ?? null;
  const maxPaise = items[0]?.amountPaise ?? 0;

  return (
    <section
      aria-label="Spending by category"
      className="rounded-chart bg-lime p-5 text-ink shadow-soft"
    >
      {/* Card Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Coins className="h-[18px] w-[18px] text-ink" strokeWidth={1.9} />
          <h2 className="text-[15px] font-medium tracking-tight text-ink">
            Spending by Category
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {onCyclePeriod && (
            <button
              type="button"
              onClick={onCyclePeriod}
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink/80 transition hover:bg-black/10"
              aria-label="Switch time range"
              title="Switch time range"
            >
              <Calendar className="h-[17px] w-[17px]" strokeWidth={1.9} />
            </button>
          )}
          <button
            type="button"
            onClick={onOpenInsights}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-ink transition hover:bg-white active:scale-95"
            aria-label="View detailed insights"
          >
            <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Empty State */}
      {displayBars.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-4 flex items-end gap-3 opacity-35" aria-hidden="true">
            <div className="h-14 w-9 rounded-pill bg-diagonal-stripes" />
            <div className="h-24 w-9 rounded-pill bg-diagonal-stripes" />
            <div className="h-28 w-9 rounded-pill bg-ink" />
            <div className="h-16 w-9 rounded-pill bg-diagonal-stripes" />
          </div>
          <p className="text-sm font-medium text-ink">No expenses in this period yet</p>
          <p className="mt-0.5 text-xs text-ink/70">
            Add an expense below to see your spending by tag.
          </p>
        </div>
      ) : (
        <>
          {/* Capsule Bars Stage */}
          <div className="mt-2 flex h-[196px] items-end justify-around gap-2 px-1 pt-8">
            {displayBars.map((bar, idx) => {
              const isHighlighted = bar.key === activeKey;
              const ratio = maxPaise > 0 ? bar.amountPaise / maxPaise : 0;
              // Scale bar height between 64px and 144px so capsules remain legible
              const heightPx = Math.round(64 + ratio * 80);
              const badgeTone = BADGE_COLORS[idx % BADGE_COLORS.length];

              return (
                <button
                  key={bar.key}
                  type="button"
                  onClick={() => setSelectedKey(bar.key)}
                  className="group relative flex h-full flex-1 max-w-[48px] flex-col items-center justify-end focus:outline-none"
                  aria-label={`${bar.name}: ${formatINR(bar.amountPaise)} (${bar.percentage}%)`}
                >
                  {/* Floating percentage pill above highlighted bar */}
                  {isHighlighted && (
                    <span className="mb-1.5 rounded-pill bg-ink px-2.5 py-0.5 text-[11px] font-semibold text-white tabular-nums shadow-sm">
                      {bar.percentage}%
                    </span>
                  )}

                  {/* Vertical Capsule Bar */}
                  <div
                    style={{ height: `${heightPx}px` }}
                    className={
                      isHighlighted
                        ? 'relative flex w-full flex-col items-center justify-between rounded-pill bg-ink py-2.5 text-white transition-all duration-300'
                        : 'relative flex w-full items-center justify-center rounded-pill bg-[#D9F429] bg-diagonal-stripes transition-all duration-300 group-hover:brightness-95'
                    }
                  >
                    {isHighlighted ? (
                      <>
                        {/* Top ring indicator dot matching mockup */}
                        <span className="h-2.5 w-2.5 rounded-full border-2 border-white bg-ink shrink-0" />
                        <span
                          className="truncate px-0.5 text-[12px] font-medium tracking-tight text-white"
                          style={{
                            writingMode: 'vertical-rl',
                            transform: 'rotate(180deg)',
                            maxHeight: `${Math.max(36, heightPx - 28)}px`,
                          }}
                        >
                          {bar.name}
                        </span>
                      </>
                    ) : (
                      <span
                        className={`rounded-pill px-2 py-0.5 text-[10px] font-semibold tabular-nums shadow-sm ${badgeTone}`}
                      >
                        {bar.percentage}%
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Subtle selected category caption */}
          {activeItem && (
            <div className="mt-3 flex items-center justify-between border-t border-ink/10 pt-2.5 text-xs text-ink/80">
              <span className="font-medium text-ink">
                {activeItem.name}{' '}
                <span className="text-ink/65">
                  ({activeItem.count} {activeItem.count === 1 ? 'expense' : 'expenses'})
                </span>
              </span>
              <span className="font-semibold text-ink tabular-nums">
                {formatINR(activeItem.amountPaise)} · {activeItem.percentage}%
              </span>
            </div>
          )}
        </>
      )}
    </section>
  );
}
