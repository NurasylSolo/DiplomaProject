import {
  AlertTriangle,
  Lightbulb,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import type { InsightDto } from "@/lib/api/services/insights";

export type InsightUiType =
  | "alert"
  | "trend"
  | "recommendation"
  | "opportunity";
export type InsightSeverity = "high" | "medium" | "low";

/** Map heterogeneous backend insight type strings into UI buckets. */
export function normalizeInsightType(t: string): InsightUiType {
  const v = (t || "").toLowerCase();
  if (v === "alert" || v === "anomaly") return "alert";
  if (v === "trend" || v === "trend_up" || v === "trend_down") return "trend";
  if (v === "recommendation") return "recommendation";
  return "opportunity";
}

export const INSIGHT_TYPE_ICONS: Record<InsightUiType, React.ElementType> = {
  alert: AlertTriangle,
  trend: TrendingUp,
  recommendation: Lightbulb,
  opportunity: Sparkles,
};

export const INSIGHT_SEVERITY_COLORS: Record<InsightSeverity, string> = {
  high: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  low: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
};

export interface InsightItem {
  id: string;
  type: InsightUiType;
  rawType: string;
  severity: InsightSeverity;
  title: string;
  description: string;
  category: string;
  metricChange: number | null | undefined;
  relatedMentionIds: string[];
  createdAt: string | null | undefined;
}

/** Normalise raw API insights into UI shape, optionally hiding ids. */
export function normalizeInsights(
  apiInsights: InsightDto[] | undefined,
  hiddenIds: Set<string>
): InsightItem[] {
  return (apiInsights || [])
    .filter((i) => !hiddenIds.has(i.id))
    .map((i) => ({
      id: i.id,
      type: normalizeInsightType(i.type),
      rawType: i.type,
      severity: ((i.severity || "medium") as InsightSeverity),
      title: i.title,
      description: i.description,
      category: (i.category || "general").toLowerCase(),
      metricChange: i.metric_change,
      relatedMentionIds: i.related_mention_ids || [],
      createdAt: i.created_at,
    }));
}
