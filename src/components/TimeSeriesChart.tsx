import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TimeSeriesPoint } from '../utils/analytics';
import { formatINR } from '../utils/currency';

interface TimeSeriesChartProps {
  data: TimeSeriesPoint[];
}

interface CustomBarProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: TimeSeriesPoint & { renderVal: number };
}

function CapsuleBarShape({ x = 0, y = 0, width = 0, height = 0, payload }: CustomBarProps) {
  if (width <= 0 || height <= 0) return null;

  const barWidth = Math.min(width, 36);
  const offsetX = x + (width - barWidth) / 2;
  const radius = barWidth / 2;
  const isZero = !payload || payload.amountPaise === 0;
  const isPeak = Boolean(payload?.isPeak && !isZero);

  // Ensure capsule height is at least barWidth so top & bottom caps stay round
  const effectiveHeight = Math.max(height, Math.min(barWidth, 24));
  const effectiveY = y - (effectiveHeight - height);

  if (isPeak) {
    return (
      <rect
        x={offsetX}
        y={effectiveY}
        width={barWidth}
        height={effectiveHeight}
        rx={radius}
        ry={radius}
        fill="#111111"
      />
    );
  }

  return (
    <g opacity={isZero ? 0.35 : 1}>
      <rect
        x={offsetX}
        y={effectiveY}
        width={barWidth}
        height={effectiveHeight}
        rx={radius}
        ry={radius}
        fill="#D9F428"
      />
      <rect
        x={offsetX}
        y={effectiveY}
        width={barWidth}
        height={effectiveHeight}
        rx={radius}
        ry={radius}
        fill="url(#rechartsLimeStripes)"
      />
    </g>
  );
}

/**
 * Recharts bar chart inside the neon-lime Insights card matching Screen 3 of the mockup.
 */
export function TimeSeriesChart({ data }: TimeSeriesChartProps) {
  const maxRupees = data.reduce((m, d) => (d.amountRupees > m ? d.amountRupees : m), 0);
  const baselineFloor = maxRupees > 0 ? maxRupees * 0.18 : 10;

  const chartData = data.map((d) => ({
    ...d,
    renderVal: d.amountRupees > 0 ? Math.max(d.amountRupees, baselineFloor) : baselineFloor * 0.75,
  }));

  return (
    <div className="rounded-chart bg-lime px-3 pb-3 pt-5 shadow-soft">
      <div className="h-[205px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 6, left: 6, bottom: 2 }}
            barCategoryGap="18%"
          >
            <defs>
              <pattern
                id="rechartsLimeStripes"
                width="8"
                height="8"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(45)"
              >
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="8"
                  stroke="rgba(17, 17, 17, 0.28)"
                  strokeWidth="3.2"
                />
              </pattern>
            </defs>

            <YAxis hide domain={[0, maxRupees > 0 ? maxRupees * 1.12 : 100]} />

            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              interval={0}
              tick={{ fill: '#111111', fontSize: 12, fontWeight: 500 }}
              dy={6}
            />

            <Tooltip
              cursor={{ fill: 'rgba(17,17,17,0.06)', radius: 16 }}
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const pt = payload[0].payload as TimeSeriesPoint;
                return (
                  <div className="rounded-[14px] bg-ink px-3 py-2 text-xs text-white shadow-float">
                    <div className="text-white/75">{pt.tooltipLabel}</div>
                    <div className="mt-0.5 font-semibold tabular-nums">
                      {formatINR(pt.amountPaise)}
                    </div>
                  </div>
                );
              }}
            />

            <Bar dataKey="renderVal" shape={<CapsuleBarShape />} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
