import { apiClient } from "../client";
import type { Project } from "@/types";

interface ProjectCreate {
  name: string;
  description?: string;
  logo?: string;
  accent_color?: string;
  settings?: Record<string, unknown>;
}

interface ProjectUpdate extends Partial<ProjectCreate> {}

interface ProjectWithStats extends Project {
  stats?: {
    totalMentions: number;
    totalReach: number;
    positivePercentage: number;
    negativePercentage: number;
    presenceScore: number;
  };
}

export interface IngestionJobStatus {
  id: string;
  status: "pending" | "running" | "completed" | "failed";
  job_type: string;
  progress_percent: number;
  total_sources: number;
  processed_sources: number;
  items_fetched: number;
  items_saved: number;
  items_deduplicated: number;
  current_stage?: string | null;
  error?: string | null;
}

export const projectsApi = {
  async list(): Promise<ProjectWithStats[]> {
    const response = await apiClient.get<ProjectWithStats[]>("/projects");
    return response.data;
  },

  async get(id: string): Promise<ProjectWithStats> {
    const response = await apiClient.get<ProjectWithStats>(`/projects/${id}`);
    return response.data;
  },

  async create(data: ProjectCreate): Promise<Project> {
    const response = await apiClient.post<Project>("/projects", data);
    return response.data;
  },

  async getIngestionJob(projectId: string, jobId: string): Promise<IngestionJobStatus> {
    const response = await apiClient.get<IngestionJobStatus>(`/projects/${projectId}/ingestion/jobs/${jobId}`);
    return response.data;
  },

  async update(id: string, data: ProjectUpdate): Promise<Project> {
    const response = await apiClient.put<Project>(`/projects/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/projects/${id}`);
  },

  async deletePrevious(keepProjectId?: string): Promise<void> {
    const query = keepProjectId ? `?keep_project_id=${encodeURIComponent(keepProjectId)}` : "";
    await apiClient.delete(`/projects/cleanup/previous${query}`);
  },

  async refresh(projectId: string): Promise<{
    ingestionTaskId?: string;
    ingestionJobId: string;
    status: string;
  }> {
    const response = await apiClient.post(`/projects/${projectId}/refresh`);
    return response.data;
  },
};
