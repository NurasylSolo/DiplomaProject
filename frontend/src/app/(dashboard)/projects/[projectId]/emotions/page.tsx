"use client";

import { use, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTheme } from "next-themes";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import {
  useBackfillEmotions,
  useEmotionsData,
  useTranslation,
} from "@/hooks";
import { useDatePreset, type DatePresetId } from "@/features/_shared";
import {
  EmotionBreakdown,
  EmotionsCharts,
  EmotionsHeader,
  EmotionsStatsGrid,
  TopMentionsPerEmotion,
  buildEmotionDonut,
  buildEmotionTimeline,
  exportEmotionsCsv,
  type EmotionKey,
} from "@/features/emotions";

interface EmotionAnalysisPageProps {
  params: Promise<{ projectId: string }>;
}

export default function EmotionAnalysisPage({ params }: EmotionAnalysisPageProps) {
  const { projectId } = use(params);
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const queryClient = useQueryClient();

  // Date filter — same DateRangeTabs pattern used elsewhere on the dashboard.
  const { preset, setPreset, range } = useDatePreset("all");

  const { data, isLoading, isRefetching } = useEmotionsData(projectId, range);
  const backfill = useBackfillEmotions(projectId);

  // Drill-down state — clicking a card / breakdown row sets this and the
  // top-mentions panel narrows to that emotion.
  const [selected, setSelected] = useState<EmotionKey | null>(null);

  const donutOption = useMemo(
    () => buildEmotionDonut(data?.averages, isDark, t),
    [data?.averages, isDark, t]
  );
  const timelineOption = useMemo(
    () => buildEmotionTimeline(data?.daily_timeline, isDark, t),
    [data?.daily_timeline, isDark, t]
  );

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["emotions", projectId] });
    toast.success(
      t("emotionsPage.toasts.refreshed", { defaultValue: "Refreshed" })
    );
  };

  const handleBackfill = () => {
    backfill.mutate(undefined, {
      onSuccess: (res) => {
        toast.success(
          t("emotionsPage.toasts.backfillDone", {
            defaultValue:
              "Re-classified {{processed}} of {{candidates}} mentions ({{updated}} now have emotions)",
            processed: res.processed,
            candidates: res.candidates,
            updated: res.updated,
          })
        );
      },
      onError: () =>
        toast.error(
          t("emotionsPage.toasts.backfillFailed", {
            defaultValue: "AI re-analysis failed",
          })
        ),
    });
  };

  const handleExport = () => {
    const ok = exportEmotionsCsv(projectId, data);
    toast[ok ? "success" : "error"](
      ok
        ? t("emotionsPage.toasts.exported", { defaultValue: "CSV exported" })
        : t("emotionsPage.toasts.noDataExport", {
            defaultValue: "No data to export",
          })
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalAnalyzed = data?.total_analyzed ?? 0;
  const hasAnyEmotion =
    !!data && Object.values(data.averages || {}).some((v) => (v ?? 0) > 0);

  return (
    <div className="space-y-6">
      <EmotionsHeader
        totalAnalyzed={totalAnalyzed}
        isRefetching={isRefetching}
        isBackfilling={backfill.isPending}
        preset={preset as DatePresetId}
        onPresetChange={setPreset}
        onRefresh={handleRefresh}
        onBackfill={handleBackfill}
        onExportCsv={handleExport}
      />

      {!hasAnyEmotion ? (
        <Card className="glass">
          <CardContent className="p-8 text-center text-muted-foreground space-y-3">
            <p className="font-medium">
              {t("emotionsPage.empty.noData", {
                defaultValue: "No emotion data available yet.",
              })}
            </p>
            <p className="text-sm">
              {t("emotionsPage.empty.hint", {
                defaultValue:
                  "Click 'Re-analyze with AI' to classify existing mentions, or wait for the next ingestion run.",
              })}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <EmotionsStatsGrid
            averages={data?.averages}
            selected={selected}
            onSelect={setSelected}
          />

          <EmotionsCharts
            donutOption={donutOption}
            timelineOption={timelineOption}
            averages={data?.averages}
            timeline={data?.daily_timeline}
          />

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <EmotionBreakdown
                averages={data?.averages}
                selected={selected}
                onSelect={setSelected}
              />
            </div>
            <div className="lg:col-span-2">
              <TopMentionsPerEmotion
                topPerEmotion={data?.top_per_emotion}
                selected={selected}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
