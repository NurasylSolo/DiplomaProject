import { useQuery, useMutation } from "@tanstack/react-query";
import { analyticsApi, insightsApi, influencersApi } from "@/lib/api/services";

export function useGeoData(projectId: string) {
  return useQuery({
    queryKey: ["analytics", "geo", projectId],
    queryFn: () => analyticsApi.getGeoData(projectId),
    enabled: !!projectId,
  });
}

export function useHotHours(projectId: string) {
  return useQuery({
    queryKey: ["analytics", "hot-hours", projectId],
    queryFn: () => analyticsApi.getHotHours(projectId),
    enabled: !!projectId,
  });
}

export function useEmotions(projectId: string) {
  return useQuery({
    queryKey: ["analytics", "emotions", projectId],
    queryFn: () => analyticsApi.getEmotions(projectId),
    enabled: !!projectId,
  });
}

export function useTopics(projectId: string) {
  return useQuery({
    queryKey: ["analytics", "topics", projectId],
    queryFn: () => analyticsApi.getTopics(projectId),
    enabled: !!projectId,
  });
}

export function useTimeSeries(projectId: string, days = 30) {
  return useQuery({
    queryKey: ["analytics", "time-series", projectId, days],
    queryFn: () => analyticsApi.getTimeSeries(projectId, days),
    enabled: !!projectId,
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
  });
}

export function useInfluencers(projectId: string, params?: { sort_by?: string; sort_order?: string; platform?: string }) {
  return useQuery({
    queryKey: ["influencers", projectId, params],
    queryFn: () => influencersApi.list(projectId, params),
    enabled: !!projectId,
  });
}
