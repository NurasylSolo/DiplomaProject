import type { SourceRow } from "../types";

interface ApiSource {
  id: string;
  name: string;
  type?: string;
  baseUrl?: string;
  base_url?: string;
  active?: boolean;
  trustScore?: number;
  trust_score?: number;
  country?: string | null;
  language?: string | null;
  mentionCount?: number;
  mention_count?: number;
  totalReach?: number;
  total_reach?: number;
  avgSentiment?: number;
  avg_sentiment?: number;
  lastPublishedAt?: string | null;
  last_published_at?: string | null;
  lastCrawledAt?: string | null;
  last_crawled_at?: string | null;
  createdAt?: string | null;
  created_at?: string | null;
}

/**
 * Normalise API source (which may use snake_case from /sources endpoint or
 * camelCase from /analytics/sources) into the row shape used by the table.
 */
export function apiSourceToRow(s: ApiSource): SourceRow {
  const trust = Number(s.trustScore ?? s.trust_score ?? 0);
  const lastPub = s.lastPublishedAt || s.last_published_at;
  const lastCrawled = s.lastCrawledAt || s.last_crawled_at;
  const created = s.createdAt || s.created_at;
  return {
    id: s.id,
    name: s.name,
    type: (s.type || "news").toLowerCase(),
    baseUrl: s.baseUrl || s.base_url || "",
    active: !!s.active,
    trustScore: trust,
    trusted: trust >= 0.7,
    country: s.country ?? null,
    language: s.language ?? null,
    mentionCount: Number(s.mentionCount ?? s.mention_count ?? 0),
    totalReach: Number(s.totalReach ?? s.total_reach ?? 0),
    avgSentiment: Number(s.avgSentiment ?? s.avg_sentiment ?? 0),
    lastPublishedAt: lastPub ? new Date(lastPub) : null,
    lastCrawledAt: lastCrawled ? new Date(lastCrawled) : null,
    createdAt: created ? new Date(created) : null,
  };
}

type Translator = (key: string, options?: Record<string, unknown>) => string;

/** Human-readable "5m ago" / "3d ago" timestamp localised by i18next. */
export function relativeTime(d: Date | null, t: Translator): string {
  if (!d || Number.isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return t("sources.relative.justNow");
  const min = Math.floor(sec / 60);
  if (min < 60) return t("sources.relative.minutesAgo", { count: min });
  const hr = Math.floor(min / 60);
  if (hr < 24) return t("sources.relative.hoursAgo", { count: hr });
  const day = Math.floor(hr / 24);
  if (day < 30) return t("sources.relative.daysAgo", { count: day });
  return d.toLocaleDateString();
}
