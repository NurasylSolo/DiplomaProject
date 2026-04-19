"use client";

import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAnomalies,
  useGeoData,
  useKeywords,
  useLanguages,
  useMentions,
  useMentionsStats,
  useProject,
  useSourcesBreakdown,
  useTimeSeries,
  useTopics,
  useTopLinks,
} from "@/hooks";
import {
  buildFilterQuery,
  formatDateRangeLabel,
  useMentionsFilterStore,
} from "@/stores/use-mentions-filter-store";

/**
 * Aggregates every data hook the Analysis page needs into one place.
 * Keeps the page component thin and gives us one obvious spot to add a
 * new chart / metric without polluting the JSX file.
 */
export function useAnalysisData(projectId: string) {
  const { filters, setDateRange } = useMentionsFilterStore();

  const filterParams = useMemo(() => buildFilterQuery(filters), [filters]);
  const dateRangeForApi = useMemo(
    () => ({
      date_from: filterParams.date_from as string | undefined,
      date_to: filterParams.date_to as string | undefined,
    }),
    [filterParams]
  );
  const activePreset = filters?.dateRange?.preset ?? "all";
  const dateLabel = formatDateRangeLabel(filters?.dateRange);

  const project = useProject(projectId);
  const stats = useMentionsStats(projectId, filterParams);
  const timeSeries = useTimeSeries(projectId, 30, dateRangeForApi);
  const topics = useTopics(projectId, dateRangeForApi);
  const sources = useSourcesBreakdown(projectId, {
    ...dateRangeForApi,
    limit: 50,
  });
  const geo = useGeoData(projectId, dateRangeForApi);
  const languages = useLanguages(projectId, dateRangeForApi);
  const keywords = useKeywords(projectId, { ...dateRangeForApi, limit: 60 });
  const links = useTopLinks(projectId, { ...dateRangeForApi, limit: 20 });
  const anomalies = useAnomalies(projectId, 30, 2.0);

  const topPositive = useMentions(projectId, {
    ...filterParams,
    sort_by: "sentiment_score",
    sort_order: "desc",
    per_page: 3,
  });
  const topNegative = useMentions(projectId, {
    ...filterParams,
    sort_by: "sentiment_score",
    sort_order: "asc",
    per_page: 3,
  });

  const queryClient = useQueryClient();
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["analytics"] }),
      queryClient.invalidateQueries({ queryKey: ["mentions-stats"] }),
      queryClient.invalidateQueries({ queryKey: ["mentions"] }),
      stats.refetch(),
    ]);
  };

  return {
    // raw data
    project: project.data,
    stats: stats.data,
    timeSeries: timeSeries.data,
    topics: topics.data,
    sources: sources.data,
    geo: geo.data,
    languages: languages.data,
    keywords: keywords.data,
    links: links.data,
    anomalies: anomalies.data,
    topPositive: topPositive.data,
    topNegative: topNegative.data,

    // loading / refetching
    isProjectLoading: project.isLoading,
    isStatsLoading: stats.isLoading,
    isRefetching: stats.isRefetching,

    // date filter
    activePreset,
    dateLabel,
    dateRangeForApi,
    setDateRange,

    // actions
    refresh,
  };
}
