/**
 * Shared ECharts styling tokens so every chart in the app uses the same
 * colors, axis labels and tooltip background. Pass `isDark` once and get
 * back a partial that can be spread into ECharts options.
 */

export const CHART_PALETTE = [
  "oklch(0.70 0.15 195)", // primary cyan
  "oklch(0.65 0.17 155)", // green
  "oklch(0.75 0.14 75)", // gold
  "oklch(0.60 0.22 25)", // red
  "oklch(0.65 0.18 290)", // purple
  "oklch(0.70 0.18 350)", // pink
  "oklch(0.55 0.02 260)", // muted gray
];

export const SENTIMENT_COLORS = {
  positive: "oklch(0.65 0.17 155)",
  neutral: "oklch(0.55 0.02 260)",
  negative: "oklch(0.60 0.22 25)",
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
