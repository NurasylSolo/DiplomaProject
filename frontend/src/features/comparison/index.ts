export { ComparisonHeader } from "./components/comparison-header";
export { SelectorCard } from "./components/selector-card";
export {
  OverviewTab,
  SentimentTab,
  TimeSeriesTab,
  ReachTab,
} from "./components/tabs";

export { useComparisonData } from "./hooks/use-comparison-data";

export {
  COMPARISON_PROJECT_COLORS,
  buildRadar,
  buildMentionsBar,
  buildReachBar,
  buildSentimentStackedBar,
  buildShareOfVoiceDonut,
  buildTimeSeriesLine,
  type ComparedProject,
  type ComparisonMetricKey,
} from "./utils/chart-options";
