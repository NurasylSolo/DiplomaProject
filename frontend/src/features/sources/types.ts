export interface SourceRow {
  id: string;
  name: string;
  type: string;
  baseUrl: string;
  active: boolean;
  trustScore: number;
  trusted: boolean;
  country: string | null;
  language: string | null;
  mentionCount: number;
  totalReach: number;
  avgSentiment: number;
  lastPublishedAt: Date | null;
  lastCrawledAt: Date | null;
  createdAt: Date | null;
}

export type SortKey =
  | "name"
  | "type"
  | "mentions"
  | "reach"
  | "trust"
  | "lastPublished";

export type SortOrder = "asc" | "desc";

export const SOURCE_TYPE_OPTIONS = [
  "news",
  "blogs",
  "websites",
  "twitter",
  "facebook",
  "youtube",
  "telegram",
  "tiktok",
] as const;

export const TYPE_BADGE_COLORS: Record<string, string> = {
  news: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  blogs: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30",
  blog: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30",
  websites: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
  twitter: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30",
  facebook: "bg-blue-700/10 text-blue-700 dark:text-blue-400 border-blue-700/30",
  youtube: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
  telegram: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
  tiktok: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
  social: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
  video: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
};
