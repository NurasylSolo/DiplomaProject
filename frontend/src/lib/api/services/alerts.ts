import { apiClient } from "../client";

export interface AlertEvent {
  id: string;
  type: string;
  title: string;
  description?: string;
  severity: string;
  unread: boolean;
  project_id: string;
  payload?: Record<string, unknown>;
  created_at: string;
}

export const alertsApi = {
  async getEvents(projectId: string, limit = 50): Promise<AlertEvent[]> {
    const response = await apiClient.get<AlertEvent[]>(`/projects/${projectId}/alerts/events`, {
      params: { limit },
    });
    return response.data;
  },

  async markRead(projectId: string, eventId: string): Promise<{ ok: boolean }> {
    const response = await apiClient.post<{ ok: boolean }>(
      `/projects/${projectId}/alerts/events/${eventId}/read`
    );
    return response.data;
  },
};

