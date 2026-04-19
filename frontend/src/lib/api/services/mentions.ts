import { apiClient } from "../client";
import type { Mention, PaginatedResponse, MentionFilters } from "@/types";

interface MentionsQuery {
  page?: number;
  per_page?: number;
  date_from?: string;
  date_to?: string;
  sources?: string;
  sentiment?: string;
  search?: string;
  influence_min?: number;
  influence_max?: number;
  visited?: boolean;
  saved?: boolean;
  languages?: string;
  countries?: string;
  topic?: string;
  sort_by?: string;
  sort_order?: string;
}

interface BulkActionRequest {
  action: string;
  mention_ids: string[];
  value?: unknown;
}

export interface MentionsStats {
  total_mentions: number;
  total_reach: number;
  positive_count: number;
  neutral_count: number;
  negative_count: number;
  positive_percentage: number;
  neutral_percentage: number;
  negative_percentage: number;
  avg_sentiment: number;
  mentions_change_percentage: number | null;
  reach_change_percentage: number | null;
  positive_change_percentage: number | null;
  negative_change_percentage: number | null;
}

export const mentionsApi = {
  async list(projectId: string, params: MentionsQuery = {}): Promise<PaginatedResponse<Mention>> {
    const response = await apiClient.get<PaginatedResponse<Mention>>(
      `/projects/${projectId}/mentions`,
      { params }
    );
    return response.data;
  },

  async get(projectId: string, mentionId: string): Promise<Mention> {
    const response = await apiClient.get<Mention>(
      `/projects/${projectId}/mentions/${mentionId}`
    );
    return response.data;
  },

  async bulkAction(projectId: string, data: BulkActionRequest): Promise<{ message: string; affected: number }> {
    const response = await apiClient.post(
      `/projects/${projectId}/mentions/bulk_action`,
      data
    );
    return response.data;
  },

  async stats(projectId: string, params: Omit<MentionsQuery, "page" | "per_page" | "sort_by" | "sort_order"> = {}): Promise<MentionsStats> {
    const response = await apiClient.get<MentionsStats>(
      `/projects/${projectId}/mentions/stats`,
      { params }
    );
    return response.data;
  },
};
