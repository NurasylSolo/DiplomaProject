import {
  chartAxisLabel,
  chartSplitLine,
  donutItemStyle,
  num,
  str,
} from "@/features/_shared";
import type {
  EmotionDailyPoint,
  EmotionScores,
} from "@/lib/api/services/emotions";
import { EMOTION_META } from "./emotion-meta";

type T = (key: string, options?: Record<string, unknown>) => string;

/**
 * Donut showing the average score per emotion across the selected date
 * range. The slice colours match the cards / timeline so the user can
 * triangulate "this purple slice = anticipation" without a legend lookup.
 */
export function buildEmotionDonut(
  averages: EmotionScores | undefined,
  isDark: boolean,
  t: T
) {
  return {
    tooltip: {
      trigger: "item" as const,
      formatter: "{b}: {d}%",
    },
    legend: { bottom: 0, textStyle: { color: isDark ? "#a3a3a3" : "#525252" } },
    series: [
      {
        type: "pie" as const,
        radius: ["55%", "78%"],
        itemStyle: donutItemStyle(isDark),
        label: { show: false },
        data: EMOTION_META.map((m) => ({
          name: t(`emotionsPage.names.${m.i18nKey}`, { defaultValue: m.key }),
          value: num(averages?.[m.key]),
          itemStyle: { color: m.color },
        })),
      },
    ],
  };
}

/**
 * Stacked area chart of all 8 emotions over time. Useful to spot when a
 * news cycle was driven by, say, anger or fear vs joy.
 */
export function buildEmotionTimeline(
  points: EmotionDailyPoint[] | undefined,
  isDark: boolean,
  t: T
) {
  const safePoints = Array.isArray(points) ? points : [];
  return {
    tooltip: { trigger: "axis" as const },
    legend: {
      bottom: 0,
      textStyle: { color: isDark ? "#a3a3a3" : "#525252" },
      type: "scroll" as const,
    },
    grid: { left: "3%", right: "3%", bottom: "15%", top: "5%", containLabel: true },
    xAxis: {
      type: "category" as const,
      boundaryGap: false,
      data: safePoints.map((p) => str(p.date)),
      axisLabel: chartAxisLabel(isDark, 10),
    },
    yAxis: {
      type: "value" as const,
      axisLabel: chartAxisLabel(isDark),
      splitLine: chartSplitLine(isDark),
    },
    series: EMOTION_META.map((m) => ({
      name: t(`emotionsPage.names.${m.i18nKey}`, { defaultValue: m.key }),
      type: "line" as const,
      stack: "total",
      smooth: true,
      symbol: "none",
      areaStyle: { opacity: 0.6, color: m.color },
      lineStyle: { width: 0 },
      data: safePoints.map((p) => num(p[m.key])),
    })),
  };
}
