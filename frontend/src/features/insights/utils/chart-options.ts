import {
  CHART_PALETTE,
  chartAxisLabel,
  chartSplitLine,
  num,
  str,
} from "@/features/_shared";
import type { TimeSeriesData } from "@/types";

/**
 * Build the daily-mentions bar chart shown in the Insights sidebar.
 * Uses a vertical gradient so bars fade out at the bottom for visual balance.
 */
export function buildInsightsTrendChart(
  timeSeries: TimeSeriesData[] | undefined,
  isDark: boolean
) {
  const data: Array<{ date: string; mentions: number }> = Array.isArray(timeSeries)
    ? timeSeries.map((d) => ({ date: str(d?.date), mentions: num(d?.mentions) }))
    : [];

  return {
    tooltip: {
      trigger: "axis" as const,
      backgroundColor: isDark ? "rgba(23,23,23,0.95)" : "rgba(255,255,255,0.95)",
    },
    grid: { left: "3%", right: "4%", bottom: "3%", top: "8%", containLabel: true },
    xAxis: {
      type: "category" as const,
      data: data.map((d) => {
        const dt = d.date ? new Date(d.date) : null;
        if (!dt || Number.isNaN(dt.getTime())) return "";
        return dt.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      }),
      axisLabel: {
        ...chartAxisLabel(isDark, 10),
        interval: Math.max(0, Math.floor(data.length / 8)),
      },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value" as const,
      axisLabel: chartAxisLabel(isDark, 10),
      splitLine: chartSplitLine(isDark),
    },
    series: [
      {
        type: "bar" as const,
        data: data.map((d) => num(d.mentions)),
        itemStyle: {
          color: {
            type: "linear" as const,
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: CHART_PALETTE[0] },
              // rgba so zrender renders the gradient stop instead of falling
              // back to black on `oklch(...)`.
              { offset: 1, color: "rgba(34, 211, 238, 0.40)" },
            ],
          },
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
  };
}
