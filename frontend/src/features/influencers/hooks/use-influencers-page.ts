"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useInfluencers } from "@/hooks";
import type {
  InfluencerDto,
  InfluencersListParams,
} from "@/lib/api/services/influencers";

export const INFLUENCERS_PAGE_SIZE = 25;

export type InfluencerSortKey = NonNullable<InfluencersListParams["sort_by"]>;

/**
 * State + data for the Influencers page.
 *
 * - The expensive sort/filter happens server-side via query params so the
 *   table can scale beyond a single page of results.
 * - The hook also derives KPI cards (totals + averages) and unique
 *   platform list for the filter dropdown from the same payload.
 */
export function useInfluencersPage(projectId: string) {
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState<string>("all");
  const [sortBy, setSortBy] = useState<InfluencerSortKey>("influence_score");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const params: InfluencersListParams = useMemo(
    () => ({
      sort_by: sortBy,
      sort_order: sortOrder,
      platform: platform !== "all" ? platform : undefined,
      search: search.trim() || undefined,
      limit: 200,
    }),
    [sortBy, sortOrder, platform, search]
  );

  const {
    data: influencers = [],
    isLoading,
    isRefetching,
    refetch,
  } = useInfluencers(projectId, params);

  const totalPages = Math.max(
    1,
    Math.ceil(influencers.length / INFLUENCERS_PAGE_SIZE)
  );
  const safePage = Math.min(page, totalPages);
  const paged = influencers.slice(
    (safePage - 1) * INFLUENCERS_PAGE_SIZE,
    safePage * INFLUENCERS_PAGE_SIZE
  );

  const stats = useMemo(() => {
    if (influencers.length === 0) {
      return {
        total: 0,
        totalReach: 0,
        totalMentions: 0,
        avgScore: 0,
        topPlatform: "—",
      };
    }
    const totalReach = influencers.reduce((acc, i) => acc + (i.reach || 0), 0);
    const totalMentions = influencers.reduce(
      (acc, i) => acc + (i.mentions_count || 0),
      0
    );
    const avgScore =
      influencers.reduce((acc, i) => acc + (i.influence_score || 0), 0) /
      influencers.length;
    const byPlatform: Record<string, number> = {};
    influencers.forEach((i) => {
      byPlatform[i.platform] = (byPlatform[i.platform] || 0) + 1;
    });
    const topPlatform =
      Object.entries(byPlatform).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
    return {
      total: influencers.length,
      totalReach,
      totalMentions,
      avgScore: Math.round(avgScore * 10) / 10,
      topPlatform,
    };
  }, [influencers]);

  const uniquePlatforms = useMemo(
    () => Array.from(new Set(influencers.map((i) => i.platform))).sort(),
    [influencers]
  );

  // Convenience: server-side sort still goes through the param above; we
  // expose a click handler for header buttons that toggles asc/desc.
  const handleSort = (key: InfluencerSortKey) => {
    if (sortBy === key) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortOrder("desc");
    }
    setPage(1);
  };

  // Reset pagination whenever a filter / search / sort changes so the user
  // never lands on an empty page.
  const setSearchValue = (v: string) => {
    setSearch(v);
    setPage(1);
  };
  const setPlatformValue = (v: string) => {
    setPlatform(v);
    setPage(1);
  };

  // ── manual refetch with cache invalidation
  const queryClient = useQueryClient();
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["influencers", projectId] }),
      refetch(),
    ]);
  };

  return {
    influencers,
    paged,
    stats,
    uniquePlatforms,

    // filters
    search,
    setSearch: setSearchValue,
    platform,
    setPlatform: setPlatformValue,

    // sort
    sortBy,
    sortOrder,
    handleSort,

    // pagination
    page: safePage,
    setPage,
    totalPages,

    // status
    isLoading,
    isRefetching,
    refresh,
  };
}

export type InfluencerRow = InfluencerDto;
