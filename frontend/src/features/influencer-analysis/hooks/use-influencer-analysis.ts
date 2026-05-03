"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useInfluencers, useInfluencerMentions } from "@/hooks";
import type { InfluencerDto } from "@/lib/api/services/influencers";

export const TOP_RANK_LIMIT = 10;

/**
 * Data + state for the analytical "Influencer Analysis" page.
 *
 * Unlike `/influencers` (a sortable browse table) this hook focuses on
 * KPI aggregation, top-N comparisons and drill-down into a single
 * selected voice — so the UI can render charts and live mentions without
 * fetching influencers twice on the page.
 */
export function useInfluencerAnalysis(projectId: string) {
  const queryClient = useQueryClient();

  const {
    data: influencers = [],
    isLoading,
    isRefetching,
    refetch,
  } = useInfluencers(projectId, {
    sort_by: "influence_score",
    sort_order: "desc",
    limit: 200,
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Auto-select the top influencer on first load and re-pick if the
  // current selection disappears after a refetch (source deleted etc.).
  useEffect(() => {
    if (influencers.length === 0) {
      if (selectedId !== null) setSelectedId(null);
      return;
    }
    const stillThere = influencers.some((inf) => inf.id === selectedId);
    if (!stillThere) {
      setSelectedId(influencers[0].id);
    }
  }, [influencers, selectedId]);

  const selected: InfluencerDto | null = useMemo(
    () => influencers.find((inf) => inf.id === selectedId) ?? null,
    [influencers, selectedId]
  );

  // Live recent mentions for the selected voice (10 latest).
  const mentionsQuery = useInfluencerMentions(projectId, selectedId, 10);

  // Top-N for ranking column and the bottom comparison bar.
  const topInfluencers = useMemo(
    () => influencers.slice(0, TOP_RANK_LIMIT),
    [influencers]
  );

  // Aggregated KPIs from the actual list — no mock numbers.
  const kpi = useMemo(() => {
    if (influencers.length === 0) {
      return {
        totalVoices: 0,
        avgScore: 0,
        totalReach: 0,
        topPlatform: null as string | null,
      };
    }
    const totalReach = influencers.reduce((acc, i) => acc + (i.reach || 0), 0);
    const avgScore =
      influencers.reduce((acc, i) => acc + (i.influence_score || 0), 0) /
      influencers.length;

    // Best platform = the one with the highest cumulative mention count.
    const platformMentions: Record<string, number> = {};
    influencers.forEach((i) => {
      platformMentions[i.platform] =
        (platformMentions[i.platform] || 0) + (i.mentions_count || 0);
    });
    const topPlatform =
      Object.entries(platformMentions).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      null;

    return {
      totalVoices: influencers.length,
      avgScore: Math.round(avgScore * 10) / 10,
      totalReach,
      topPlatform,
    };
  }, [influencers]);

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["influencers", projectId] }),
      refetch(),
    ]);
  };

  return {
    influencers,
    topInfluencers,
    selected,
    selectedId,
    setSelectedId,
    mentions: mentionsQuery.data ?? [],
    mentionsLoading: mentionsQuery.isLoading,
    kpi,
    isLoading,
    isRefetching,
    refresh,
  };
}
