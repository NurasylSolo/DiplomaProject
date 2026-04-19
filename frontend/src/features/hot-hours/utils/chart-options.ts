import { num } from "@/features/_shared";
import type { HotHoursCell } from "@/lib/api/services/analytics";
import {
  DAY_DISPLAY_ORDER,
  HOUR_RANGE,
  dayLabel,
  formatHour24,
} from "./days-hours";

type T = (key: string, options?: Record<string, unknown>) => string;

/**
 * Build an ECharts heatmap option for a 7-row × 24-column grid.
 *
 * Design notes — most of the polish lives here, not in the React layer:
 *
 * - **Dense grid.** ECharts' heatmap series only draws the cells we
 *   pass in. We therefore pre-fill every (day, hour) bucket with a
 *   `null` value for empty slots so the grid is visually complete and
 *   the user can see "no activity" cells as soft placeholders rather
 *   than holes.
 * - **Rounded cells with breathing room.** A teal border = card bg
 *   colour gives the impression of separated tiles without adding a
 *   real gutter (which heatmap series can't do).
 * - **Colour ramp.** Cool low → bright accent mid → warm peak. Hidden
 *   `seriesIndex` of the visualMap maps strictly to the data series
 *   so the legend matches what's drawn.
 * - **Axis labels.** Hours are shown every 2 hours (00, 02, …, 22) so
 *   they don't crowd. Day rows always render full names.
 * - **In-cell value labels.** Drawn only for the top ~10 cells —
 *   numbers everywhere makes the grid look noisy.
 */
