import { apiClient } from "../client";
import type { Source } from "@/types";

export interface SourceCreate {
  name: string;
  type: string;
  base_url: string;
  active?: boolean;
  trust_score?: number;
  country?: string;
  language?: string;
  icon?: string;
}

export type SourceUpdate = Partial<SourceCreate>;

export type SourceBulkActionType =
  | "activate"
  | "deactivate"
  | "delete"
  | "mark_trusted"
  | "unmark_trusted";

export interface SourceBulkActionRequest {
  action: SourceBulkActionType;
  source_ids: string[];
}

export interface AttachCatalogRequest {
  languages?: string[];
  countries?: string[];
  source_types?: string[]; // e.g. ["rss", "html"]
  tags_any?: string[];
  min_trust_score?: number;
  active_only?: boolean;
  limit?: number;
  dry_run?: boolean;
}

export interface AttachCatalogResponse {
  matched: number;
  created: number;
  already_exists: number;
  skipped: number;
  dry_run: boolean;
  sample_domains: string[];
}

export interface CatalogHealthSummary {
  total: number;
  by_status?: Record<string, number>;
  by_language?: Record<string, number>;
  by_country?: Record<string, number>;
  active?: number;
  inactive?: number;
}

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

  async bulkAction(projectId: string, data: SourceBulkActionRequest): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(
      `/projects/${projectId}/sources/bulk-action`,
      data
    );
    return response.data;
  },
};

export const sourceCatalogApi = {
  async attach(projectId: string, payload: AttachCatalogRequest): Promise<AttachCatalogResponse> {
    const response = await apiClient.post<AttachCatalogResponse>(
      `/projects/${projectId}/source-catalog/attach`,
      payload
    );
    return response.data;
  },

  async summary(): Promise<CatalogHealthSummary> {
    const response = await apiClient.get<CatalogHealthSummary>(`/source-catalog/status/summary`);
    return response.data;
  },
};
