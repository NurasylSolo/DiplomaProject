import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mentionsApi } from "@/lib/api/services";

interface MentionsParams {
  page?: number;
  per_page?: number;
  date_from?: string;
  date_to?: string;
  sources?: string;
  sentiment?: string;
  search?: string;
  influence_min?: number;
  influence_max?: number;
  visited?: boolean;
  saved?: boolean;
  languages?: string;
  countries?: string;
  topic?: string;
  sort_by?: string;
  sort_order?: string;
}

type StatsParams = Omit<MentionsParams, "page" | "per_page" | "sort_by" | "sort_order">;

export function useMentionsStats(projectId: string, params: StatsParams = {}) {
  return useQuery({
    queryKey: ["mentions-stats", projectId, params],
    queryFn: () => mentionsApi.stats(projectId, params),
    enabled: !!projectId,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}

export function useMentions(projectId: string, params: MentionsParams = {}) {
  return useQuery({
    queryKey: ["mentions", projectId, params],
    queryFn: () => mentionsApi.list(projectId, params),
    enabled: !!projectId,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}

export function useMention(projectId: string, mentionId: string) {
  return useQuery({
    queryKey: ["mentions", projectId, mentionId],
    queryFn: () => mentionsApi.get(projectId, mentionId),
    enabled: !!projectId && !!mentionId,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}

export function useBulkAction(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { action: string; mention_ids: string[]; value?: unknown }) =>
      mentionsApi.bulkAction(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentions", projectId] });
    },
  });
}
