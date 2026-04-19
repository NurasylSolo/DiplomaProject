import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { emotionsApi } from "@/lib/api/services";
import type { DateRangeParams } from "@/lib/api/services/analytics";

/**
 * Same caching profile as the analytics hooks: ~2 minute stale time and
 * placeholder previous data so the UI doesn't flash to "0%" while a date
 * range change refetches.
 */
const FRESH = {
  staleTime: 2 * 60 * 1000,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  placeholderData: keepPreviousData,
} as const;

export function useEmotionsData(
  projectId: string,
  params: DateRangeParams = {}
) {
  return useQuery({
    queryKey: ["emotions", projectId, params],
    queryFn: () => emotionsApi.aggregate(projectId, params),
    enabled: !!projectId,
    ...FRESH,
  });
}

export function useBackfillEmotions(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (limit?: number) => emotionsApi.backfill(projectId, limit),
    onSuccess: () => {
      // Backfilling rewrites mention.emotions on every match, so the
      // aggregate AND the mentions table both need a fresh fetch.
      queryClient.invalidateQueries({ queryKey: ["emotions", projectId] });
      queryClient.invalidateQueries({ queryKey: ["mentions", projectId] });
      queryClient.invalidateQueries({
        queryKey: ["analytics", "emotions", projectId],
      });
    },
  });
}
