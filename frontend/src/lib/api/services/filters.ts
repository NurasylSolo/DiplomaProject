import { apiClient } from "../client";
import type { SavedFilter } from "@/types";

interface FilterCreate {
  name: string;
  filters: Record<string, unknown>;
}

interface FilterUpdate {
  name?: string;
  filters?: Record<string, unknown>;
}

export const filtersApi = {
  async list(projectId: string): Promise<SavedFilter[]> {
    const response = await apiClient.get<SavedFilter[]>(`/projects/${projectId}/filters`);
    return response.data;
  },

  async get(projectId: string, filterId: string): Promise<SavedFilter> {
    const response = await apiClient.get<SavedFilter>(`/projects/${projectId}/filters/${filterId}`);
    return response.data;
  },

  async create(projectId: string, data: FilterCreate): Promise<SavedFilter> {
    const response = await apiClient.post<SavedFilter>(`/projects/${projectId}/filters`, data);
    return response.data;
  },

  async update(projectId: string, filterId: string, data: FilterUpdate): Promise<SavedFilter> {
    const response = await apiClient.put<SavedFilter>(`/projects/${projectId}/filters/${filterId}`, data);
    return response.data;
  },

  async delete(projectId: string, filterId: string): Promise<void> {
    await apiClient.delete(`/projects/${projectId}/filters/${filterId}`);
  },
};
