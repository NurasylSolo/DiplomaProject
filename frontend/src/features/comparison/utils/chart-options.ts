import {
  CHART_PALETTE,
  SENTIMENT_COLORS,
  chartAxisLabel,
  chartSplitLine,
  donutItemStyle,
  num,
  str,
} from "@/features/_shared";
import type {
  ComparisonSentimentBucket,
  ComparisonTimeSeries,
} from "@/types";

type T = (key: string) => string;

export type ComparisonMetricKey =
  | "total_mentions"
  | "total_reach"
  | "positive_pct"
  | "neutral_pct"
  | "negative_pct"
  | "avg_influence"
  | "avg_sentiment"
  | "share_of_voice";

export interface ComparedProject {
  id: string;
  name: string;
  color: string;
}

type GetMetric = (metric: ComparisonMetricKey, itemId: string) => number;

export const COMPARISON_PROJECT_COLORS = CHART_PALETTE;

// ── Radar (5 dimensions normalised 0-100)
export function buildRadar(
  comparedProjects: ComparedProject[],
  getMetricValue: GetMetric,
  isDark: boolean,
  t: T
) {
  const indicators = [
    { name: t("comparisonPage.metrics.totalMentions"), max: 100 },
    { name: t("comparisonPage.metrics.totalReach"), max: 100 },
    { name: t("comparisonPage.metrics.positive"), max: 100 },
    { name: t("comparisonPage.metrics.shareOfVoice"), max: 100 },
    { name: t("comparisonPage.metrics.avgInfluence"), max: 100 },
  ];

  const normalise = (key: ComparisonMetricKey) => {
    const vals = comparedProjects.map((p) => num(getMetricValue(key, p.id)));
    const max = Math.max(...vals, 1);
    return comparedProjects.map((p) =>
      Math.round((num(getMetricValue(key, p.id)) / max) * 100)
    );
  };

  const mentions = normalise("total_mentions");
  const reach = normalise("total_reach");
  const sov = normalise("share_of_voice");
  const inf = normalise("avg_influence");
  const positivePct = comparedProjects.map((p) =>
    Math.round(num(getMetricValue("positive_pct", p.id)))
  );

  return {
    tooltip: {},
    legend: {
      bottom: 0,
      textStyle: { color: isDark ? "#a3a3a3" : "#737373" },
      data: comparedProjects.map((p) => str(p.name)),
    },
    radar: {
      indicator: indicators,
      axisName: chartAxisLabel(isDark, 11),
      splitArea: {
        areaStyle: {
          color: isDark
            ? ["rgba(255,255,255,0.02)", "rgba(255,255,255,0.04)"]
            : ["rgba(0,0,0,0.02)", "rgba(0,0,0,0.04)"],
        },
      },
      splitLine: {
        lineStyle: {
          color: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
        },
      },
    },
    series: [
      {
        type: "radar" as const,
        data: comparedProjects.map((p, i) => ({
          value: [
            num(mentions[i]),
            num(reach[i]),
            num(positivePct[i]),
            num(sov[i]),
            num(inf[i]),
          ],
          name: str(p.name),
          itemStyle: { color: p.color },
          lineStyle: { color: p.color, width: 2 },
          areaStyle: { color: p.color, opacity: 0.2 },
        })),
      },
    ],
  };
}

// ── Bar charts (mentions / reach)
function buildSimpleBar(
  comparedProjects: ComparedProject[],
  getMetricValue: GetMetric,
  metric: ComparisonMetricKey,
  color: string,
  legendName: string,
  isDark: boolean
) {
  return {
    tooltip: { trigger: "axis" as const, axisPointer: { type: "shadow" as const } },
    legend: { bottom: 0, textStyle: { color: isDark ? "#a3a3a3" : "#737373" } },
    grid: { left: "3%", right: "4%", bottom: "12%", top: "5%", containLabel: true },
    xAxis: {
      type: "category" as const,
      data: comparedProjects.map((p) => str(p.name)),
      axisLabel: chartAxisLabel(isDark, 11),
    },
    yAxis: { type: "value" as const, axisLabel: chartAxisLabel(isDark) },
    series: [
      {
        name: legendName,
        type: "bar" as const,
        itemStyle: { color, borderRadius: [4, 4, 0, 0] },
        data: comparedProjects.map((p) => num(getMetricValue(metric, p.id))),
      },
    ],
  };
}

