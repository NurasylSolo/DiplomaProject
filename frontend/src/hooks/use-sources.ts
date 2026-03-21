import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sourcesApi } from "@/lib/api/services";

export function useSources(projectId: string) {
  return useQuery({
    queryKey: ["sources", projectId],
    queryFn: () => sourcesApi.list(projectId),
    enabled: !!projectId,
  });
}

export function useCreateSource(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof sourcesApi.create>[1]) =>
      sourcesApi.create(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources", projectId] });
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
