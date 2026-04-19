import {
  CHART_PALETTE,
  chartAxisLabel,
  donutItemStyle,
  num,
  str,
} from "@/features/_shared";
import type { SourceRow } from "../types";

export function buildTopSourcesBar(sources: SourceRow[], isDark: boolean) {
  const top = [...sources]
    .sort((a, b) => num(b.mentionCount) - num(a.mentionCount))
    .slice(0, 10);
  return {
    tooltip: { trigger: "axis" as const, axisPointer: { type: "shadow" as const } },
    grid: { left: "3%", right: "4%", bottom: "5%", top: "5%", containLabel: true },
    xAxis: { type: "value" as const, axisLabel: chartAxisLabel(isDark) },
    yAxis: {
      type: "category" as const,
      inverse: true,
      data: top.map((s) => str(s.name)),
      axisLabel: chartAxisLabel(isDark, 11),
    },
    series: [
      {
        type: "bar" as const,
        data: top.map((s) => num(s.mentionCount)),
        itemStyle: { color: CHART_PALETTE[0], borderRadius: [0, 4, 4, 0] },
        barWidth: 14,
      },
    ],
  };
}

export function buildTypesDonut(sources: SourceRow[], isDark: boolean) {
  const byType: Record<string, number> = {};
  sources.forEach((s) => {
    const key = str(s.type, "other");
    byType[key] = (byType[key] || 0) + num(s.mentionCount);
  });
  const data = Object.entries(byType)
    .filter(([, v]) => v > 0)
    .map(([name, value], i) => ({
      name,
      value: num(value),
      itemStyle: { color: CHART_PALETTE[i % CHART_PALETTE.length] },
    }));
  return {
    tooltip: { trigger: "item" as const },
    legend: { bottom: 0, textStyle: { color: isDark ? "#a3a3a3" : "#525252" } },
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
