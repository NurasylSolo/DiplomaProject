import { apiClient } from "../client";
import type { Insight } from "@/types";

export interface InsightDto {
  id: string;
  project_id: string;
  type: string;
  title: string;
  description: string;
  metric: number | null;
  metric_change: number | null;
  severity: string;
  category: string;
  related_mention_ids: string[] | null;
  created_at: string;
}

export const insightsApi = {
  async list(
    projectId: string,
    params?: { type?: string; severity?: string }
  ): Promise<InsightDto[]> {
    const response = await apiClient.get<InsightDto[]>(
      `/projects/${projectId}/insights`,
      { params }
    );
    return response.data;
  },

  async generate(projectId: string): Promise<InsightDto[]> {
    const response = await apiClient.post<InsightDto[]>(
      `/projects/${projectId}/insights/generate`
    );
    return response.data;
  },

  async dismiss(projectId: string, insightId: string): Promise<void> {
    await apiClient.delete(`/projects/${projectId}/insights/${insightId}`);
  },
};

// Re-export for backwards compatibility (type alias)
export type { Insight };
