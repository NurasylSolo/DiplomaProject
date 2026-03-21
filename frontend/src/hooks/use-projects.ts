import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectsApi } from "@/lib/api/services";
import { useProjectStore } from "@/stores";

export function useProjects() {
  const { setProjects } = useProjectStore();

  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const projects = await projectsApi.list();
      setProjects(projects);
      return projects;
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: ["projects", projectId],
    queryFn: () => projectsApi.get(projectId),
    enabled: !!projectId,
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
