"use client";

import { Download, Globe, ListPlus, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks";

interface SourcesHeaderProps {
  isRefetching: boolean;
  onRefresh: () => void;
  onExportCsv: () => void;
  onOpenAttach: () => void;
  onOpenAdd: () => void;
}

export function SourcesHeader({
  isRefetching,
  onRefresh,
  onExportCsv,
  onOpenAttach,
  onOpenAdd,
}: SourcesHeaderProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Globe className="h-7 w-7 text-primary" />
          {t("sources.title")}
        </h1>
        <p className="text-muted-foreground mt-1">{t("sources.subtitle")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefetching}>
          <RefreshCw className={cn("h-4 w-4 mr-2", isRefetching && "animate-spin")} />
          {t("sources.actions.refresh")}
        </Button>
        <Button variant="outline" size="sm" onClick={onExportCsv}>
          <Download className="h-4 w-4 mr-2" />
          {t("sources.actions.exportCsv")}
        </Button>
        <Button variant="outline" size="sm" onClick={onOpenAttach}>
          <ListPlus className="h-4 w-4 mr-2" />
          {t("sources.actions.attachCatalog")}
        </Button>
        <Button size="sm" className="glow-sm" onClick={onOpenAdd}>
          <Plus className="h-4 w-4 mr-2" />
          {t("sources.addSource")}
        </Button>
      </div>
    </div>
  );
}
