export {
  normalizeInsightType,
  normalizeInsights,
  INSIGHT_TYPE_ICONS,
  INSIGHT_SEVERITY_COLORS,
  type InsightItem,
  type InsightSeverity,
  type InsightUiType,
} from "./utils/normalize";
export { buildInsightsTrendChart } from "./utils/chart-options";

export { InsightsHeader } from "./components/insights-header";
export { SummaryCards } from "./components/summary-cards";
export { InsightCard } from "./components/insight-card";
export { InsightsList } from "./components/insights-list";
export {
  InsightsSidebar,
  type RecommendedAction,
  type SuggestedChannel,
} from "./components/insights-sidebar";
