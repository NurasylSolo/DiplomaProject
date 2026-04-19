import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { aiApi } from "@/lib/api/services";

export function useAiChat(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { message: string; chat_id?: string }) =>
      aiApi.chat(projectId, data),
    onSuccess: (data) => {
      // Refresh chat list and the specific chat's messages.
      queryClient.invalidateQueries({ queryKey: ["ai", "chats", projectId] });
      if (data?.chat_id) {
        queryClient.invalidateQueries({
          queryKey: ["ai", "chat-messages", projectId, data.chat_id],
        });
      }
    },
  });
}

export function useAiSummarize(projectId: string) {
  return useMutation({
    mutationFn: (data: { mention_ids?: string[]; date_from?: string; date_to?: string }) =>
      aiApi.summarize(projectId, data),
  });
}

export function useChats(projectId: string) {
  return useQuery({
    queryKey: ["ai", "chats", projectId],
    queryFn: () => aiApi.listChats(projectId),
    enabled: !!projectId,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

export function useChatMessages(projectId: string, chatId: string | null) {
  return useQuery({
    queryKey: ["ai", "chat-messages", projectId, chatId],
    queryFn: () => aiApi.getChatMessages(projectId, chatId as string),
    enabled: !!projectId && !!chatId,
    staleTime: 0,
  });
}

export function useDeleteChat(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (chatId: string) => aiApi.deleteChat(projectId, chatId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai", "chats", projectId] });
    },
  });
}

export function useRenameChat(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ chatId, title }: { chatId: string; title: string }) =>
      aiApi.renameChat(projectId, chatId, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai", "chats", projectId] });
    },
  });
}

export function useGenerateAiReport(projectId: string) {
  return useMutation({
    mutationFn: (topK?: number) => aiApi.generateReport(projectId, topK ?? 25),
  });
}
