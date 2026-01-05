export const ROUTES = {
  // Auth
  LOGIN: "/login",
  REGISTER: "/register",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",
  
  // Dashboard
  DASHBOARD: "/dashboard",
  
  // Project routes (require projectId)
  project: (projectId: string) => ({
    ROOT: `/projects/${projectId}`,
    MENTIONS: `/projects/${projectId}/mentions`,
    INSIGHTS: `/projects/${projectId}/insights`,
    ANALYSIS: `/projects/${projectId}/analysis`,
    ASSISTANT: `/projects/${projectId}/assistant`,
    TOPICS: `/projects/${projectId}/topics`,
    COMPARISON: `/projects/${projectId}/comparison`,
    SOURCES: `/projects/${projectId}/sources`,
    INFLUENCERS: `/projects/${projectId}/influencers`,
    REPORTS: {
      EMAIL: `/projects/${projectId}/reports/email`,
      PDF: `/projects/${projectId}/reports/pdf`,
      EXCEL: `/projects/${projectId}/reports/excel`,
      INFOGRAPHIC: `/projects/${projectId}/reports/infographic`,
    },
    GEO: `/projects/${projectId}/geo`,
    HOT_HOURS: `/projects/${projectId}/hot-hours`,
    EMOTIONS: `/projects/${projectId}/emotions`,
    SETTINGS: `/projects/${projectId}/settings`,
  }),
  
  // Settings
  ACCOUNT: "/settings/account",
  TEAM: "/settings/team",
} as const;

export const API_ROUTES = {
  // Auth
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    LOGOUT: "/auth/logout",
    REFRESH: "/auth/refresh",
    FORGOT_PASSWORD: "/auth/forgot-password",
    RESET_PASSWORD: "/auth/reset-password",
  },
  
  // Projects
  PROJECTS: "/projects",
  PROJECT: (id: string) => `/projects/${id}`,
  
  // Mentions
  MENTIONS: (projectId: string) => `/projects/${projectId}/mentions`,
  MENTION: (projectId: string, id: string) => `/projects/${projectId}/mentions/${id}`,
  MENTIONS_BULK: (projectId: string) => `/projects/${projectId}/mentions/bulk_action`,
  
  // Sources
  SOURCES: (projectId: string) => `/projects/${projectId}/sources`,
  SOURCE: (projectId: string, id: string) => `/projects/${projectId}/sources/${id}`,
  
  // Insights
  INSIGHTS: (projectId: string) => `/projects/${projectId}/insights`,
  
  // AI
  AI_SUMMARIZE: (projectId: string) => `/projects/${projectId}/ai/summarize`,
  AI_CHAT: (projectId: string) => `/projects/${projectId}/ai/chat`,
  
  // Reports
  REPORTS_PDF: (projectId: string) => `/projects/${projectId}/reports/pdf`,
  REPORTS_EXCEL: (projectId: string) => `/projects/${projectId}/reports/excel`,
  REPORTS_EMAIL: (projectId: string) => `/projects/${projectId}/email_reports`,
  REPORT_DOWNLOAD: (projectId: string, reportId: string) => `/projects/${projectId}/reports/${reportId}/download`,
  
  // Filters
  FILTERS: (projectId: string) => `/projects/${projectId}/filters`,
  FILTER: (projectId: string, id: string) => `/projects/${projectId}/filters/${id}`,
  
  // Comparison
  COMPARE: (projectId: string) => `/projects/${projectId}/compare`,
  
  // Influencers
  INFLUENCERS: (projectId: string) => `/projects/${projectId}/influencers`,
  
  // User
  USER: "/user",
  USER_SETTINGS: "/user/settings",
} as const;

