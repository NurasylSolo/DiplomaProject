"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useComparison,
  useCreateProject,
  useProject,
  useProjects,
} from "@/hooks";
import { useDatePreset } from "@/features/_shared";
import type {
  ComparisonResult,
  ComparisonSentimentBucket,
  ComparisonTimeSeries,
} from "@/types";
import {
  COMPARISON_PROJECT_COLORS,
  type ComparedProject,
  type ComparisonMetricKey,
} from "../utils/chart-options";

/**
 * Owns all data + state for the Comparison page:
 * - currently selected projects (the "main" project is always first)
 * - date-range preset
 * - comparison mutation (re-fired automatically when selection or date changes)
 * - getMetricValue / winner helpers built around the latest result
 */
export function useComparisonData(projectId: string) {
  const { isLoading: isLoadingProject } = useProject(projectId);
  const { data: allProjects, isLoading: isLoadingProjects } = useProjects();
  const createProjectMutation = useCreateProject();
  const {
    mutate: runComparison,
    data: comparisonData,
    isPending: isComparing,
    reset: resetComparison,
  } = useComparison(projectId);

  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const { preset: datePreset, setPreset: setDatePreset, range: dateRangeForApi } =
    useDatePreset("all");

  const projectsList = useMemo(
    () =>
      (allProjects || []).map((project, i) => ({
        id: String(project.id),
        name: project.name || `Project ${i + 1}`,
        color: COMPARISON_PROJECT_COLORS[i % COMPARISON_PROJECT_COLORS.length],
      })),
    [allProjects]
  );

  const comparedProjectIds = useMemo(
    () => [projectId, ...selectedProjects.filter((id) => id !== projectId)],
    [projectId, selectedProjects]
  );
  const comparedKey = comparedProjectIds.join("|");

  const triggerCompare = useCallback(() => {
    if (comparedProjectIds.length < 1) return;
    runComparison({
      type: "projects",
      item_ids: comparedProjectIds,
      ...dateRangeForApi,
    });
  }, [comparedProjectIds, dateRangeForApi, runComparison]);

  // Auto-fire comparison on selection / date-range change.
  useEffect(() => {
    triggerCompare();
  }, [triggerCompare, comparedKey]);

  const comparison = (comparisonData ?? null) as ComparisonResult | null;

  const comparedProjects: ComparedProject[] = useMemo(
    () =>
      comparedProjectIds.map((id, i) => {
        const fromList = projectsList.find((p) => p.id === id);
        const fromBackend = comparison?.items?.find((item) => item.id === id);
        return {
          id,
          name: fromBackend?.name || fromList?.name || `Project ${i + 1}`,
          color: COMPARISON_PROJECT_COLORS[i % COMPARISON_PROJECT_COLORS.length],
        };
      }),
    [comparedProjectIds, projectsList, comparison]
  );

  const getMetricValue = useCallback(
    (metric: ComparisonMetricKey, itemId: string): number => {
      const bucket = comparison?.metrics?.find((m) => m.name === metric);
      const v = bucket?.values?.find(
        (item: { itemId?: string; item_id?: string; value: number }) =>
          item.itemId === itemId ||
          (item as { item_id?: string }).item_id === itemId
      );
      return Number(v?.value || 0);
    },
    [comparison]
  );

  const sentimentDist: ComparisonSentimentBucket[] =
    comparison?.sentiment_distribution || [];
  const tsPerItem: ComparisonTimeSeries[] = comparison?.time_series || [];

  const winner = useCallback(
    (metric: ComparisonMetricKey, higherIsBetter = true): string | null => {
      if (comparedProjects.length < 2) return null;
      const pairs = comparedProjects.map((p) => ({
        id: p.id,
        v: getMetricValue(metric, p.id),
      }));
      if (pairs.every((p) => p.v === 0)) return null;
      pairs.sort((a, b) => (higherIsBetter ? b.v - a.v : a.v - b.v));
      return pairs[0]?.id ?? null;
    },
    [comparedProjects, getMetricValue]
  );

  return {
    // state setters / data
    selectedProjects,
    setSelectedProjects,
    projectsList,
    comparedProjects,
    comparison,
    sentimentDist,
    tsPerItem,

    // date filter
    datePreset,
    setDatePreset,

    // computed
    getMetricValue,
    winner,

    // mutations
    runComparison,
    triggerCompare,
    resetComparison,
    createProjectMutation,

    // loading
    isLoading: isLoadingProject || isLoadingProjects,
    isComparing,
  };
}
