"use client";

import { Download, RefreshCw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks";

interface InfluencersHeaderProps {
  isRefetching: boolean;
  onRefresh: () => void;
  onExportCsv: () => void;
}

export function InfluencersHeader({
  isRefetching,
  onRefresh,
  onExportCsv,
}: InfluencersHeaderProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Users className="h-7 w-7 text-primary" />
          {t("influencers.title")}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t("influencers.subtitle")}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefetching}
        >
          <RefreshCw
            className={cn("h-4 w-4 mr-2", isRefetching && "animate-spin")}
          />
          {t("influencersPage.actions.refresh")}
        </Button>
        <Button variant="outline" size="sm" onClick={onExportCsv}>
          <Download className="h-4 w-4 mr-2" />
          {t("influencersPage.actions.exportCsv")}
        </Button>
      </div>
    </div>
  );
}
