import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectsApi } from "@/lib/api/services";
import { tokenManager } from "@/lib/api";
import { useProjectStore } from "@/stores";

/**
 * Projects rarely change once created. Cache for 5 minutes so navigating
 * between pages of the same project doesn't re-fetch the project list /
 * project detail every time. Mutations (`useCreateProject`,
 * `useDeleteProject`, etc.) explicitly invalidate this cache.
 */
const FRESH_QUERY_OPTS = {
  staleTime: 5 * 60 * 1000,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
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
    // Don't fire 401-bound /projects requests before the user is logged in.
    enabled: tokenManager.isAuthenticated(),
    ...FRESH_QUERY_OPTS,
  });
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: ["projects", projectId],
    queryFn: () => projectsApi.get(projectId),
    enabled: !!projectId && tokenManager.isAuthenticated(),
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
