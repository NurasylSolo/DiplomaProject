import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { topicsApi } from "@/lib/api/services";
import type {
  CreateTopicPayload,
  UpdateTopicPayload,
} from "@/lib/api/services/topics";

const FRESH = {
  staleTime: 0,
  refetchOnMount: "always" as const,
  refetchOnWindowFocus: true,
};

export function useProjectTopics(projectId: string) {
  return useQuery({
    queryKey: ["topics", "list", projectId],
    queryFn: () => topicsApi.list(projectId),
    enabled: !!projectId,
    ...FRESH,
  });
}

export function useTopicMentions(
  projectId: string,
  topicId: string | null,
  limit: number = 10
) {
  return useQuery({
    queryKey: ["topics", "mentions", projectId, topicId, limit],
    queryFn: () => topicsApi.mentions(projectId, topicId as string, limit),
    enabled: !!projectId && !!topicId,
    ...FRESH,
  });
}

function _invalidate(qc: ReturnType<typeof useQueryClient>, projectId: string) {
  qc.invalidateQueries({ queryKey: ["topics", "list", projectId] });
  qc.invalidateQueries({ queryKey: ["topics", "mentions", projectId] });
  qc.invalidateQueries({ queryKey: ["analytics", "topics", projectId] });
}

export function useCreateTopic(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTopicPayload) => topicsApi.create(projectId, data),
    onSuccess: () => _invalidate(qc, projectId),
  });
}

export function useUpdateTopic(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ topicId, data }: { topicId: string; data: UpdateTopicPayload }) =>
      topicsApi.update(projectId, topicId, data),
    onSuccess: () => _invalidate(qc, projectId),
  });
}

export function useDeleteTopic(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (topicId: string) => topicsApi.delete(projectId, topicId),
    onSuccess: () => _invalidate(qc, projectId),
  });
}

export function useAutoDiscoverTopics(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => topicsApi.autoDiscover(projectId),
    onSuccess: () => _invalidate(qc, projectId),
  });
}

export function useReassignTopics(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => topicsApi.reassignAll(projectId),
    onSuccess: () => _invalidate(qc, projectId),
  });
}

export function useSummarizeTopic(projectId: string) {
  return useMutation({
    mutationFn: (topicId: string) => topicsApi.summary(projectId, topicId),
  });
}
