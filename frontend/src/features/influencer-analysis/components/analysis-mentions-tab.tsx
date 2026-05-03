"use client";

import {
  ArrowUpRight,
  Loader2,
  MessageSquareText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/hooks";
import { cn } from "@/lib/utils";
import { fmtCompact } from "@/features/_shared";
import type { InfluencerMentionDto } from "@/lib/api/services/influencers";

interface AnalysisMentionsTabProps {
  mentions: InfluencerMentionDto[];
  isLoading: boolean;
}

const SENTIMENT_COLOR: Record<string, string> = {
  positive:
    "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5",
  neutral:
    "border-slate-400/30 text-slate-500 dark:text-slate-300 bg-slate-500/5",
  negative: "border-red-500/30 text-red-500 bg-red-500/5",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

export function AnalysisMentionsTab({
  mentions,
  isLoading,
}: AnalysisMentionsTabProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (mentions.length === 0) {
    return (
      <div className="text-center py-10 space-y-2">
        <MessageSquareText className="h-8 w-8 text-muted-foreground/50 mx-auto" />
        <p className="text-sm text-muted-foreground">
          {t("influencerAnalysis.detail.mentionsEmpty", {
            defaultValue: "No recent mentions from this voice",
          })}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
      {mentions.map((m) => {
        const sentimentClass =
          SENTIMENT_COLOR[m.sentiment_label] ?? SENTIMENT_COLOR.neutral;
        const handleOpen = () => {
          if (m.url) window.open(m.url, "_blank", "noopener,noreferrer");
        };
        return (
          <button
            key={m.id}
            type="button"
            onClick={handleOpen}
            className={cn(
              "w-full text-left p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors",
              "group flex flex-col gap-2"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                {m.title}
              </p>
              <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
            </div>
            {m.snippet && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {m.snippet}
              </p>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className={cn("capitalize text-[10px]", sentimentClass)}
              >
                {t(`mentions.sentiment.${m.sentiment_label}`, {
                  defaultValue: m.sentiment_label,
                })}
              </Badge>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {fmtDate(m.published_at)}
              </span>
              {m.reach > 0 && (
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  · {fmtCompact(m.reach)}{" "}
                  {t("influencerAnalysis.metrics.reach", { defaultValue: "reach" })}
                </span>
              )}
              {m.country && (
                <span className="text-[10px] text-muted-foreground uppercase">
                  · {m.country}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
