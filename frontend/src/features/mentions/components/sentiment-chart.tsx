"use client";

import { useMemo } from "react";
import { SafeECharts as ReactECharts } from "@/components/ui/safe-echarts";
import { useTheme } from "next-themes";
import { useParams } from "next/navigation";
import { useMentionsStats } from "@/hooks";
import { useMentionsFilterStore, buildFilterQuery } from "@/stores/use-mentions-filter-store";

export function SentimentChart() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const params = useParams();
  const projectId = params?.projectId as string;
  const { filters } = useMentionsFilterStore();
  const filterParams = useMemo(() => buildFilterQuery(filters), [filters]);
  const { data: stats } = useMentionsStats(projectId, filterParams);

  const positive = stats?.positive_percentage ?? 0;
  const neutral = stats?.neutral_percentage ?? 0;
  const negative = stats?.negative_percentage ?? 0;
  
  // Hex colours: zrender (ECharts renderer) does not understand `oklch(...)`
  // and falls back to BLACK, which paints the whole donut as a black ring.
  const sentimentData = [
    { name: "Positive", value: positive, color: "#10b981" }, // emerald-500
    { name: "Neutral", value: neutral, color: "#94a3b8" }, // slate-400
    { name: "Negative", value: negative, color: "#ef4444" }, // red-500
  ];
  
  const option = useMemo(() => ({
    tooltip: {
      trigger: "item",
      backgroundColor: isDark ? "rgba(23, 23, 23, 0.95)" : "rgba(255, 255, 255, 0.95)",
      borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
      borderWidth: 1,
      borderRadius: 8,
      padding: [12, 16],
      textStyle: {
        color: isDark ? "#e5e5e5" : "#171717",
        fontSize: 12,
      },
      formatter: (params: { marker: string; name: string; value: number; percent: number }) => {
        return `<div style="display: flex; align-items: center; gap: 8px;">
          ${params.marker}
          <span style="font-weight: 600;">${params.name}</span>
          <span style="color: ${isDark ? "#a3a3a3" : "#737373"}">${params.percent}%</span>
        </div>`;
      },
    },
    legend: {
      show: false,
    },
    series: [
      {
        name: "Sentiment",
        type: "pie",
        radius: ["55%", "80%"],
        center: ["50%", "45%"],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: isDark ? "#171717" : "#ffffff",
          borderWidth: 3,
        },
        label: {
          show: false,
        },
        emphasis: {
          scale: true,
          scaleSize: 8,
        },
        labelLine: {
          show: false,
        },
        data: sentimentData.map((item) => ({
          value: item.value,
          name: item.name,
          itemStyle: {
            color: item.color,
          },
        })),
      },
    ],
    graphic: [
      {
        type: "text",
        left: "center",
        top: "38%",
        style: {
          text: `${positive}%`,
          fontSize: 28,
          fontWeight: "bold",
          fill: isDark ? "#e5e5e5" : "#171717",
          textAlign: "center",
        },
      },
      {
        type: "text",
        left: "center",
        top: "50%",
        style: {
          text: "Positive",
          fontSize: 12,
          fill: isDark ? "#737373" : "#a3a3a3",
          textAlign: "center",
        },
      },
    ],
  }), [isDark, sentimentData, positive]);
  
  return (
    <div className="space-y-4">
      <ReactECharts
        option={option}
        style={{ height: "200px", width: "100%" }}
        opts={{ renderer: "svg" }}
      />
      
      {/* Legend */}
      <div className="flex justify-center gap-6">
        {sentimentData.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-muted-foreground">{item.name}</span>
            <span className="text-xs font-medium">{item.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

