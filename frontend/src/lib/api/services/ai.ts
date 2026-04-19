import { apiClient } from "../client";

interface ChatRequest {
  message: string;
  chat_id?: string;
}

export interface ChatMetadata {
  model?: string;
  tokens_used?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  cited_mention_ids?: string[];
  retrieved_mention_ids?: string[];
  retrieved_count?: number;
  [k: string]: unknown;
}

export interface ChatResponse {
  id: string;
  chat_id: string;
  role: string;
  content: string;
  timestamp: string;
  metadata?: ChatMetadata;
}

interface SummarizeRequest {
  mention_ids?: string[];
  date_from?: string;
  date_to?: string;
}

export interface ChatListItem {
  id: string;
  title: string;
  created_at: string | null;
  updated_at: string | null;
  last_message_preview: string | null;
  last_message_role: string | null;
  last_message_at: string | null;
}

export interface ChatMessageDto {
  id: string;
  chat_id: string;
  role: string;
  content: string;
  timestamp: string | null;
  metadata?: ChatMetadata | null;
}

export interface AIReportSection {
  title: string;
  detail: string;
  mention_ids?: string[];
}

export interface AIReportTopSource {
  name: string;
  mentions: number;
  note?: string;
}

export interface AIReportResponse {
  language?: string;
  executive_summary?: string;
  key_findings?: AIReportSection[];
  sentiment_overview?: string;
  top_sources?: AIReportTopSource[];
  risks?: string[];
  opportunities?: string[];
  recommendations?: string[];
  meta?: ChatMetadata;
  mentions_used?: string[];
  generated_at?: string;
  raw?: boolean;
}

export const aiApi = {
  async chat(projectId: string, data: ChatRequest): Promise<ChatResponse> {
    const response = await apiClient.post<ChatResponse>(
      `/projects/${projectId}/ai/chat`,
      data
    );
    return response.data;
  },

  async summarize(
    projectId: string,
    data: SummarizeRequest
  ): Promise<{ summary: string }> {
    const response = await apiClient.post<{ summary: string }>(
      `/projects/${projectId}/ai/summarize`,
      data
    );
    return response.data;
  },

  async listChats(projectId: string): Promise<ChatListItem[]> {
    const response = await apiClient.get<ChatListItem[]>(
      `/projects/${projectId}/ai/chats`
    );
    return response.data;
  },

  async getChatMessages(
    projectId: string,
    chatId: string
  ): Promise<ChatMessageDto[]> {
    const response = await apiClient.get<ChatMessageDto[]>(
      `/projects/${projectId}/ai/chats/${chatId}/messages`
    );
    return response.data;
  },

  async deleteChat(projectId: string, chatId: string): Promise<void> {
    await apiClient.delete(`/projects/${projectId}/ai/chats/${chatId}`);
  },

  async renameChat(
    projectId: string,
    chatId: string,
    title: string
  ): Promise<{ id: string; title: string; updated_at: string | null }> {
    const response = await apiClient.patch<{
      id: string;
      title: string;
      updated_at: string | null;
    }>(`/projects/${projectId}/ai/chats/${chatId}`, { title });
    return response.data;
  },

  async generateReport(
    projectId: string,
    topK: number = 25
  ): Promise<AIReportResponse> {
    const response = await apiClient.post<AIReportResponse>(
      `/projects/${projectId}/ai/report`,
      { top_k: topK }
    );
    return response.data;
  },
};
