"use client";

import { Download, RefreshCw, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks";
import { cn } from "@/lib/utils";

interface AnalysisHeaderProps {
  isRefreshing: boolean;
  hasData: boolean;
  onRefresh: () => void;
  onExport: () => void;
}

export function AnalysisHeader({
  isRefreshing,
  hasData,
  onRefresh,
  onExport,
}: AnalysisHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <UserCheck className="h-7 w-7 text-primary" />
          {t("influencerAnalysis.title")}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t("influencerAnalysis.subtitle")}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw
            className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")}
          />
          {isRefreshing
            ? t("influencerAnalysis.actions.refreshing", {
                defaultValue: "Refreshing…",
              })
            : t("influencerAnalysis.actions.refresh", {
                defaultValue: "Refresh",
              })}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          disabled={!hasData}
        >
          <Download className="h-4 w-4 mr-2" />
          {t("influencerAnalysis.actions.exportCsv", {
            defaultValue: "Export CSV",
          })}
        </Button>
      </div>
    </div>
  );
}
