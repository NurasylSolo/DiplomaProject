import { apiClient } from "../client";
import type { Report } from "@/types";

export interface ReportConfig {
  sections?: string[];
  filters?: Record<string, unknown>;
  language?: string;
  logo?: string;
  accent_color?: string;
  description?: string;
}

interface ReportCreateRequest {
  name?: string;
  config?: ReportConfig;
}

export interface EmailScheduleCreate {
  recipients: string[];
  frequency?: string;
  config?: ReportConfig;
  send_time?: string;
  timezone?: string;
  active?: boolean;
}

export interface ReportPreviewSource {
  source_id?: string;
  name: string;
  type: string;
  mentions_count: number;
  reach: number;
  share_pct: number;
  base_url?: string | null;
}

export interface ReportPreviewTopic {
  name: string;
  mentions: number;
}

export interface ReportPreviewTimeSeriesPoint {
  date: string;
  mentions: number;
  reach?: number;
  positive?: number;
  neutral?: number;
  negative?: number;
}

export interface ReportPreviewEmotions {
  averages: Record<string, number>;
  total_analyzed: number;
  top_emotion?: string | null;
}

export interface ReportPreviewHotHoursPeak {
  day: number;
  hour: number;
  mentions: number;
}

export interface ReportPreviewHotHours {
  peak: ReportPreviewHotHoursPeak | null;
  timezone?: string | null;
  active_days: { day: number; mentions: number }[];
}

export interface ReportPreviewLanguage {
  language: string;
  count: number;
  share_pct: number;
}

export interface ReportPreviewGeoCountry {
  country: string;
  country_code: string;
  mentions: number;
  reach: number;
}

export interface ReportPreview {
  project_name: string;
  kpi: {
    total_mentions: number;
    total_reach: number;
    positive_pct: number;
    negative_pct: number;
    neutral_pct?: number;
  };
  sentiment: {
    positive_count: number;
    neutral_count: number;
    negative_count: number;
  };
  top_sources: ReportPreviewSource[];
  top_topics: ReportPreviewTopic[];
  time_series: ReportPreviewTimeSeriesPoint[];
  emotions?: ReportPreviewEmotions;
  hot_hours?: ReportPreviewHotHours;
  languages?: ReportPreviewLanguage[];
  geo?: ReportPreviewGeoCountry[];
}

export interface SendNowResult {
  schedule_id: string;
  report_id: string;
  recipients_count: number;
  success: boolean;
  error?: string | null;
  last_sent_at?: string | null;
}

export const reportsApi = {
  async createPdf(projectId: string, data?: ReportCreateRequest): Promise<Report> {
    const response = await apiClient.post<Report>(
      `/projects/${projectId}/reports/pdf`,
      data || {}
    );
    return response.data;
  },

  async createExcel(projectId: string, data?: ReportCreateRequest): Promise<Report> {
    const response = await apiClient.post<Report>(
      `/projects/${projectId}/reports/excel`,
      data || {}
    );
    return response.data;
  },

  async download(projectId: string, reportId: string): Promise<Blob> {
    const response = await apiClient.get(
      `/projects/${projectId}/reports/${reportId}/download`,
      { responseType: "blob" }
    );
    return response.data;
  },

  async preview(projectId: string): Promise<ReportPreview> {
    const response = await apiClient.get<ReportPreview>(
      `/projects/${projectId}/reports/preview`
    );
    return response.data;
  },

  async createEmailSchedule(projectId: string, data: EmailScheduleCreate) {
    const response = await apiClient.post(`/projects/${projectId}/email_reports`, data);
    return response.data;
  },

  async getEmailSchedules(projectId: string) {
    const response = await apiClient.get(`/projects/${projectId}/email_reports`);
    return response.data;
  },

  async updateEmailSchedule(
    projectId: string,
    scheduleId: string,
    data: Partial<EmailScheduleCreate>
  ) {
    const response = await apiClient.patch(
      `/projects/${projectId}/email_reports/${scheduleId}`,
      data
    );
    return response.data;
  },

  async deleteEmailSchedule(projectId: string, scheduleId: string) {
    const response = await apiClient.delete(
      `/projects/${projectId}/email_reports/${scheduleId}`
    );
    return response.data;
  },

  async sendEmailScheduleNow(projectId: string, scheduleId: string): Promise<SendNowResult> {
    const response = await apiClient.post<SendNowResult>(
      `/projects/${projectId}/email_reports/${scheduleId}/send_now`
    );
    return response.data;
  },
};
