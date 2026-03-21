import { apiClient } from "../client";
import type { Report } from "@/types";

interface ReportCreateRequest {
  name?: string;
  config?: {
    sections?: string[];
    filters?: Record<string, unknown>;
    language?: string;
    logo?: string;
    accent_color?: string;
    description?: string;
  };
}

interface EmailScheduleCreate {
  recipients: string[];
  frequency?: string;
  config?: Record<string, unknown>;
  send_time?: string;
  timezone?: string;
  active?: boolean;
}

export const reportsApi = {
  async createPdf(projectId: string, data?: ReportCreateRequest): Promise<Report> {
    const response = await apiClient.post<Report>(`/projects/${projectId}/reports/pdf`, data || {});
    return response.data;
  },

  async createExcel(projectId: string, data?: ReportCreateRequest): Promise<Report> {
    const response = await apiClient.post<Report>(`/projects/${projectId}/reports/excel`, data || {});
    return response.data;
  },

  async download(projectId: string, reportId: string): Promise<Blob> {
    const response = await apiClient.get(`/projects/${projectId}/reports/${reportId}/download`, {
      responseType: "blob",
    });
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

  async updateEmailSchedule(projectId: string, scheduleId: string, data: Partial<EmailScheduleCreate>) {
    const response = await apiClient.patch(`/projects/${projectId}/email_reports/${scheduleId}`, data);
    return response.data;
  },

  async deleteEmailSchedule(projectId: string, scheduleId: string) {
    const response = await apiClient.delete(`/projects/${projectId}/email_reports/${scheduleId}`);
    return response.data;
  },

  async sendEmailScheduleNow(projectId: string, scheduleId: string) {
    const response = await apiClient.post(`/projects/${projectId}/email_reports/${scheduleId}/send_now`);
    return response.data;
  },
};
