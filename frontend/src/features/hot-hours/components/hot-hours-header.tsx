"use client";

import { Clock, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks";
import { DateRangeTabs, type DatePresetId } from "@/features/_shared";

interface HotHoursHeaderProps {
  preset: DatePresetId;
  onPresetChange: (p: DatePresetId) => void;
  tz: string;
  setTz: (v: string) => void;
  tzOptions: { value: string; label: string }[];
  isRefetching: boolean;
  onRefresh: () => void;
  onExportCsv: () => void;
}

export function HotHoursHeader({
  preset,
  onPresetChange,
  tz,
  setTz,
  tzOptions,
  isRefetching,
  onRefresh,
  onExportCsv,
}: HotHoursHeaderProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Clock className="h-7 w-7 text-primary" />
          {t("hotHoursPage.title")}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t("hotHoursPage.subtitle")}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <DateRangeTabs
          value={preset}
          onChange={onPresetChange}
          i18nRoot="analysis.dateRange"
        />
        <Select value={tz} onValueChange={setTz}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {tzOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefetching}
        >
          <RefreshCw
            className={cn("h-4 w-4 mr-2", isRefetching && "animate-spin")}
          />
          {t("hotHoursPage.actions.refresh", { defaultValue: "Refresh" })}
        </Button>
        <Button variant="outline" size="sm" onClick={onExportCsv}>
          <Download className="h-4 w-4 mr-2" />
          {t("hotHoursPage.actions.exportCsv", { defaultValue: "Export CSV" })}
        </Button>
      </div>
    </div>
  );
}