export function buildMentionsBar(
  comparedProjects: ComparedProject[],
  getMetricValue: GetMetric,
  isDark: boolean,
  t: T
) {
  return buildSimpleBar(
    comparedProjects,
    getMetricValue,
    "total_mentions",
    CHART_PALETTE[0],
    t("comparisonPage.metrics.totalMentions"),
    isDark
  );
}

export function buildReachBar(
  comparedProjects: ComparedProject[],
  getMetricValue: GetMetric,
  isDark: boolean,
  t: T
) {
  return buildSimpleBar(
    comparedProjects,
    getMetricValue,
    "total_reach",
    SENTIMENT_COLORS.positive,
    t("comparisonPage.metrics.totalReach"),
    isDark
  );
}

// ── Sentiment stacked bar (per project: pos/neu/neg counts)
export function buildSentimentStackedBar(
  comparedProjects: ComparedProject[],
  sentimentDist: ComparisonSentimentBucket[],
  isDark: boolean,
  t: T
) {
  const get = (id: string, key: "positive" | "neutral" | "negative") =>
    num(sentimentDist.find((x) => x.itemId === id)?.[key]);

  return {
    tooltip: { trigger: "axis" as const, axisPointer: { type: "shadow" as const } },
    legend: { bottom: 0, textStyle: { color: isDark ? "#a3a3a3" : "#737373" } },
    grid: { left: "3%", right: "4%", bottom: "12%", top: "5%", containLabel: true },
    xAxis: {
      type: "category" as const,
      data: comparedProjects.map((p) => str(p.name)),
      axisLabel: chartAxisLabel(isDark, 11),
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
      data: comparedProjects.map((p) => get(p.id, key)),
    })),
  };
}

// ── Share-of-voice donut
export function buildShareOfVoiceDonut(
  comparedProjects: ComparedProject[],
  getMetricValue: GetMetric,
  isDark: boolean
) {
  return {
    tooltip: { trigger: "item" as const },
    legend: { bottom: 0, textStyle: { color: isDark ? "#a3a3a3" : "#737373" } },
    series: [
      {
        type: "pie" as const,
        radius: ["55%", "78%"],
        itemStyle: donutItemStyle(isDark),
        label: { show: false },
        data: comparedProjects.map((p) => ({
          name: str(p.name),
          value: num(getMetricValue("share_of_voice", p.id)),
          itemStyle: { color: p.color },
        })),
      },
    ],
  };
}

// ── Time-series line per project
export function buildTimeSeriesLine(
  comparedProjects: ComparedProject[],
  tsPerItem: ComparisonTimeSeries[],
  isDark: boolean
) {
  const dateSet = new Set<string>();
  tsPerItem.forEach((it) =>
    (it.series || []).forEach((p) => {
      if (p.date) dateSet.add(String(p.date));
    })
  );
  const dates = Array.from(dateSet).sort();

  return {
    tooltip: { trigger: "axis" as const },
    legend: {
      bottom: 0,
      textStyle: { color: isDark ? "#a3a3a3" : "#737373" },
      data: comparedProjects.map((p) => str(p.name)),
    },
    grid: { left: "3%", right: "4%", bottom: "15%", top: "5%", containLabel: true },
    xAxis: {
      type: "category" as const,
      boundaryGap: false,
      data: dates,
      axisLabel: chartAxisLabel(isDark, 10),
    },
    yAxis: {
      type: "value" as const,
      axisLabel: chartAxisLabel(isDark),
      splitLine: chartSplitLine(isDark),
    },
    series: comparedProjects.map((p) => {
      const own = tsPerItem.find((x) => x.itemId === p.id);
      const map = new Map<string, number>();
      (own?.series || []).forEach((pt) => {
        if (pt && pt.date != null) map.set(String(pt.date), num(pt.mentions));
      });
      return {
        name: str(p.name),
        type: "line" as const,
        smooth: true,
        symbol: "circle",
        symbolSize: 6,
        data: dates.map((d) => num(map.get(d))),
        itemStyle: { color: p.color },
        lineStyle: { color: p.color, width: 2 },
        areaStyle: { color: p.color, opacity: 0.08 },
      };
    }),
  };
}
