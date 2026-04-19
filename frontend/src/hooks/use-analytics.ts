import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { analyticsApi, insightsApi, influencersApi } from "@/lib/api/services";
import type {
  DateRangeParams,
  HotHoursParams,
} from "@/lib/api/services/analytics";
import type { InfluencersListParams } from "@/lib/api/services/influencers";

/**
 * Default options for analytics queries.
 *
 * - `staleTime: 2 min` — analytics charts don't change every second; this
 *   is the single biggest perf win because it stops every page navigation
 *   from kicking off a full API refetch.
 * - `refetchOnMount: false` — when the user comes back to a page within
 *   the stale window we serve cached data instantly. Hitting the explicit
 *   "Refresh" button still re-runs queries via `queryClient.invalidate*`.
 * - `placeholderData: keepPreviousData` — when query keys change (e.g. the
 *   user edits the date range) the previous chart stays visible while the
 *   next one loads, which reads as "instant" to the user instead of a
 *   flash of empty state.
 */
const FRESH = {
  staleTime: 2 * 60 * 1000,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  placeholderData: keepPreviousData,
} as const;

export function useGeoData(projectId: string, params: DateRangeParams = {}) {
  return useQuery({
    queryKey: ["analytics", "geo", projectId, params],
    queryFn: () => analyticsApi.getGeoData(projectId, params),
    enabled: !!projectId,
    ...FRESH,
  });
}

export function useHotHours(
  projectId: string,
  params: HotHoursParams = {}
) {
  return useQuery({
    queryKey: ["analytics", "hot-hours", projectId, params],
    queryFn: () => analyticsApi.getHotHours(projectId, params),
    enabled: !!projectId,
    ...FRESH,
  });
}

// useEmotions has moved to ./use-emotions (returns the rich aggregate
// response with timeline + top-per-emotion). Import directly from there.

export function useTopics(projectId: string, params: DateRangeParams = {}) {
  return useQuery({
    queryKey: ["analytics", "topics", projectId, params],
    queryFn: () => analyticsApi.getTopics(projectId, params),
    enabled: !!projectId,
    ...FRESH,
  });
}

export function useTimeSeries(
  projectId: string,
  days = 30,
  params: DateRangeParams = {}
) {
  return useQuery({
    queryKey: ["analytics", "time-series", projectId, days, params],
    queryFn: () => analyticsApi.getTimeSeries(projectId, days, params),
    enabled: !!projectId,
    ...FRESH,
  });
}

export function useAnomalies(projectId: string, days = 30, zThreshold = 2.0) {
  return useQuery({
    queryKey: ["analytics", "anomalies", projectId, days, zThreshold],
    queryFn: () => analyticsApi.getAnomalies(projectId, days, zThreshold),
    enabled: !!projectId,
    ...FRESH,
  });
}

export function useSourcesBreakdown(
  projectId: string,
  params: DateRangeParams & { limit?: number } = {}
) {
  return useQuery({
    queryKey: ["analytics", "sources-breakdown", projectId, params],
    queryFn: () => analyticsApi.getSourcesBreakdown(projectId, params),
    enabled: !!projectId,
    ...FRESH,
  });
}

export function useKeywords(
  projectId: string,
  params: DateRangeParams & { limit?: number } = {}
) {
  return useQuery({
    queryKey: ["analytics", "keywords", projectId, params],
    queryFn: () => analyticsApi.getKeywords(projectId, params),
    enabled: !!projectId,
    ...FRESH,
  });
}

export function useTopLinks(
  projectId: string,
  params: DateRangeParams & { limit?: number } = {}
) {
  return useQuery({
    queryKey: ["analytics", "top-links", projectId, params],
    queryFn: () => analyticsApi.getTopLinks(projectId, params),
    enabled: !!projectId,
    ...FRESH,
  });
}

export function useLanguages(projectId: string, params: DateRangeParams = {}) {
  return useQuery({
    queryKey: ["analytics", "languages", projectId, params],
    queryFn: () => analyticsApi.getLanguages(projectId, params),
    enabled: !!projectId,
    ...FRESH,
  });
}

export function useComparison(projectId: string) {
  return useMutation({
    mutationFn: (data: Parameters<typeof analyticsApi.compare>[1]) =>
      analyticsApi.compare(projectId, data),
  });
}

export function useInsights(projectId: string, params?: { type?: string; severity?: string }) {
  return useQuery({
    queryKey: ["insights", projectId, params],
    queryFn: () => insightsApi.list(projectId, params),
    enabled: !!projectId,
    ...FRESH,
  });
}

export function useGenerateInsights(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => insightsApi.generate(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insights", projectId] });
    },
  });
}

export function useDismissInsight(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (insightId: string) => insightsApi.dismiss(projectId, insightId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insights", projectId] });
    },
  });
}

export function useInfluencers(
  projectId: string,
  params: InfluencersListParams = {}
) {
  return useQuery({
    queryKey: ["influencers", projectId, params],
    queryFn: () => influencersApi.list(projectId, params),
    enabled: !!projectId,
    ...FRESH,
  });
}

export function useInfluencerMentions(
  projectId: string,
  influencerId: string | null,
  limit = 10
) {
  return useQuery({
    queryKey: ["influencers", projectId, "mentions", influencerId, limit],
    queryFn: () => influencersApi.mentions(projectId, influencerId as string, limit),
    enabled: !!projectId && !!influencerId,
    ...FRESH,
  });
}
