import { apiClient } from "../client";
import type { Influencer } from "@/types";

export const influencersApi = {
  async list(
    projectId: string,
    params?: { sort_by?: string; sort_order?: string; platform?: string }
  ): Promise<Influencer[]> {
    const response = await apiClient.get<Influencer[]>(
      `/projects/${projectId}/influencers`,
      { params }
    );
    return response.data;
  },
};
