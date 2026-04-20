"use client";

import { useMemo } from "react";
import { SafeECharts as ReactECharts } from "@/components/ui/safe-echarts";
import { useTheme } from "next-themes";
import { useTimeSeries } from "@/hooks";
import { useParams } from "next/navigation";

export function MentionsChart() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const params = useParams();
  const projectId = params?.projectId as string;
  
  const { data: apiData } = useTimeSeries(projectId, 30);

  const data = useMemo(() => {
    // Guard against API errors / loading state — Array.isArray handles the
    // case where apiData is undefined, null, or unexpectedly an object.
    const safeData = Array.isArray(apiData) ? apiData : [];
    if (safeData.length > 0) {
      return safeData.map((d: { date: string; mentions: number; reach: number }) => ({
        date: d.date,
        mentions: d.mentions ?? 0,
        reach: d.reach ?? 0,
      }));
    }
    const fallback = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      fallback.push({ date: date.toISOString().split("T")[0], mentions: 0, reach: 0 });
    }
    return fallback;
  }, [apiData]);
  
  const option = useMemo(() => ({
    tooltip: {
      trigger: "axis",
      backgroundColor: isDark ? "rgba(23, 23, 23, 0.95)" : "rgba(255, 255, 255, 0.95)",
      borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
      borderWidth: 1,
      borderRadius: 8,
      padding: [12, 16],
      textStyle: {
        color: isDark ? "#e5e5e5" : "#171717",
        fontSize: 12,
      },
      formatter: (params: { name: string; marker: string; seriesName: string; value: number }[]) => {
        if (!params || params.length === 0) return "";
        let result = `<div style="font-weight: 600; margin-bottom: 8px;">${params[0]?.name ?? ""}</div>`;
        params.forEach((param) => {
          const raw = Number.isFinite(param.value) ? param.value : 0;
          const value = param.seriesName === "Reach"
            ? `${(raw / 1000).toFixed(1)}K`
            : raw.toLocaleString();
          result += `<div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;">
            ${param.marker}
            <span style="color: ${isDark ? "#a3a3a3" : "#737373"}">${param.seriesName}:</span>
            <span style="font-weight: 500;">${value}</span>
          </div>`;
        });
        return result;
      },
    },
    legend: {
      show: false,
    },
    // Generous top padding so the yAxis "Mentions" / "Reach" name labels
    // are not clipped by the parent card's `overflow:hidden`.
    grid: {
      left: 8,
      right: 8,
      bottom: 8,
      top: 36,
      containLabel: true,
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: data.map((d) => {
        const date = new Date(d.date);
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      }),
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
      axisLabel: {
        color: isDark ? "#737373" : "#a3a3a3",
        fontSize: 11,
        interval: 4,
      },
    },
    yAxis: [
      {
        type: "value",
        name: "Mentions",
        nameLocation: "end",
        nameGap: 16,
        nameTextStyle: {
          color: isDark ? "#a3a3a3" : "#737373",
          fontSize: 11,
          fontWeight: 500,
          padding: [0, 0, 4, 0],
          align: "left",
        },
        position: "left",
        axisLine: {
          show: false,
        },
        axisTick: {
          show: false,
        },
        splitLine: {
          lineStyle: {
            color: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.05)",
          },
        },
        axisLabel: {
          color: isDark ? "#737373" : "#a3a3a3",
          fontSize: 11,
        },
      },
      {
        type: "value",
        name: "Reach",
        nameLocation: "end",
        nameGap: 16,
        nameTextStyle: {
          color: isDark ? "#a3a3a3" : "#737373",
          fontSize: 11,
          fontWeight: 500,
          padding: [0, 0, 4, 0],
          align: "right",
        },
        position: "right",
        axisLine: {
          show: false,
        },
        axisTick: {
          show: false,
        },
        splitLine: {
          show: false,
        },
        axisLabel: {
          color: isDark ? "#737373" : "#a3a3a3",
          fontSize: 11,
          formatter: (value: number) => `${(value / 1000).toFixed(0)}K`,
        },
      },
    ],
    // Colour palette is plain hex / rgba — zrender's renderer doesn't
    // understand `oklch(...)` and falls back to BLACK for area fills,
    // which used to cover the whole chart with a dark blob.
    series: [
      {
        name: "Mentions",
        type: "line",
        smooth: true,
        symbol: "none",
        yAxisIndex: 0,
        data: data.map((d) => d.mentions),
        lineStyle: {
          width: 2,
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: "#22d3ee" }, // cyan-400
              { offset: 1, color: "#0d9488" }, // teal-600
            ],
          },
        },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(34, 211, 238, 0.30)" }, // cyan-400 / 30
              { offset: 1, color: "rgba(34, 211, 238, 0)" },
            ],
          },
        },
      },
      {
        name: "Reach",
        type: "line",
        smooth: true,
        symbol: "none",
        yAxisIndex: 1,
        data: data.map((d) => d.reach),
        lineStyle: {
          width: 2,
          color: "#f59e0b", // amber-500
        },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(245, 158, 11, 0.22)" }, // amber-500 / 22
              { offset: 1, color: "rgba(245, 158, 11, 0)" },
            ],
          },
        },
      },
    ],
  }), [data, isDark]);
  
  return (
    <ReactECharts
      option={option}
      style={{ height: "280px", width: "100%" }}
      opts={{ renderer: "svg" }}
    />
  );
}

