import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { analyticsApi, insightsApi, influencersApi } from "@/lib/api/services";
import type { DateRangeParams } from "@/lib/api/services/analytics";

const FRESH = {
  staleTime: 0,
  refetchOnMount: "always" as const,
  refetchOnWindowFocus: true,
} as const;

export function useGeoData(projectId: string, params: DateRangeParams = {}) {
  return useQuery({
    queryKey: ["analytics", "geo", projectId, params],
    queryFn: () => analyticsApi.getGeoData(projectId, params),
    enabled: !!projectId,
    ...FRESH,
  });
}

export function useHotHours(projectId: string, params: DateRangeParams = {}) {
  return useQuery({
    queryKey: ["analytics", "hot-hours", projectId, params],
    queryFn: () => analyticsApi.getHotHours(projectId, params),
    enabled: !!projectId,
    ...FRESH,
  });
}

export function useEmotions(projectId: string, params: DateRangeParams = {}) {
  return useQuery({
    queryKey: ["analytics", "emotions", projectId, params],
    queryFn: () => analyticsApi.getEmotions(projectId, params),
    enabled: !!projectId,
    ...FRESH,
  });
}

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

export function useInfluencers(projectId: string, params?: { sort_by?: string; sort_order?: string; platform?: string }) {
  return useQuery({
    queryKey: ["influencers", projectId, params],
    queryFn: () => influencersApi.list(projectId, params),
    enabled: !!projectId,
    ...FRESH,
  });
}
