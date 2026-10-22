import { formatNumber, formatSignedNumber } from "../../lib/format";
import type { FanGrowthTrendPoint } from "./fanGrowthTypes";

type TrendLineChartProps = {
  points: FanGrowthTrendPoint[];
  accentClassName: string;
};

export function TrendLineChart({ points, accentClassName }: TrendLineChartProps) {
  if (points.length === 0) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
        없음
      </div>
    );
  }

  const width = 720;
  const height = 260;
  const padding = { top: 24, right: 28, bottom: 48, left: 48 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const values = points.flatMap((point) => [point.increase, point.averageIncrease ?? 0]);
  const maxValue = Math.max(...values, 0);
  const minValue = Math.min(...values, 0);
  const range = maxValue - minValue || 1;

  const coordinates = points.map((point, index) => {
    const x =
      padding.left +
      (points.length === 1 ? innerWidth / 2 : (innerWidth / (points.length - 1)) * index);
    const y = padding.top + ((maxValue - point.increase) / range) * innerHeight;

    return {
      ...point,
      x,
      y,
    };
  });

  const pathData = coordinates
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const averagePathData = coordinates
    .map((point, index) => {
      const averageY = padding.top + ((maxValue - (point.averageIncrease ?? 0)) / range) * innerHeight;
      return `${index === 0 ? "M" : "L"} ${point.x} ${averageY}`;
    })
    .join(" ");
  const zeroY = padding.top + ((maxValue - 0) / range) * innerHeight;

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-semibold text-slate-900">최근 7개월 팬 수 증감</div>
        <div className="flex flex-wrap gap-4 text-xs text-slate-500">
          <span className="inline-flex items-center gap-2"><i className="h-0.5 w-5 rounded bg-slate-800" />선택한 멤버</span>
          <span className="inline-flex items-center gap-2"><i className="w-5 border-t border-dashed border-amber-500" />전체 멤버 평균</span>
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
        <line
          x1={padding.left}
          y1={zeroY}
          x2={width - padding.right}
          y2={zeroY}
          stroke="rgba(148, 163, 184, 0.45)"
          strokeDasharray="4 4"
        />
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={height - padding.bottom}
          stroke="rgba(148, 163, 184, 0.35)"
        />
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke="rgba(148, 163, 184, 0.35)"
        />
        <path
          d={pathData}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          className={accentClassName}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={averagePathData}
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2"
          strokeDasharray="4 6"
          strokeLinecap="round"
        />

        {coordinates.map((point) => (
          <g key={point.periodId}>
            <circle
              cx={point.x}
              cy={point.y}
              r="5"
              fill="white"
              stroke="currentColor"
              strokeWidth="3"
              className={accentClassName}
            />
            <text
              x={point.x}
              y={point.y - 12}
              textAnchor="middle"
              className="fill-slate-600 text-[11px] font-semibold"
            >
              {formatSignedNumber(point.increase)}
            </text>
            <text
              x={point.x}
              y={height - 18}
              textAnchor="middle"
              className="fill-slate-500 text-[11px]"
            >
              {point.periodLabel}
            </text>
          </g>
        ))}
      </svg>

      <div className="mt-4 overflow-x-auto">
        <div className="grid min-w-[560px] grid-cols-4 gap-3 text-xs text-slate-600">
          {points.map((point) => (
            <div key={point.periodId} className="rounded-2xl bg-slate-50 p-3">
              <div className="font-semibold text-slate-900">{point.periodLabel}</div>
              <div className="mt-2">{formatSignedNumber(point.increase)}</div>
              <div className="mt-1 text-amber-700">평균 {formatSignedNumber(point.averageIncrease ?? 0)}</div>
              <div className="mt-1">{formatNumber(point.previousFans)}</div>
              <div className="mt-1">{formatNumber(point.currentFans)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
