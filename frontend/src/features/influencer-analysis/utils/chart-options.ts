import {
  CHART_PALETTE,
  SENTIMENT_COLORS,
  chartAxisLabel,
  chartSplitLine,
  chartTooltip,
  donutItemStyle,
  num,
  str,
} from "@/features/_shared";
import type { InfluencerDto } from "@/lib/api/services/influencers";

const TOP_N_FOR_CHARTS = 10;

/**
 * Horizontal bar of the top N influencers by influence_score.
 * The colour is the project accent so it matches the rest of the deep-
 * analytics page.
 */
export function buildInfluenceScoreBar(
  influencers: InfluencerDto[],
  isDark: boolean
) {
  const top = [...influencers]
    .sort((a, b) => num(b.influence_score) - num(a.influence_score))
    .slice(0, TOP_N_FOR_CHARTS);
  return {
    tooltip: {
      trigger: "axis" as const,
      axisPointer: { type: "shadow" as const },
      ...chartTooltip(isDark),
    },
    grid: { left: "3%", right: "4%", bottom: "3%", top: "5%", containLabel: true },
    xAxis: {
      type: "value" as const,
      max: 100,
      axisLabel: chartAxisLabel(isDark),
      splitLine: chartSplitLine(isDark),
    },
    yAxis: {
      type: "category" as const,
      inverse: true,
      data: top.map((i) => str(i.display_name)),
      axisLabel: chartAxisLabel(isDark, 11),
    },
    series: [
      {
        type: "bar" as const,
        data: top.map((i) => num(i.influence_score)),
        itemStyle: { color: CHART_PALETTE[0], borderRadius: [0, 4, 4, 0] },
        barWidth: 14,
      },
    ],
  };
}

/** Donut showing how mentions are distributed across platforms
 *  (news / blogs / twitter / etc.). */
export function buildPlatformShareDonut(
  influencers: InfluencerDto[],
  isDark: boolean
) {
  const byPlatform: Record<string, number> = {};
  influencers.forEach((i) => {
    const key = str(i.platform, "other");
    byPlatform[key] = (byPlatform[key] || 0) + num(i.mentions_count);
  });
  const data = Object.entries(byPlatform)
    .filter(([, v]) => v > 0)
    .map(([name, value], idx) => ({
      name,
      value: num(value),
      itemStyle: { color: CHART_PALETTE[idx % CHART_PALETTE.length] },
    }));
  return {
    tooltip: { trigger: "item" as const, ...chartTooltip(isDark) },
    legend: {
      bottom: 0,
      textStyle: { color: isDark ? "#a3a3a3" : "#525252" },
    },
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

/**
 * Stacked horizontal bar showing sentiment composition for top N voices
 * — quick-look "who covers us positively vs negatively".
 */
export function buildSentimentStack(
  influencers: InfluencerDto[],
  isDark: boolean,
  labels: { positive: string; neutral: string; negative: string }
) {
  const top = [...influencers]
    .filter((i) => num(i.mentions_count) > 0)
    .sort((a, b) => num(b.mentions_count) - num(a.mentions_count))
    .slice(0, TOP_N_FOR_CHARTS);

  const names = top.map((i) => str(i.display_name));
  const positive = top.map((i) => num(i.sentiment_distribution?.positive));
  const neutral = top.map((i) => num(i.sentiment_distribution?.neutral));
  const negative = top.map((i) => num(i.sentiment_distribution?.negative));

  return {
    tooltip: {
      trigger: "axis" as const,
      axisPointer: { type: "shadow" as const },
      ...chartTooltip(isDark),
    },
    legend: {
      bottom: 0,
      textStyle: { color: isDark ? "#a3a3a3" : "#525252" },
      data: [labels.positive, labels.neutral, labels.negative],
    },
    grid: { left: "3%", right: "4%", bottom: 36, top: "5%", containLabel: true },
    xAxis: {
      type: "value" as const,
      axisLabel: chartAxisLabel(isDark),
      splitLine: chartSplitLine(isDark),
    },
    yAxis: {
      type: "category" as const,
      inverse: true,
      data: names,
      axisLabel: chartAxisLabel(isDark, 11),
    },
    series: [
      {
        name: labels.positive,
        type: "bar" as const,
        stack: "sentiment",
        itemStyle: { color: SENTIMENT_COLORS.positive },
        data: positive,
        barWidth: 14,
      },
      {
        name: labels.neutral,
        type: "bar" as const,
        stack: "sentiment",
        itemStyle: { color: SENTIMENT_COLORS.neutral },
        data: neutral,
        barWidth: 14,
      },
      {
        name: labels.negative,
        type: "bar" as const,
        stack: "sentiment",
        itemStyle: { color: SENTIMENT_COLORS.negative },
        data: negative,
        barWidth: 14,
      },
    ],
  };
}
