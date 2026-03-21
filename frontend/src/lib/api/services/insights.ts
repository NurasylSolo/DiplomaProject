import { apiClient } from "../client";
import type { Insight } from "@/types";

export const insightsApi = {
  async list(projectId: string, params?: { type?: string; severity?: string }): Promise<Insight[]> {
    const response = await apiClient.get<Insight[]>(
      `/projects/${projectId}/insights`,
      { params }
    );
    return response.data;
  },
};
