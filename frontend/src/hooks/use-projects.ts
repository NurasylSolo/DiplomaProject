import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectsApi } from "@/lib/api/services";
import { useProjectStore } from "@/stores";

// Common settings so every project-related screen pulls fresh data on
// page enter / tab focus, instead of showing 5-minute-old cached data.
const FRESH_QUERY_OPTS = {
  staleTime: 0,
  refetchOnMount: "always" as const,
  refetchOnWindowFocus: true,
} as const;

export function useProjects() {
  const { setProjects } = useProjectStore();

  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const projects = await projectsApi.list();
      setProjects(projects);
      return projects;
    },
    ...FRESH_QUERY_OPTS,
  });
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: ["projects", projectId],
    queryFn: () => projectsApi.get(projectId),
    enabled: !!projectId,
    ...FRESH_QUERY_OPTS,
  });
}

export function useRefreshProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) => projectsApi.refresh(projectId),
    onSuccess: (_data, projectId) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["projects", projectId] });
      queryClient.invalidateQueries({ queryKey: ["mentions", projectId] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: projectsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof projectsApi.update>[1] }) =>
      projectsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["projects", variables.id] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: projectsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useDeletePreviousProjects() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (keepProjectId?: string) => projectsApi.deletePrevious(keepProjectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
