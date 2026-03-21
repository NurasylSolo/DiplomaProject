import { useMutation } from "@tanstack/react-query";
import { aiApi } from "@/lib/api/services";

export function useAiChat(projectId: string) {
  return useMutation({
    mutationFn: (data: { message: string; chat_id?: string }) =>
      aiApi.chat(projectId, data),
  });
}

export function useAiSummarize(projectId: string) {
  return useMutation({
    mutationFn: (data: { mention_ids?: string[]; date_from?: string; date_to?: string }) =>
      aiApi.summarize(projectId, data),
  });
}
