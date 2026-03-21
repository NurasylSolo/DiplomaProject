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
};
