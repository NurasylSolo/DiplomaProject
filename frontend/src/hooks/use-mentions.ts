import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { mentionsApi } from "@/lib/api/services";

export interface MentionsParams {
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
  // Allow arbitrary extra params built dynamically (e.g. by buildFilterQuery)
  // without forcing every caller to widen its own type.
  [k: string]: unknown;
}

export type StatsParams = Omit<MentionsParams, "page" | "per_page" | "sort_by" | "sort_order">;

/**
 * Mentions are slightly more dynamic than analytics charts but still don't
 * change more than once per minute or so during browsing. 60 s of stale
 * tolerance + previous-data keep the table snappy when paging / filtering.
 */
const FRESH = {
  staleTime: 60 * 1000,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  placeholderData: keepPreviousData,
} as const;

export function useMentionsStats(projectId: string, params: StatsParams = {}) {
  return useQuery({
    queryKey: ["mentions-stats", projectId, params],
    queryFn: () => mentionsApi.stats(projectId, params),
    enabled: !!projectId,
    ...FRESH,
  });
}

export function useMentions(projectId: string, params: MentionsParams = {}) {
  return useQuery({
    queryKey: ["mentions", projectId, params],
    queryFn: () => mentionsApi.list(projectId, params),
    enabled: !!projectId,
    ...FRESH,
  });
}

export function useMention(projectId: string, mentionId: string) {
  return useQuery({
    queryKey: ["mentions", projectId, mentionId],
    queryFn: () => mentionsApi.get(projectId, mentionId),
    enabled: !!projectId && !!mentionId,
    ...FRESH,
  });
}

export function useMentionsByIds(projectId: string, ids: string[]) {
  // Stable cache key: sort ids so different orderings reuse the same cache entry.
  const sortedIds = [...(ids || [])].sort();
  return useQuery({
    queryKey: ["mentions", projectId, "by-ids", sortedIds.join(",")],
    queryFn: () => mentionsApi.getByIds(projectId, ids),
    enabled: !!projectId && (ids || []).length > 0,
    staleTime: 5 * 60 * 1000,
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
