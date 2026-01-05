"use client";

import { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { useTheme } from "next-themes";

const sentimentData = [
  { name: "Positive", value: 72, color: "oklch(0.65 0.17 155)" },
  { name: "Neutral", value: 18, color: "oklch(0.55 0.02 260)" },
  { name: "Negative", value: 10, color: "oklch(0.60 0.22 25)" },
];

export function SentimentChart() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  
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
          text: "72%",
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
  }), [isDark]);
  
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

