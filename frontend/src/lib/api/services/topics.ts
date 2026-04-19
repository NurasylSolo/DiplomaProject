import { apiClient } from "../client";

export interface TopicDto {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  keywords: string[];
  parent_topic_id: string | null;
  sentiment_distribution: Record<string, number>;
  created_at: string;
}

export interface TopicMentionDto {
  id: string;
  title: string;
  url: string;
  snippet: string;
  sentiment_label: string;
  sentiment_score: number;
  reach: number;
  language: string;
  country: string;
  published_at: string | null;
}

export interface TopicSummaryResponse {
  topic_id: string;
  summary: string;
  mention_ids: string[];
}

export interface AutoDiscoverResponse {
  created: number;
  topics: TopicDto[];
}

export interface ReassignAllResponse {
  total: number;
  reassigned: number;
  unmatched: number;
}

export interface CreateTopicPayload {
  name: string;
  description?: string;
  keywords?: string[];
}

export type UpdateTopicPayload = Partial<CreateTopicPayload>;

export const topicsApi = {
  async list(projectId: string): Promise<TopicDto[]> {
    const response = await apiClient.get<TopicDto[]>(
      `/projects/${projectId}/topics`
    );
    return response.data;
  },

  async create(projectId: string, data: CreateTopicPayload): Promise<TopicDto> {
    const response = await apiClient.post<TopicDto>(
      `/projects/${projectId}/topics`,
      data
    );
    return response.data;
  },

  async update(
    projectId: string,
    topicId: string,
    data: UpdateTopicPayload
  ): Promise<TopicDto> {
    const response = await apiClient.patch<TopicDto>(
      `/projects/${projectId}/topics/${topicId}`,
      data
    );
    return response.data;
  },

  async delete(projectId: string, topicId: string): Promise<void> {
    await apiClient.delete(`/projects/${projectId}/topics/${topicId}`);
  },

  async autoDiscover(projectId: string): Promise<AutoDiscoverResponse> {
    const response = await apiClient.post<AutoDiscoverResponse>(
      `/projects/${projectId}/topics/auto-discover`
    );
    return response.data;
  },

  async reassignAll(projectId: string): Promise<ReassignAllResponse> {
    const response = await apiClient.post<ReassignAllResponse>(
      `/projects/${projectId}/topics/reassign-all`
    );
    return response.data;
  },

  async mentions(
    projectId: string,
    topicId: string,
    limit: number = 10
  ): Promise<TopicMentionDto[]> {
    const response = await apiClient.get<TopicMentionDto[]>(
      `/projects/${projectId}/topics/${topicId}/mentions`,
      { params: { limit } }
    );
    return response.data;
  },

  async summary(projectId: string, topicId: string): Promise<TopicSummaryResponse> {
    const response = await apiClient.post<TopicSummaryResponse>(
      `/projects/${projectId}/topics/${topicId}/summary`
    );
    return response.data;
  },
};
