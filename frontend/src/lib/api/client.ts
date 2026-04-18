import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// Create axios instance
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  // Disable client-side request timeout to avoid aborting long-running ingestion APIs.
  timeout: 0,
});

// Token storage keys
const ACCESS_TOKEN_KEY = "senti_access_token";
const REFRESH_TOKEN_KEY = "senti_refresh_token";
const REMEMBER_ME_KEY = "senti_remember_me";
// Absolute expiry of the refresh token, set on login. We use it to
// auto-clear stale tokens (e.g. after 30 days of inactivity).
const REFRESH_EXPIRES_AT_KEY = "senti_refresh_expires_at";

// Token management utilities
export const tokenManager = {
  getAccessToken: () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  getRefreshToken: () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  setTokens: (accessToken: string, refreshToken: string, options?: { rememberMe?: boolean; refreshExpiresInDays?: number }) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    if (options) {
      if (typeof options.rememberMe === "boolean") {
        localStorage.setItem(REMEMBER_ME_KEY, options.rememberMe ? "1" : "0");
      }
      if (options.refreshExpiresInDays && options.refreshExpiresInDays > 0) {
        const expiresAt = Date.now() + options.refreshExpiresInDays * 24 * 60 * 60 * 1000;
        localStorage.setItem(REFRESH_EXPIRES_AT_KEY, String(expiresAt));
      }
    }
  },

  clearTokens: () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(REMEMBER_ME_KEY);
    localStorage.removeItem(REFRESH_EXPIRES_AT_KEY);
  },

  isAuthenticated: () => {
    if (typeof window === "undefined") return false;
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) return false;
    // If we know the absolute refresh expiry, drop the session when it has passed.
    const expiresAtStr = localStorage.getItem(REFRESH_EXPIRES_AT_KEY);
    if (expiresAtStr) {
      const expiresAt = Number(expiresAtStr);
      if (Number.isFinite(expiresAt) && expiresAt > 0 && Date.now() > expiresAt) {
        tokenManager.clearTokens();
        return false;
      }
    }
    return true;
  },

  getRememberMe: () => {
    if (typeof window === "undefined") return true;
    const v = localStorage.getItem(REMEMBER_ME_KEY);
    if (v === null) return true; // default — checked
    return v === "1";
  },

  getRefreshExpiresAt: () => {
    if (typeof window === "undefined") return null;
    const v = localStorage.getItem(REFRESH_EXPIRES_AT_KEY);
    if (!v) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  },
};

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenManager.getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: AxiosError) => void;
}> = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    // Handle 401 errors - token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }
      
      originalRequest._retry = true;
      isRefreshing = true;
      
      const refreshToken = tokenManager.getRefreshToken();
      
      if (!refreshToken) {
        tokenManager.clearTokens();
        window.location.href = "/login";
        return Promise.reject(error);
      }
      
      try {
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token } = response.data;
        // Preserve the user's "Remember me" choice across silent refreshes.
        // We deliberately keep the absolute expires_at that was set on login
        // (do not extend or shrink it), matching the backend which now uses
        // the exact remaining lifetime from the database.
        const remember = tokenManager.getRememberMe();
        const previousExpiresAt = tokenManager.getRefreshExpiresAt();
        if (previousExpiresAt) {
          const msLeft = previousExpiresAt - Date.now();
          const daysLeft = Math.max(1, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
          tokenManager.setTokens(access_token, refresh_token, {
            rememberMe: remember,
            refreshExpiresInDays: daysLeft,
          });
        } else {
          tokenManager.setTokens(access_token, refresh_token, {
            rememberMe: remember,
            refreshExpiresInDays: remember ? 30 : 7,
          });
        }

        processQueue(null, access_token);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
        }

        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as AxiosError, null);
        tokenManager.clearTokens();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    return Promise.reject(error);
  }
);

// API error type
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

// Helper to extract error message
export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data?.error as ApiError | undefined;
    return apiError?.message || error.message || "An unexpected error occurred";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred";
};

