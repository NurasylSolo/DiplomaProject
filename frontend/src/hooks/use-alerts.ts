import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { alertsApi } from "@/lib/api/services";

export function useAlertEvents(projectId: string, limit = 50) {
  return useQuery({
    queryKey: ["alert-events", projectId, limit],
    queryFn: () => alertsApi.getEvents(projectId, limit),
    enabled: !!projectId,
    refetchInterval: 30_000,
  });
}

export function useMarkAlertRead(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => alertsApi.markRead(projectId, eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-events", projectId] });
    },
  });
}

