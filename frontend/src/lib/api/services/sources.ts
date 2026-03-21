import { apiClient } from "../client";
import type { Source } from "@/types";

interface SourceCreate {
  name: string;
  type: string;
  base_url: string;
  active?: boolean;
  trust_score?: number;
  country?: string;
  language?: string;
  icon?: string;
}

interface SourceUpdate extends Partial<SourceCreate> {}

export const sourcesApi = {
  async list(projectId: string): Promise<Source[]> {
    const response = await apiClient.get<Source[]>(`/projects/${projectId}/sources`);
    return response.data;
  },

  async get(projectId: string, sourceId: string): Promise<Source> {
    const response = await apiClient.get<Source>(`/projects/${projectId}/sources/${sourceId}`);
    return response.data;
  },

  async create(projectId: string, data: SourceCreate): Promise<Source> {
    const response = await apiClient.post<Source>(`/projects/${projectId}/sources`, data);
    return response.data;
  },

  async update(projectId: string, sourceId: string, data: SourceUpdate): Promise<Source> {
    const response = await apiClient.put<Source>(`/projects/${projectId}/sources/${sourceId}`, data);
    return response.data;
  },

  async delete(projectId: string, sourceId: string): Promise<void> {
    await apiClient.delete(`/projects/${projectId}/sources/${sourceId}`);
  },
};
