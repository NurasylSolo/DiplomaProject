/**
 * Pure ECharts option builders for the Analysis page.
 *
 * Each function takes (data, isDark, t?) and returns a serializable option
 * object — no React/JSX, no hooks. This makes them trivial to memoize at
 * the call-site and easy to unit-test.
 */

import {
  CHART_PALETTE,
  SENTIMENT_COLORS,
  chartAxisLabel,
  chartSplitLine,
  chartTooltip,
  donutItemStyle,
  num,
  safeArray,
  str,
} from "@/features/_shared";
import type { TimeSeriesData } from "@/types";
import type {
  LanguageItem,
  SourceBreakdownItem,
} from "@/lib/api/services/analytics";

type T = (key: string) => string;

// ── Overview / Sentiment / Time-series ──────────────────────────────────

export function buildSentimentDonut(
  stats:
    | {
        positive_count?: number;
        neutral_count?: number;
        negative_count?: number;
      }
    | undefined,
  isDark: boolean,
  t: T
) {
  return {
    tooltip: { trigger: "item" as const, ...chartTooltip(isDark) },
    series: [
      {
        type: "pie" as const,
        radius: ["55%", "78%"],
        itemStyle: donutItemStyle(isDark),
        label: { show: false },
        data: [
          {
            value: num(stats?.positive_count),
            name: t("mentions.sentiments.positive"),
            itemStyle: { color: SENTIMENT_COLORS.positive },
          },
          {
            value: num(stats?.neutral_count),
            name: t("mentions.sentiments.neutral"),
            itemStyle: { color: SENTIMENT_COLORS.neutral },
          },
          {
            value: num(stats?.negative_count),
            name: t("mentions.sentiments.negative"),
            itemStyle: { color: SENTIMENT_COLORS.negative },
          },
        ],
      },
    ],
  };
}

export function buildSparkline(timeSeries: TimeSeriesData[] | undefined) {
  const series = safeArray(timeSeries);
  return {
    tooltip: { trigger: "axis" as const },
    grid: { left: 8, right: 8, top: 8, bottom: 8, containLabel: false },
    xAxis: {
      type: "category" as const,
      show: false,
      data: series.map((p) => str(p.date)),
    },
    yAxis: { type: "value" as const, show: false },
    series: [
      {
        type: "line" as const,
        smooth: true,
        symbol: "none",
        // num() guards against undefined / NaN — zrender's animation
        // interpolator crashes on either.
        data: series.map((p) => num(p.mentions)),
        areaStyle: { color: "oklch(0.70 0.15 195 / 0.25)" },
        lineStyle: { width: 2, color: "oklch(0.70 0.15 195)" },
      },
    ],
  };
}

export function buildDailyStackedArea(
  timeSeries: TimeSeriesData[] | undefined,
  isDark: boolean,
  t: T
) {
  const series = safeArray(timeSeries);
  return {
    tooltip: { trigger: "axis" as const },
    legend: { bottom: 0, textStyle: { color: isDark ? "#a3a3a3" : "#525252" } },
    grid: { left: "3%", right: "4%", bottom: "12%", top: "5%", containLabel: true },
    xAxis: {
      type: "category" as const,
      boundaryGap: false,
      data: series.map((p) => str(p.date)),
      axisLabel: chartAxisLabel(isDark, 10),
    },
    yAxis: {
      type: "value" as const,
      axisLabel: chartAxisLabel(isDark),
      splitLine: chartSplitLine(isDark),
    },
    series: (
      [
        ["positive", t("mentions.sentiments.positive"), SENTIMENT_COLORS.positive],
        ["neutral", t("mentions.sentiments.neutral"), SENTIMENT_COLORS.neutral],
        ["negative", t("mentions.sentiments.negative"), SENTIMENT_COLORS.negative],
      ] as const
    ).map(([key, name, color]) => ({
      name,
      type: "line" as const,
      stack: "total",
      smooth: true,
      areaStyle: { color: `${color.replace(")", " / 0.4)")}` },
      lineStyle: { width: 1.5, color },
      data: series.map((p) =>
        num((p as unknown as Record<string, unknown>)[key])
      ),
    })),
  };
}

// ── Sentiment by topic ──────────────────────────────────────────────────

// `Topic` from /types declares sentimentDistribution with required number
// fields; the API actually returns either snake_case or camelCase with
// optional fields. We define a loose superset here.
interface TopicLike {
  name?: string;
  sentiment_distribution?: { positive?: number; neutral?: number; negative?: number };
  sentimentDistribution?: { positive?: number; neutral?: number; negative?: number };
}

