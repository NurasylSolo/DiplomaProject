"use client";

import { Download, GitCompare, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks";
import { DateRangeTabs, type DatePresetId } from "@/features/_shared";

interface ComparisonHeaderProps {
  datePreset: DatePresetId;
  onPresetChange: (preset: DatePresetId) => void;
  isComparing: boolean;
  onRefresh: () => void;
  onExportCsv: () => void;
}

export function ComparisonHeader({
  datePreset,
  onPresetChange,
  isComparing,
  onRefresh,
  onExportCsv,
}: ComparisonHeaderProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <GitCompare className="h-7 w-7 text-primary" />
          {t("comparisonPage.title")}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t("comparisonPage.subtitle")}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <DateRangeTabs
          value={datePreset}
          onChange={onPresetChange}
          i18nRoot="comparisonPage.dateRange"
        />

        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isComparing}
        >
          <RefreshCw
            className={cn("h-4 w-4 mr-2", isComparing && "animate-spin")}
          />
          {t("comparisonPage.actions.refresh")}
        </Button>

        <Button variant="outline" size="sm" onClick={onExportCsv}>
          <Download className="h-4 w-4 mr-2" />
          {t("comparisonPage.exportCsv")}
        </Button>
      </div>
    </div>
  );
}
