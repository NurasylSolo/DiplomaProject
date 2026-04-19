"use client";

import { Download, Heart, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks";
import { DateRangeTabs, type DatePresetId } from "@/features/_shared";

interface EmotionsHeaderProps {
  totalAnalyzed: number;
  isRefetching: boolean;
  isBackfilling: boolean;
  preset: DatePresetId;
  onPresetChange: (p: DatePresetId) => void;
  onRefresh: () => void;
  onBackfill: () => void;
  onExportCsv: () => void;
}

export function EmotionsHeader({
  totalAnalyzed,
  isRefetching,
  isBackfilling,
  preset,
  onPresetChange,
  onRefresh,
  onBackfill,
  onExportCsv,
}: EmotionsHeaderProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Heart className="h-7 w-7 text-primary" />
          {t("emotionsPage.title")}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t("emotionsPage.subtitle", {
            count: totalAnalyzed,
            defaultValue: "Emotions across {{count}} analyzed mentions",
          })}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <DateRangeTabs
          value={preset}
          onChange={onPresetChange}
          i18nRoot="analysis.dateRange"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefetching}
        >
          <RefreshCw
            className={cn("h-4 w-4 mr-2", isRefetching && "animate-spin")}
          />
          {t("emotionsPage.actions.refresh", { defaultValue: "Refresh" })}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onBackfill}
          disabled={isBackfilling}
          // We surface the backfill action prominently — it's the main
          // way to populate emotions for legacy mentions ingested before
          // GPT scoring was wired in.
          title={t("emotionsPage.actions.backfillHint", {
            defaultValue: "Re-classify mentions whose emotions look empty",
          })}
        >
          {isBackfilling ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          {t("emotionsPage.actions.backfill", {
            defaultValue: "Re-analyze with AI",
          })}
        </Button>
        <Button variant="outline" size="sm" onClick={onExportCsv}>
          <Download className="h-4 w-4 mr-2" />
          {t("emotionsPage.actions.exportCsv", { defaultValue: "Export CSV" })}
        </Button>
      </div>
    </div>
  );
}