export function buildHeatmapOption(
  cells: HotHoursCell[] | undefined,
  isDark: boolean,
  t: T
) {
  const safeCells = Array.isArray(cells) ? cells : [];

  // Lookup so the tooltip / value-label can find the cell in O(1).
  const lookup = new Map<string, HotHoursCell>();
  for (const c of safeCells) lookup.set(`${c.day}-${c.hour}`, c);

  // Pre-fill the full 7×24 grid. Cells with no mentions get `null` so
  // ECharts paints them with the visualMap "out-of-range" colour —
  // perfect for a faded "no activity" tile.
  const data: [number, number, number | null][] = [];
  DAY_DISPLAY_ORDER.forEach((apiDay, row) => {
    HOUR_RANGE.forEach((hour) => {
      const cell = lookup.get(`${apiDay}-${hour}`);
      data.push([hour, row, cell ? num(cell.mentions) : null]);
    });
  });

  const peak = safeCells.reduce(
    (max, c) => (c.mentions > max ? c.mentions : max),
    0
  );
  const yAxisLabels = DAY_DISPLAY_ORDER.map((d) => dayLabel(d, t));

  // Threshold above which we draw the mentions number on the cell. We
  // pick the 10th-largest cell value so the labels never crowd more
  // than ~10 cells regardless of distribution.
  const sortedDesc = [...safeCells].sort((a, b) => b.mentions - a.mentions);
  const labelThreshold = sortedDesc[10]?.mentions ?? Math.max(1, peak * 0.6);

  // Theme-aware colours. Low end stays inside the card surface so empty
  // cells almost disappear; high end reaches a warm accent.
  const cardBg = isDark ? "#0f172a" : "#ffffff";
  const emptyTile = isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.04)";
  const colorRamp = isDark
    ? ["#0f3a36", "#0d9488", "#14b8a6", "#22d3ee", "#facc15", "#f97316"]
    : ["#ccfbf1", "#5eead4", "#14b8a6", "#0d9488", "#f59e0b", "#ea580c"];
  const axisColor = isDark ? "#94a3b8" : "#475569";
  const tooltipBg = isDark ? "rgba(15,23,42,0.96)" : "rgba(255,255,255,0.96)";
  const tooltipBorder = isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.12)";
  const tooltipText = isDark ? "#e2e8f0" : "#0f172a";

  return {
    tooltip: {
      backgroundColor: tooltipBg,
      borderColor: tooltipBorder,
      borderWidth: 1,
      padding: [10, 12],
      textStyle: { color: tooltipText, fontSize: 12 },
      extraCssText: "border-radius:10px;box-shadow:0 12px 32px rgba(0,0,0,0.18);",
      formatter: (params: { value: [number, number, number | null] }) => {
        const [hour, row, mentions] = params.value;
        const apiDay = DAY_DISPLAY_ORDER[row];
        const cell = lookup.get(`${apiDay}-${hour}`);
        const day = dayLabel(apiDay, t);
        if (!cell || !mentions) {
          return `<div style="font-weight:600;margin-bottom:2px">${day}, ${formatHour24(hour)}</div>
<div style="opacity:0.7">${t("hotHoursPage.empty.noActivity", { defaultValue: "No activity" })}</div>`;
        }
        const reach = cell.reach ?? 0;
        const avg = cell.avg_sentiment ?? 0;
        const sentimentLabel =
          avg >= 0.1
            ? t("mentions.sentiments.positive")
            : avg <= -0.1
              ? t("mentions.sentiments.negative")
              : t("mentions.sentiments.neutral");
        const sentimentColor =
          avg >= 0.1 ? "#10b981" : avg <= -0.1 ? "#ef4444" : "#94a3b8";
        return `
<div style="font-weight:600;margin-bottom:6px;font-size:13px">${day}, ${formatHour24(hour)}</div>
<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
  <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#0d9488"></span>
  <span style="opacity:0.7">${t("hotHoursPage.tooltip.mentions", { defaultValue: "Mentions" })}:</span>
  <b style="font-variant-numeric:tabular-nums">${mentions}</b>
</div>
<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
  <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#3b82f6"></span>
  <span style="opacity:0.7">${t("hotHoursPage.tooltip.reach", { defaultValue: "Reach" })}:</span>
  <span style="font-variant-numeric:tabular-nums">${reach.toLocaleString()}</span>
</div>
<div style="display:flex;align-items:center;gap:6px">
  <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${sentimentColor}"></span>
  <span style="opacity:0.7">${t("hotHoursPage.tooltip.sentiment", { defaultValue: "Sentiment" })}:</span>
  <span>${sentimentLabel}</span>
  <span style="opacity:0.6;font-variant-numeric:tabular-nums">${avg >= 0 ? "+" : ""}${avg.toFixed(2)}</span>
</div>`;
      },
    },
    grid: { left: 56, right: 24, top: 16, bottom: 64, containLabel: true },
    xAxis: {
      type: "category" as const,
      data: HOUR_RANGE.map((h) => formatHour24(h)),
      splitArea: { show: false },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: axisColor,
        fontSize: 11,
        // Show every 2nd label (00, 02, …, 22) — full strip is too dense
        // to read on common widths.
        interval: 1,
        margin: 12,
      },
    },
    yAxis: {
      type: "category" as const,
      data: yAxisLabels,
      splitArea: { show: false },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: axisColor,
        fontSize: 12,
        fontWeight: 500,
        margin: 14,
      },
    },
    visualMap: {
      min: 0,
      max: Math.max(1, peak),
      calculable: true,
      orient: "horizontal" as const,
      left: "center",
      bottom: 4,
      itemWidth: 14,
      itemHeight: 140,
      textStyle: { color: axisColor, fontSize: 11 },
      text: [
        t("hotHoursPage.legend.more", { defaultValue: "More" }),
        t("hotHoursPage.legend.less", { defaultValue: "Less" }),
      ],
      inRange: { color: colorRamp },
      // Empty (null) cells get this tile colour — almost invisible but
      // enough to keep the grid coherent.
      outOfRange: { color: emptyTile },
      seriesIndex: 0,
    },
    series: [
      {
        type: "heatmap" as const,
        data,
        // Border with the card background acts as a virtual gutter.
        itemStyle: {
          borderRadius: 4,
          borderWidth: 2,
          borderColor: cardBg,
        },
        emphasis: {
          itemStyle: {
            borderColor: isDark ? "#facc15" : "#0f766e",
            borderWidth: 2,
            shadowBlur: 14,
            shadowColor: isDark
              ? "rgba(250,204,21,0.45)"
              : "rgba(15,118,110,0.35)",
          },
          label: {
            show: true,
            color: isDark ? "#0f172a" : "#0f172a",
            fontWeight: 700,
          },
        },
        label: {
          show: true,
          // Only label cells loud enough to be worth annotating; the
          // others stay clean.
          formatter: (p: { value: [number, number, number | null] }) => {
            const v = p.value[2];
            if (v === null || v < labelThreshold) return "";
            return String(v);
          },
          color: isDark ? "#0f172a" : "#0f172a",
          fontSize: 11,
          fontWeight: 600,
        },
        progressive: 1000,
        animation: false,
      },
    ],
  };
}
