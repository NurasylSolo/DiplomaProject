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

// These match REFRESH_TOKEN_EXPIRE_DAYS / REFRESH_TOKEN_SHORT_DAYS in backend/.env.
// Used purely on the client to know when the locally stored refresh token is
// definitively expired. Backend remains the source of truth on the actual TTL.
const REFRESH_DAYS_REMEMBER = 30;
const REFRESH_DAYS_DEFAULT = 7;

export const authApi = {
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>("/auth/login", data);
    const { access_token, refresh_token } = response.data;
    const remember = !!data.remember_me;
    tokenManager.setTokens(access_token, refresh_token, {
      rememberMe: remember,
      refreshExpiresInDays: remember ? REFRESH_DAYS_REMEMBER : REFRESH_DAYS_DEFAULT,
    });
    return response.data;
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>("/auth/register", data);
    const { access_token, refresh_token } = response.data;
    // Registration always issues a long-lived session — user just signed up.
    tokenManager.setTokens(access_token, refresh_token, {
      rememberMe: true,
      refreshExpiresInDays: REFRESH_DAYS_REMEMBER,
    });
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

  async verifyEmail(email: string, code: string): Promise<{ message: string; email_verified: boolean }> {
    const response = await apiClient.post("/auth/verify-email", { email, code });
    return response.data;
  },

  async resendVerification(email: string): Promise<{ message: string }> {
    const response = await apiClient.post("/auth/resend-verification", { email });
    return response.data;
  },

  async googleLogin(credential: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>("/auth/google", { credential });
    const { access_token, refresh_token } = response.data;
    // Google login is treated as long-lived (same as Remember me).
    tokenManager.setTokens(access_token, refresh_token, {
      rememberMe: true,
      refreshExpiresInDays: REFRESH_DAYS_REMEMBER,
    });
    return response.data;
  },
};
