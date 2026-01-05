// ============================================
// User & Auth Types
// ============================================

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  locale: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = "admin" | "manager" | "analyst" | "viewer";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// ============================================
// Project Types
// ============================================

export interface Project {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  accentColor?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  settings: ProjectSettings;
  stats?: ProjectStats;
}

export interface ProjectSettings {
  keywords: string[];
  excludedKeywords: string[];
  activeSources: string[];
  excludedSites: string[];
  notifications: NotificationSettings;
}

export interface ProjectStats {
  totalMentions: number;
  totalReach: number;
  positivePercentage: number;
  negativePercentage: number;
  presenceScore: number;
}

export interface NotificationSettings {
  email: boolean;
  webhookUrl?: string;
  alertThreshold?: number;
}

// ============================================
// Mention Types
// ============================================

export interface Mention {
  id: string;
  projectId: string;
  sourceId: string;
  url: string;
  title: string;
  body: string;
  snippet: string;
  publishedAt: string;
  ingestedAt: string;
  language: string;
  country: string;
  sentimentScore: number;
  sentimentLabel: SentimentLabel;
  topic?: string;
  topicId?: string;
  reach: number;
  influenceScore: number;
  visited: boolean;
  saved: boolean;
  rawS3Path?: string;
  source: Source;
  entities?: Entity[];
  summary?: string;
  emotions?: EmotionData;
  tags?: string[];
}

export type SentimentLabel = "positive" | "neutral" | "negative";

export interface Entity {
  id: string;
  type: EntityType;
  value: string;
  startPos: number;
  endPos: number;
  confidence: number;
}

export type EntityType = "PERSON" | "ORG" | "LOC" | "PRODUCT" | "EVENT" | "OTHER";

export interface EmotionData {
  joy: number;
  anger: number;
  sadness: number;
  surprise: number;
  fear: number;
}

// ============================================
// Source Types
// ============================================

export interface Source {
  id: string;
  projectId: string;
  name: string;
  type: SourceType;
  baseUrl: string;
  active: boolean;
  lastCrawledAt?: string;
  trustScore: number;
  country?: string;
  language?: string;
  icon?: string;
}

export type SourceType = 
  | "facebook"
  | "twitter"
  | "tiktok"
  | "youtube"
  | "instagram"
  | "linkedin"
  | "telegram"
  | "news"
  | "blogs"
  | "podcasts"
  | "videos"
  | "websites"
  | "other";

// ============================================
// Filter Types
// ============================================

export interface MentionFilters {
  dateFrom?: string;
  dateTo?: string;
  sources?: SourceType[];
  sentiment?: SentimentLabel[];
  topic?: string;
  languages?: string[];
  countries?: string[];
  influenceMin?: number;
  influenceMax?: number;
  visited?: boolean;
  saved?: boolean;
  search?: string;
  importance?: "all" | "important";
  authorId?: string;
}

export interface SavedFilter {
  id: string;
  projectId: string;
  userId: string;
  name: string;
  filters: MentionFilters;
  createdAt: string;
}

// ============================================
// Insight Types
// ============================================

export interface Insight {
  id: string;
  projectId: string;
  type: InsightType;
  title: string;
  description: string;
  metric?: number;
  metricChange?: number;
  severity: InsightSeverity;
  createdAt: string;
  relatedMentionIds?: string[];
}

export type InsightType = 
  | "trend_up"
  | "trend_down"
  | "anomaly"
  | "recommendation"
  | "alert"
  | "summary";

export type InsightSeverity = "low" | "medium" | "high" | "critical";

// ============================================
// Report Types
// ============================================

export interface Report {
  id: string;
  projectId: string;
  name: string;
  type: ReportType;
  config: ReportConfig;
  status: ReportStatus;
  fileUrl?: string;
  createdAt: string;
  completedAt?: string;
}

export type ReportType = "pdf" | "excel" | "infographic" | "email";
export type ReportStatus = "pending" | "processing" | "completed" | "failed";

export interface ReportConfig {
  sections: ReportSection[];
  filters?: MentionFilters;
  language: string;
  logo?: string;
  accentColor?: string;
  description?: string;
}

export type ReportSection = 
  | "summary"
  | "mentions_chart"
  | "reach_chart"
  | "sentiment_chart"
  | "top_mentions"
  | "top_sources"
  | "top_influencers"
  | "hashtags"
  | "quotes";

export interface EmailReportSchedule {
  id: string;
  projectId: string;
  recipients: string[];
  frequency: "daily" | "weekly" | "monthly" | "on_event";
  config: ReportConfig;
  sendTime: string;
  timezone: string;
  active: boolean;
  lastSentAt?: string;
  nextSendAt?: string;
}

// ============================================
// Influencer Types
// ============================================

export interface Influencer {
  id: string;
  projectId: string;
  handle: string;
  platform: SourceType;
  displayName: string;
  avatar?: string;
  followers: number;
  avgEngagement: number;
  influenceScore: number;
  mentionsCount: number;
  reach: number;
  shareOfVoice: number;
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  lastSeen: string;
}

// ============================================
// Analytics Types
// ============================================

export interface TimeSeriesData {
  date: string;
  mentions: number;
  reach: number;
  positive?: number;
  neutral?: number;
  negative?: number;
}

export interface CategoryData {
  category: string;
  mentions: number;
  reach: number;
  percentage: number;
}

export interface GeoData {
  country: string;
  countryCode: string;
  mentions: number;
  reach: number;
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

export interface HotHoursData {
  day: number; // 0-6 (Sunday-Saturday)
  hour: number; // 0-23
  mentions: number;
}

export interface TrendingItem {
  id: string;
  value: string; // hashtag or link
  mentions: number;
  reach: number;
  change: number; // percentage change
  sentiment: SentimentLabel;
}

// ============================================
// Chat / AI Assistant Types
// ============================================

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  metadata?: {
    tokensUsed?: number;
    model?: string;
    sources?: string[];
  };
}

export interface Chat {
  id: string;
  projectId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Topic Types
// ============================================

export interface Topic {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  parentTopicId?: string;
  mentionsCount: number;
  reach: number;
  shareOfVoice: number;
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  trend: number[]; // Last 7 days sparkline data
  createdAt: string;
}

// ============================================
// Comparison Types
// ============================================

export interface ComparisonResult {
  type: "projects" | "periods";
  items: ComparisonItem[];
  metrics: ComparisonMetric[];
}

export interface ComparisonItem {
  id: string;
  name: string;
  dateRange?: {
    from: string;
    to: string;
  };
}

export interface ComparisonMetric {
  name: string;
  values: {
    itemId: string;
    value: number;
    change?: number;
  }[];
}

// ============================================
// API Response Types
// ============================================

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

