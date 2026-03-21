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
  sort_by?: string;
  sort_order?: string;
}

export function useMentions(projectId: string, params: MentionsParams = {}) {
  return useQuery({
    queryKey: ["mentions", projectId, params],
    queryFn: () => mentionsApi.list(projectId, params),
    enabled: !!projectId,
    staleTime: 30 * 1000,
  });
}

export function useMention(projectId: string, mentionId: string) {
  return useQuery({
    queryKey: ["mentions", projectId, mentionId],
    queryFn: () => mentionsApi.get(projectId, mentionId),
    enabled: !!projectId && !!mentionId,
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
