import { apiClient } from "../client";
import type { GeoData, TimeSeriesData, Topic, ComparisonResult } from "@/types";

export interface DateRangeParams {
  date_from?: string;
  date_to?: string;
}

export interface HotHoursParams extends DateRangeParams {
  /** IANA timezone, e.g. "Asia/Almaty". Defaults to UTC server-side. */
  timezone?: string;
}

/** Single (day-of-week, hour) bucket of mentions in the caller's TZ. */
export interface HotHoursCell {
  day: number; // 0 = Sunday (Postgres `dow`)
  hour: number; // 0..23 in selected TZ
  mentions: number;
  reach: number;
  avg_sentiment: number;
  positive: number;
  neutral: number;
  negative: number;
}

export interface HotHoursAggregate {
  timezone: string;
  total_mentions: number;
  cells: HotHoursCell[];
  peak: HotHoursCell | null;
  top_cells: HotHoursCell[];
  active_days: { day: number; mentions: number }[];
  quietest_cells: HotHoursCell[];
}

export interface SourceBreakdownItem {
  source_id: string;
  name: string;
  type: string;
  base_url: string;
  icon: string | null;
  country: string | null;
  language: string | null;
  mentions_count: number;
  reach: number;
  share_pct: number;
  avg_sentiment: number;
  last_published_at: string | null;
}

export interface KeywordItem {
  word: string;
  count: number;
  is_hashtag: boolean;
  change_pct: number;
}

export interface TopLinkItem {
  url: string;
  domain: string;
  count: number;
  reach: number;
  last_seen: string | null;
}

export interface LanguageItem {
  language: string;
  name: string;
  count: number;
  share_pct: number;
}

export interface AnomalyEvent {
  date: string;
  mentions: number;
  z_score: number;
  type: "spike" | "drop";
}

export const analyticsApi = {
  async getGeoData(projectId: string, params: DateRangeParams = {}): Promise<GeoData[]> {
    const response = await apiClient.get<GeoData[]>(
      `/projects/${projectId}/analytics/geo`,
      { params }
    );
    return response.data;
  },

  async getHotHours(
    projectId: string,
    params: HotHoursParams = {}
  ): Promise<HotHoursAggregate> {
    const response = await apiClient.get<HotHoursAggregate>(
      `/projects/${projectId}/analytics/hot-hours`,
      { params }
    );
    return response.data;
  },

  async getEmotions(projectId: string, params: DateRangeParams = {}): Promise<{ averages: Record<string, number>; total_analyzed: number }> {
    const response = await apiClient.get(
      `/projects/${projectId}/analytics/emotions`,
      { params }
    );
    return response.data;
  },

  async getTopics(projectId: string, params: DateRangeParams = {}): Promise<Topic[]> {
    const response = await apiClient.get<Topic[]>(
      `/projects/${projectId}/analytics/topics`,
      { params }
    );
    return response.data;
  },

  async getTimeSeries(
    projectId: string,
    days = 30,
    params: DateRangeParams = {}
  ): Promise<TimeSeriesData[]> {
    const response = await apiClient.get<TimeSeriesData[]>(
      `/projects/${projectId}/analytics/time-series`,
      { params: { days, ...params } }
    );
    return response.data;
  },

  async getAnomalies(
    projectId: string,
    days = 30,
    z_threshold = 2.0
  ): Promise<AnomalyEvent[]> {
    const response = await apiClient.get<AnomalyEvent[]>(
      `/projects/${projectId}/analytics/events`,
      { params: { days, z_threshold } }
    );
    return response.data;
  },

  async getSourcesBreakdown(
    projectId: string,
    params: DateRangeParams & { limit?: number } = {}
  ): Promise<SourceBreakdownItem[]> {
    const response = await apiClient.get<SourceBreakdownItem[]>(
      `/projects/${projectId}/analytics/sources`,
      { params }
    );
    return response.data;
  },

  async getKeywords(
    projectId: string,
    params: DateRangeParams & { limit?: number } = {}
  ): Promise<KeywordItem[]> {
    const response = await apiClient.get<KeywordItem[]>(
      `/projects/${projectId}/analytics/keywords`,
      { params }
    );
    return response.data;
  },

  async getTopLinks(
    projectId: string,
    params: DateRangeParams & { limit?: number } = {}
  ): Promise<TopLinkItem[]> {
    const response = await apiClient.get<TopLinkItem[]>(
      `/projects/${projectId}/analytics/top-links`,
      { params }
    );
    return response.data;
  },

  async getLanguages(
    projectId: string,
    params: DateRangeParams = {}
  ): Promise<LanguageItem[]> {
    const response = await apiClient.get<LanguageItem[]>(
      `/projects/${projectId}/analytics/languages`,
      { params }
    );
    return response.data;
  },

  async compare(projectId: string, data: { type: string; item_ids: string[]; date_from?: string; date_to?: string }): Promise<ComparisonResult> {
    const response = await apiClient.post<ComparisonResult>(`/projects/${projectId}/compare`, data);
    return response.data;
  },
};
