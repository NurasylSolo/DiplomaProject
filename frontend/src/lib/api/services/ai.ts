import { apiClient } from "../client";

interface ChatRequest {
  message: string;
  chat_id?: string;
}

interface ChatResponse {
  id: string;
  chat_id: string;
  role: string;
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

interface SummarizeRequest {
  mention_ids?: string[];
  date_from?: string;
  date_to?: string;
}

export const aiApi = {
  async chat(projectId: string, data: ChatRequest): Promise<ChatResponse> {
    const response = await apiClient.post<ChatResponse>(`/projects/${projectId}/ai/chat`, data);
    return response.data;
  },

  async summarize(projectId: string, data: SummarizeRequest): Promise<{ summary: string }> {
    const response = await apiClient.post<{ summary: string }>(`/projects/${projectId}/ai/summarize`, data);
    return response.data;
  },
};
