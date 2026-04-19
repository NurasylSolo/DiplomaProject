"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/hooks";
import {
  BestTimesPanel,
  HotHoursHeader,
  HotHoursHeatmap,
  HotHoursStats,
  TopHoursList,
  exportHotHoursCsv,
  useHotHoursPage,
} from "@/features/hot-hours";

interface HotHoursPageProps {
  params: Promise<{ projectId: string }>;
}

export default function HotHoursPage({ params }: HotHoursPageProps) {
  const { projectId } = use(params);
  const { t } = useTranslation();
  const router = useRouter();
  const page = useHotHoursPage(projectId);

  const handleCellClick = (day: number, hour: number) => {
    // Drill into the Mentions page for this exact day-of-week + hour
    // bucket. The backend filter respects the TZ so the same UTC mention
    // ends up in the right bucket as the user sees on the heatmap.
    const params = new URLSearchParams({
      day_of_week: String(day),
      hour: String(hour),
      tz: page.tz,
    });
    router.push(`/projects/${projectId}/mentions?${params.toString()}`);
  };

  const handleExport = () => {
    const ok = exportHotHoursCsv(projectId, page.data);
    toast[ok ? "success" : "error"](
      ok
        ? t("hotHoursPage.toasts.exported", { defaultValue: "CSV exported" })
        : t("hotHoursPage.toasts.noDataExport", {
            defaultValue: "No data to export",
          })
    );
  };

  const handleRefresh = async () => {
    await page.refresh();
    toast.success(
      t("hotHoursPage.toasts.refreshed", { defaultValue: "Refreshed" })
    );
  };

  if (page.isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <HotHoursHeader
        preset={page.preset}
        onPresetChange={page.setPreset}
        tz={page.tz}
        setTz={page.setTz}
        tzOptions={page.tzOptions}
        isRefetching={page.isRefetching}
        onRefresh={handleRefresh}
        onExportCsv={handleExport}
      />

      <HotHoursStats data={page.data} />

      <div className="grid lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <HotHoursHeatmap data={page.data} onCellClick={handleCellClick} />
        </div>
        <div className="space-y-6">
          <TopHoursList
            cells={page.data?.top_cells}
            onCellClick={handleCellClick}
          />
          <BestTimesPanel data={page.data} />
        </div>
      </div>
    </div>
  );
}
