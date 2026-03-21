import { apiClient } from "../client";
import type { GeoData, HotHoursData, TimeSeriesData, Topic, ComparisonResult } from "@/types";

export const analyticsApi = {
  async getGeoData(projectId: string): Promise<GeoData[]> {
    const response = await apiClient.get<GeoData[]>(`/projects/${projectId}/analytics/geo`);
    return response.data;
  },

  async getHotHours(projectId: string): Promise<HotHoursData[]> {
    const response = await apiClient.get<HotHoursData[]>(`/projects/${projectId}/analytics/hot-hours`);
    return response.data;
  },

  async getEmotions(projectId: string): Promise<{ averages: Record<string, number>; total_analyzed: number }> {
    const response = await apiClient.get(`/projects/${projectId}/analytics/emotions`);
    return response.data;
  },

  async getTopics(projectId: string): Promise<Topic[]> {
    const response = await apiClient.get<Topic[]>(`/projects/${projectId}/analytics/topics`);
    return response.data;
  },

  async getTimeSeries(projectId: string, days = 30): Promise<TimeSeriesData[]> {
    const response = await apiClient.get<TimeSeriesData[]>(
      `/projects/${projectId}/analytics/time-series`,
      { params: { days } }
    );
    return response.data;
  },

  async compare(projectId: string, data: { type: string; item_ids: string[]; date_from?: string; date_to?: string }): Promise<ComparisonResult> {
    const response = await apiClient.post<ComparisonResult>(`/projects/${projectId}/compare`, data);
    return response.data;
  },
};
