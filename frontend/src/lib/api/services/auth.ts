import axios from "axios";
import { apiClient, tokenManager } from "../client";
import type { User, AuthTokens } from "@/types";

interface LoginRequest {
  email: string;
  password: string;
  remember_me?: boolean;
}

interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

interface UserSettingsUpdateRequest {
  name?: string;
  avatar?: string;
  locale?: string;
  timezone?: string;
}

interface ActiveSession {
  id: string;
  device: string;
  location: string;
  ip: string;
  last_active: string;
  current: boolean;
}

export const authApi = {
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>("/auth/login", data);
    const { access_token, refresh_token } = response.data;
    tokenManager.setTokens(access_token, refresh_token);
    return response.data;
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>("/auth/register", data);
    const { access_token, refresh_token } = response.data;
    tokenManager.setTokens(access_token, refresh_token);
    return response.data;
  },

  async logout(): Promise<void> {
    const refreshToken = tokenManager.getRefreshToken();
    // Clear local auth state first so logout never feels stuck.
    tokenManager.clearTokens();
    if (refreshToken) {
      try {
        // Use a short timeout for best-effort server-side revocation.
        await axios.post(
          `${(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1")}/auth/logout`,
          { refresh_token: refreshToken },
          { timeout: 5000 }
        );
      } catch {
        // ignore
      }
    }
  },

  async getMe(): Promise<User> {
    const response = await apiClient.get<User>("/user");
    return response.data;
  },

  async updateSettings(data: UserSettingsUpdateRequest): Promise<User> {
    const response = await apiClient.put<User>("/user/settings", data);
    return response.data;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiClient.post("/user/change-password", {
      current_password: currentPassword,
      new_password: newPassword,
    });
  },

  async getSessions(currentRefreshToken?: string): Promise<ActiveSession[]> {
    const response = await apiClient.get<ActiveSession[]>("/user/sessions", {
      params: currentRefreshToken ? { current_refresh_token: currentRefreshToken } : undefined,
    });
    return response.data;
  },

  async revokeSession(sessionId: string): Promise<void> {
    await apiClient.delete(`/user/sessions/${sessionId}`);
  },

  async revokeOtherSessions(currentRefreshToken: string): Promise<void> {
    await apiClient.post("/user/sessions/revoke-others", {
      current_refresh_token: currentRefreshToken,
    });
  },

  async deleteAccount(password: string): Promise<void> {
    await apiClient.post("/user/delete-account", { password });
    tokenManager.clearTokens();
  },
};
