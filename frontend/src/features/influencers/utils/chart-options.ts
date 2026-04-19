import {
  CHART_PALETTE,
  chartAxisLabel,
  donutItemStyle,
  num,
  str,
} from "@/features/_shared";
import type { InfluencerDto } from "@/lib/api/services/influencers";

export function buildTopInfluencersBar(
  influencers: InfluencerDto[],
  isDark: boolean
) {
  const top = [...influencers]
    .sort((a, b) => num(b.mentions_count) - num(a.mentions_count))
    .slice(0, 10);
  return {
    tooltip: {
      trigger: "axis" as const,
      axisPointer: { type: "shadow" as const },
    },
    grid: { left: "3%", right: "4%", bottom: "5%", top: "5%", containLabel: true },
    xAxis: { type: "value" as const, axisLabel: chartAxisLabel(isDark) },
    yAxis: {
      type: "category" as const,
      inverse: true,
      data: top.map((i) => str(i.display_name)),
      axisLabel: chartAxisLabel(isDark, 11),
    },
    series: [
      {
        type: "bar" as const,
        data: top.map((i) => num(i.mentions_count)),
        itemStyle: { color: CHART_PALETTE[0], borderRadius: [0, 4, 4, 0] },
        barWidth: 14,
      },
    ],
  };
}

export function buildPlatformDonut(
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
    tooltip: { trigger: "item" as const },
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
