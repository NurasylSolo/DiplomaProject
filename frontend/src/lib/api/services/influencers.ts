import { apiClient } from "../client";

export interface InfluencerDto {
  id: string;
  project_id: string;
  handle: string;
  platform: string;
  display_name: string;
  avatar: string;
  followers: number;
  trust_score: number;
  country: string | null;
  language: string | null;
  base_url: string;
  avg_engagement: number;
  influence_score: number;
  mentions_count: number;
  reach: number;
  share_of_voice: number;
  avg_sentiment: number;
  sentiment_distribution: { positive: number; neutral: number; negative: number };
  last_seen: string | null;
}

export interface InfluencerMentionDto {
  id: string;
  title: string;
  url: string;
  snippet: string;
  published_at: string | null;
  sentiment_label: string;
  sentiment_score: number;
  reach: number;
  language: string | null;
  country: string | null;
}

export interface InfluencersListParams {
  sort_by?:
    | "influence_score"
    | "mentions_count"
    | "reach"
    | "share_of_voice"
    | "followers"
    | "avg_sentiment"
    | "last_seen"
    | "name";
  sort_order?: "asc" | "desc";
  platform?: string;
  search?: string;
  limit?: number;
}

export const influencersApi = {
  async list(
    projectId: string,
    params: InfluencersListParams = {}
  ): Promise<InfluencerDto[]> {
    const response = await apiClient.get<InfluencerDto[]>(
      `/projects/${projectId}/influencers`,
      { params }
    );
    return response.data;
  },

  async mentions(
    projectId: string,
    influencerId: string,
    limit = 10
  ): Promise<InfluencerMentionDto[]> {
    const response = await apiClient.get<InfluencerMentionDto[]>(
      `/projects/${projectId}/influencers/${influencerId}/mentions`,
      { params: { limit } }
    );
    return response.data;
  },
};
