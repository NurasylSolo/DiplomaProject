"use client";

import Link from "next/link";
import { BarChart3, Download, FileText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks";
import { DateRangeTabs, type DatePresetId } from "@/features/_shared";
import type { AnalysisTabKey } from "../utils/csv-export";

interface AnalysisHeaderProps {
  projectId: string;
  dateLabel: string;
  activePreset: DatePresetId;
  onPresetChange: (preset: DatePresetId) => void;
  isRefetching: boolean;
  onRefresh: () => void;
  onExportCsv: (tab: AnalysisTabKey) => void;
}

export function AnalysisHeader({
  projectId,
  dateLabel,
  activePreset,
  onPresetChange,
  isRefetching,
  onRefresh,
  onExportCsv,
}: AnalysisHeaderProps) {
  const { t } = useTranslation();

  const tabs: AnalysisTabKey[] = [
    "overview",
    "sentiment",
    "keywords",
    "sources",
    "geo-lang",
    "anomalies",
  ];

  return (
    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-7 w-7 text-primary" />
          {t("analysis.title")}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t("analysis.subtitle")} ·{" "}
          <span className="font-medium">{dateLabel}</span>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <DateRangeTabs value={activePreset} onChange={onPresetChange} />

        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefetching}
        >
          <RefreshCw
            className={cn("h-4 w-4 mr-2", isRefetching && "animate-spin")}
          />
          {t("analysis.actions.refresh")}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              {t("analysis.actions.exportCsv")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {tabs.map((tabKey) => (
              <DropdownMenuItem key={tabKey} onClick={() => onExportCsv(tabKey)}>
                {t(`analysis.tabs.${tabKeyToI18n(tabKey)}`)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Link href={`/projects/${projectId}/reports/pdf`}>
          <Button size="sm" className="glow-sm">
            <FileText className="h-4 w-4 mr-2" />
            {t("analysis.actions.openPdf")}
          </Button>
        </Link>
      </div>
    </div>
  );
}

function tabKeyToI18n(tab: AnalysisTabKey): string {
  return tab === "geo-lang" ? "geoLang" : tab;
}
