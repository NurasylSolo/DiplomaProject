import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sourcesApi, sourceCatalogApi } from "@/lib/api/services";

export function useSources(projectId: string) {
  return useQuery({
    queryKey: ["sources", projectId],
    queryFn: () => sourcesApi.list(projectId),
    enabled: !!projectId,
    // Source list is essentially static between user actions; mutations
    // (useCreateSource / useUpdateSource / useBulkSourcesAction) explicitly
    // invalidate this cache.
    staleTime: 2 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

export function useCreateSource(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof sourcesApi.create>[1]) =>
      sourcesApi.create(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources", projectId] });
      queryClient.invalidateQueries({ queryKey: ["analytics", "sources-breakdown", projectId] });
    },
  });
}

export function useUpdateSource(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sourceId, data }: { sourceId: string; data: Parameters<typeof sourcesApi.update>[2] }) =>
      sourcesApi.update(projectId, sourceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources", projectId] });
    },
  });
}

export function useDeleteSource(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sourceId: string) => sourcesApi.delete(projectId, sourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources", projectId] });
    },
  });
}

export function useBulkSourcesAction(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof sourcesApi.bulkAction>[1]) =>
      sourcesApi.bulkAction(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources", projectId] });
      queryClient.invalidateQueries({ queryKey: ["analytics", "sources-breakdown", projectId] });
    },
  });
}

export function useAttachCatalogSources(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof sourceCatalogApi.attach>[1]) =>
      sourceCatalogApi.attach(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources", projectId] });
    },
  });
}

export function useSourceCatalogSummary() {
  return useQuery({
    queryKey: ["source-catalog", "summary"],
    queryFn: () => sourceCatalogApi.summary(),
    staleTime: 60 * 1000,
  });
}
