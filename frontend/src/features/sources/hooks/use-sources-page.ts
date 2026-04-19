"use client";

import { useMemo, useState } from "react";
import {
  useSources,
  useCreateSource,
  useUpdateSource,
  useDeleteSource,
  useBulkSourcesAction,
  useAttachCatalogSources,
} from "@/hooks";
import { apiSourceToRow } from "../utils/transform";
import type { SortKey, SortOrder, SourceRow } from "../types";

export const SOURCES_PAGE_SIZE = 25;

/**
 * Owns all state and derived data for the Sources page:
 * filters, sort, pagination, selection, plus the API mutations the
 * dialogs / table need.
 */
export function useSourcesPage(projectId: string) {
  const { data: apiSources, isLoading, refetch, isRefetching } = useSources(projectId);
  const createMutation = useCreateSource(projectId);
  const updateMutation = useUpdateSource(projectId);
  const deleteMutation = useDeleteSource(projectId);
  const bulkMutation = useBulkSourcesAction(projectId);
  const attachMutation = useAttachCatalogSources(projectId);

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [trustedFilter, setTrustedFilter] = useState<string>("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [languageFilter, setLanguageFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortKey>("mentions");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);

  const sources: SourceRow[] = useMemo(
    () => (apiSources || []).map((s) => apiSourceToRow(s)),
    [apiSources]
  );

  const uniqueCountries = useMemo(
    () =>
      Array.from(
        new Set(sources.map((s) => s.country).filter((x): x is string => !!x))
      ).sort(),
    [sources]
  );
  const uniqueLanguages = useMemo(
    () =>
      Array.from(
        new Set(sources.map((s) => s.language).filter((x): x is string => !!x))
      ).sort(),
    [sources]
  );
  const uniqueTypes = useMemo(
    () => Array.from(new Set(sources.map((s) => s.type))).sort(),
    [sources]
  );

  const filtered: SourceRow[] = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sources.filter((s) => {
      if (q && !`${s.name} ${s.baseUrl}`.toLowerCase().includes(q)) return false;
      if (typeFilter !== "all" && s.type !== typeFilter) return false;
      if (activeFilter === "active" && !s.active) return false;
      if (activeFilter === "inactive" && s.active) return false;
      if (trustedFilter === "trusted" && !s.trusted) return false;
      if (trustedFilter === "untrusted" && s.trusted) return false;
      if (countryFilter !== "all" && s.country !== countryFilter) return false;
      if (languageFilter !== "all" && s.language !== languageFilter) return false;
      return true;
    });
  }, [
    sources,
    searchQuery,
    typeFilter,
    activeFilter,
    trustedFilter,
    countryFilter,
    languageFilter,
  ]);

  const sorted: SourceRow[] = useMemo(() => {
    const dir = sortOrder === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name) * dir;
        case "type":
          return a.type.localeCompare(b.type) * dir;
        case "mentions":
          return (a.mentionCount - b.mentionCount) * dir;
        case "reach":
          return (a.totalReach - b.totalReach) * dir;
        case "trust":
          return (a.trustScore - b.trustScore) * dir;
        case "lastPublished": {
          const av = a.lastPublishedAt?.getTime() ?? 0;
          const bv = b.lastPublishedAt?.getTime() ?? 0;
          return (av - bv) * dir;
        }
        default:
          return 0;
      }
    });
  }, [filtered, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / SOURCES_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = sorted.slice(
    (safePage - 1) * SOURCES_PAGE_SIZE,
    safePage * SOURCES_PAGE_SIZE
  );

  const stats = useMemo(
    () => ({
      total: sources.length,
      active: sources.filter((s) => s.active).length,
      trusted: sources.filter((s) => s.trusted).length,
      mentions: sources.reduce((acc, s) => acc + s.mentionCount, 0),
    }),
    [sources]
  );

  // ── selection helpers
  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const allVisibleSelected = paged.every((s) => prev.has(s.id));
      const next = new Set(prev);
      if (allVisibleSelected) paged.forEach((s) => next.delete(s.id));
      else paged.forEach((s) => next.add(s.id));
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleSort = (key: SortKey) => {
    if (sortBy === key) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    else {
      setSortBy(key);
      setSortOrder("desc");
    }
  };

  // Reset page to 1 whenever any filter changes (used by Select onChange).
  const updateAndResetPage =
    <T,>(setter: (v: T) => void) =>
    (v: T) => {
      setter(v);
      setPage(1);
    };

  return {
    sources,
    filtered,
    sorted,
    paged,
    stats,
    uniqueCountries,
    uniqueLanguages,
    uniqueTypes,

    // filter state
    searchQuery,
    setSearchQuery: updateAndResetPage(setSearchQuery),
    typeFilter,
    setTypeFilter: updateAndResetPage(setTypeFilter),
    activeFilter,
    setActiveFilter: updateAndResetPage(setActiveFilter),
    trustedFilter,
    setTrustedFilter: updateAndResetPage(setTrustedFilter),
    countryFilter,
    setCountryFilter: updateAndResetPage(setCountryFilter),
    languageFilter,
    setLanguageFilter: updateAndResetPage(setLanguageFilter),

    // sort
    sortBy,
    sortOrder,
    handleSort,

    // pagination
    page: safePage,
    setPage,
    totalPages,

    // selection
    selectedIds,
    toggleSelected,
    toggleSelectAllVisible,
    clearSelection,

    // mutations
    refetch,
    isRefetching,
    isLoading,
    createMutation,
    updateMutation,
    deleteMutation,
    bulkMutation,
    attachMutation,
  };
}