export function buildSentimentByTopicBar(
  topics: TopicLike[] | undefined,
  isDark: boolean,
  t: T
) {
  const items = safeArray(topics).slice(0, 8);
  const cats = items.map((tp) => tp.name || "");
  const dist = items.map(
    (tp) => tp.sentiment_distribution || tp.sentimentDistribution || {}
  );
  return {
    tooltip: { trigger: "axis" as const },
    legend: { bottom: 0, textStyle: { color: isDark ? "#a3a3a3" : "#525252" } },
    grid: { left: "3%", right: "4%", bottom: "15%", top: "5%", containLabel: true },
    xAxis: {
      type: "category" as const,
      data: cats,
      axisLabel: {
        ...chartAxisLabel(isDark, 10),
        interval: 0,
        rotate: cats.length > 4 ? 20 : 0,
      },
    },
    yAxis: { type: "value" as const, axisLabel: chartAxisLabel(isDark) },
    series: (
      [
        ["positive", t("mentions.sentiments.positive"), SENTIMENT_COLORS.positive],
        ["neutral", t("mentions.sentiments.neutral"), SENTIMENT_COLORS.neutral],
        ["negative", t("mentions.sentiments.negative"), SENTIMENT_COLORS.negative],
      ] as const
    ).map(([key, name, color]) => ({
      name,
      type: "bar" as const,
      stack: "s",
      itemStyle: { color },
      data: dist.map((d) => num((d as Record<string, unknown>)[key])),
    })),
  };
}

// ── Sources ─────────────────────────────────────────────────────────────

export function buildSourcesBar(
  sources: SourceBreakdownItem[] | undefined,
  isDark: boolean
) {
  const items = safeArray(sources).slice(0, 10);
  return {
    tooltip: { trigger: "axis" as const, axisPointer: { type: "shadow" as const } },
    grid: { left: "3%", right: "4%", bottom: "5%", top: "5%", containLabel: true },
    xAxis: { type: "value" as const, axisLabel: chartAxisLabel(isDark) },
    yAxis: {
      type: "category" as const,
      inverse: true,
      data: items.map((s) => str(s.name)),
      axisLabel: chartAxisLabel(isDark, 11),
    },
    series: [
      {
        type: "bar" as const,
        data: items.map((s) => num(s.mentions_count)),
        itemStyle: { color: CHART_PALETTE[0], borderRadius: [0, 4, 4, 0] },
        barWidth: 14,
      },
    ],
  };
}

export function buildSourceTypeDonut(
  sources: SourceBreakdownItem[] | undefined,
  isDark: boolean
) {
  const items = safeArray(sources);
  const byType: Record<string, number> = {};
  items.forEach((s) => {
    const key = str(s.type, "other");
    byType[key] = (byType[key] || 0) + num(s.mentions_count);
  });
  const data = Object.entries(byType).map(([name, value], i) => ({
    name,
    value: num(value),
    itemStyle: { color: CHART_PALETTE[i % CHART_PALETTE.length] },
  }));
  return {
    tooltip: { trigger: "item" as const },
    series: [
      {
        type: "pie" as const,
        radius: ["55%", "78%"],
        itemStyle: donutItemStyle(isDark),
        label: { show: false },
        data,
      },
    ],
  };
}

// ── Languages ───────────────────────────────────────────────────────────

export function buildLanguagesPie(
  languages: LanguageItem[] | undefined,
  isDark: boolean
) {
  const items = safeArray(languages);
  return {
    tooltip: { trigger: "item" as const },
    legend: { bottom: 0, textStyle: { color: isDark ? "#a3a3a3" : "#525252" } },
    series: [
      {
        type: "pie" as const,
        radius: "70%",
        data: items.map((l, i) => ({
          name: str(l.name),
          value: num(l.count),
          itemStyle: { color: CHART_PALETTE[i % CHART_PALETTE.length] },
        })),
        label: { color: isDark ? "#e5e5e5" : "#171717", fontSize: 11 },
      },
    ],
  };
}

// ── Presence gauge ──────────────────────────────────────────────────────

export function buildPresenceGauge(
  presenceScore: number | null | undefined,
  isDark: boolean
) {
  const safeScore = num(presenceScore);
  return {
    series: [
      {
        type: "gauge" as const,
        startAngle: 180,
        endAngle: 0,
        min: 0,
        max: 10,
        pointer: {
          show: true,
          length: "60%",
          width: 4,
          itemStyle: { color: CHART_PALETTE[0] },
        },
        axisLine: {
          lineStyle: {
            width: 18,
            color: [
              [0.3, SENTIMENT_COLORS.negative],
              [0.7, CHART_PALETTE[2]],
              [1, SENTIMENT_COLORS.positive],
            ],
          },
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        detail: {
          valueAnimation: true,
          fontSize: 24,
          fontWeight: "bold",
          color: isDark ? "#fff" : "#171717",
          offsetCenter: [0, "20%"],
          formatter: "{value}",
        },
        data: [{ value: Number(safeScore.toFixed(1)) }],
      },
    ],
  };
}
