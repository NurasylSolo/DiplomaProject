/**
 * Shared ECharts styling tokens so every chart in the app uses the same
 * colors, axis labels and tooltip background. Pass `isDark` once and get
 * back a partial that can be spread into ECharts options.
 *
 * IMPORTANT: only hex / rgb(a) colours are supported here. zrender
 * (the renderer behind ECharts) does NOT understand `oklch(...)`; if it
 * receives one it silently falls back to BLACK, which manifests as a
 * solid dark blob covering area-fills, donut wedges, etc.
 */

export const CHART_PALETTE = [
  "#22d3ee", // cyan-400 — primary cyan
  "#10b981", // emerald-500 — green
  "#f59e0b", // amber-500 — gold
  "#ef4444", // red-500 — red
  "#8b5cf6", // violet-500 — purple
  "#ec4899", // pink-500 — pink
  "#94a3b8", // slate-400 — muted gray
];

export const SENTIMENT_COLORS = {
  positive: "#10b981", // emerald-500
  neutral: "#94a3b8",  // slate-400
  negative: "#ef4444", // red-500
} as const;

export function chartTooltip(isDark: boolean) {
  return {
    backgroundColor: isDark ? "rgba(23,23,23,0.95)" : "rgba(255,255,255,0.95)",
    borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
    textStyle: { color: isDark ? "#e5e5e5" : "#171717" },
  };
}

export function chartAxisLabel(isDark: boolean, fontSize = 11) {
  return { color: isDark ? "#737373" : "#a3a3a3", fontSize };
}

export function chartSplitLine(isDark: boolean) {
  return {
    lineStyle: { color: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" },
  };
}

/** Common item-style for donut/pie series with a card-matching border. */
export function donutItemStyle(isDark: boolean) {
  return {
    borderRadius: 6,
    borderWidth: 2,
    borderColor: isDark ? "#171717" : "#fff",
  };
}
