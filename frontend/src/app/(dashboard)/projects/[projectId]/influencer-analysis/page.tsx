"use client";

import { use } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/hooks";
import {
  AnalysisComparisons,
  AnalysisDetail,
  AnalysisHeader,
  AnalysisKpi,
  AnalysisRanking,
  useInfluencerAnalysis,
} from "@/features/influencer-analysis";
import { exportInfluencersCsv } from "@/features/influencers";

interface InfluencerAnalysisPageProps {
  params: Promise<{ projectId: string }>;
}

export default function InfluencerAnalysisPage({
  params,
}: InfluencerAnalysisPageProps) {
  const { projectId } = use(params);
  const { t } = useTranslation();

  const data = useInfluencerAnalysis(projectId);

  const handleRefresh = async () => {
    try {
      await data.refresh();
      toast.success(
        t("influencerAnalysis.toasts.refreshed", {
          defaultValue: "Refreshed",
        })
      );
    } catch {
      toast.error(
        t("influencerAnalysis.toasts.refreshFailed", {
          defaultValue: "Failed to refresh",
        })
      );
    }
  };

  const handleExport = () => {
    const ok = exportInfluencersCsv(projectId, data.influencers);
    if (ok) {
      toast.success(
        t("influencerAnalysis.toasts.exported", { defaultValue: "Exported" })
      );
    } else {
      toast.error(
        t("influencerAnalysis.toasts.noDataExport", {
          defaultValue: "Nothing to export",
        })
      );
    }
  };

  if (data.isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AnalysisHeader
        isRefreshing={data.isRefetching}
        hasData={data.influencers.length > 0}
        onRefresh={handleRefresh}
        onExport={handleExport}
      />

      <AnalysisKpi
        isLoading={data.isLoading}
        totalVoices={data.kpi.totalVoices}
        avgScore={data.kpi.avgScore}
        totalReach={data.kpi.totalReach}
        topPlatform={data.kpi.topPlatform}
      />

      {data.influencers.length === 0 ? (
        <Card className="glass">
          <CardContent className="py-16 text-center space-y-2">
            <p className="text-base font-medium">
              {t("influencerAnalysis.empty.title", {
                defaultValue: "No voices in this project yet",
              })}
            </p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {t("influencerAnalysis.empty.body", {
                defaultValue:
                  "Run an ingestion to collect mentions — once any source publishes about your topic it will show up here as a voice.",
              })}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <AnalysisRanking
                influencers={data.topInfluencers}
                selectedId={data.selectedId}
                onSelect={data.setSelectedId}
              />
            </div>
            <div className="lg:col-span-2">
              <AnalysisDetail
                influencer={data.selected}
                mentions={data.mentions}
                mentionsLoading={data.mentionsLoading}
              />
            </div>
          </div>

          <AnalysisComparisons influencers={data.influencers} />
        </>
      )}
    </div>
  );
}
