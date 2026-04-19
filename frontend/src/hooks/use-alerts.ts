import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { alertsApi } from "@/lib/api/services";

export function useAlertEvents(projectId: string, limit = 50) {
  return useQuery({
    queryKey: ["alert-events", projectId, limit],
    queryFn: () => alertsApi.getEvents(projectId, limit),
    enabled: !!projectId,
    // Poll every 90s in foreground only — was 30s on every mounted instance
    // (header was hammering the API). React Query stops the interval when
    // the tab is hidden when refetchIntervalInBackground is false (default).
    refetchInterval: 90_000,
    refetchIntervalInBackground: false,
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

