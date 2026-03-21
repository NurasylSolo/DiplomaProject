export * from "./routes";

// Source types with icons
export const SOURCE_TYPES = {
  FACEBOOK: { id: "facebook", label: "Facebook", icon: "facebook", color: "#1877F2" },
  TWITTER: { id: "twitter", label: "X (Twitter)", icon: "twitter", color: "#1DA1F2" },
  TIKTOK: { id: "tiktok", label: "TikTok", icon: "tiktok", color: "#000000" },
  YOUTUBE: { id: "youtube", label: "YouTube", icon: "youtube", color: "#FF0000" },
  INSTAGRAM: { id: "instagram", label: "Instagram", icon: "instagram", color: "#E4405F" },
  LINKEDIN: { id: "linkedin", label: "LinkedIn", icon: "linkedin", color: "#0A66C2" },
  TELEGRAM: { id: "telegram", label: "Telegram", icon: "telegram", color: "#26A5E4" },
  NEWS: { id: "news", label: "News", icon: "newspaper", color: "#4A5568" },
  BLOGS: { id: "blogs", label: "Blogs", icon: "file-text", color: "#805AD5" },
  PODCASTS: { id: "podcasts", label: "Podcasts", icon: "headphones", color: "#D53F8C" },
  VIDEOS: { id: "videos", label: "Videos", icon: "video", color: "#E53E3E" },
  WEBSITES: { id: "websites", label: "Websites", icon: "globe", color: "#38A169" },
  OTHER: { id: "other", label: "Other", icon: "more-horizontal", color: "#718096" },
} as const;

// Sentiment types
export const SENTIMENT_TYPES = {
  POSITIVE: { id: "positive", label: "Positive", color: "var(--positive)" },
  NEUTRAL: { id: "neutral", label: "Neutral", color: "var(--neutral)" },
  NEGATIVE: { id: "negative", label: "Negative", color: "var(--negative)" },
} as const;

// Emotion types
export const EMOTION_TYPES = {
  JOY: { id: "joy", label: "Joy", emoji: "😊", color: "#FFD93D" },
  ANGER: { id: "anger", label: "Anger", emoji: "😠", color: "#FF6B6B" },
  SADNESS: { id: "sadness", label: "Sadness", emoji: "😢", color: "#4ECDC4" },
  SURPRISE: { id: "surprise", label: "Surprise", emoji: "😲", color: "#A78BFA" },
  FEAR: { id: "fear", label: "Fear", emoji: "😨", color: "#6B7280" },
} as const;

// Date range presets
export const DATE_RANGE_PRESETS = [
  { id: "all", label: "All time", days: -1 },
  { id: "today", label: "Today", days: 0 },
  { id: "yesterday", label: "Yesterday", days: 1 },
  { id: "7days", label: "Last 7 days", days: 7 },
  { id: "30days", label: "Last 30 days", days: 30 },
  { id: "90days", label: "Last 90 days", days: 90 },
  { id: "custom", label: "Custom range", days: -1 },
] as const;

// Languages supported
export const LANGUAGES = {
  EN: { code: "en", label: "English", flag: "🇬🇧" },
  RU: { code: "ru", label: "Русский", flag: "🇷🇺" },
  KZ: { code: "kz", label: "Қазақша", flag: "🇰🇿" },
} as const;

// User roles
export const USER_ROLES = {
  ADMIN: { id: "admin", label: "Administrator", permissions: "*" },
  MANAGER: { id: "manager", label: "Manager", permissions: "manage_project" },
  ANALYST: { id: "analyst", label: "Analyst", permissions: "analyze" },
  VIEWER: { id: "viewer", label: "Viewer", permissions: "view" },
} as const;

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PER_PAGE: 25,
  PER_PAGE_OPTIONS: [10, 25, 50, 100],
} as const;

// Animation durations (ms)
export const ANIMATIONS = {
  FAST: 150,
  NORMAL: 200,
  SLOW: 300,
  VERY_SLOW: 500,
} as const;

