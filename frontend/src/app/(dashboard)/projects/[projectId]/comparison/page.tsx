"use client";

import { use, useMemo } from "react";
import { Sparkles } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "@/hooks";
import { downloadCsv, buildCsvFilename, type CsvRow } from "@/lib/csv";
import {
  ComparisonHeader,
  OverviewTab,
  ReachTab,
  SelectorCard,
  SentimentTab,
  TimeSeriesTab,
  buildMentionsBar,
  buildRadar,
  buildReachBar,
  buildSentimentStackedBar,
  buildShareOfVoiceDonut,
  buildTimeSeriesLine,
  useComparisonData,
  type ComparisonMetricKey,
} from "@/features/comparison";

interface ComparisonPageProps {
  params: Promise<{ projectId: string }>;
}

export default function ComparisonPage({ params }: ComparisonPageProps) {
  const { projectId } = use(params);
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const data = useComparisonData(projectId);

  // ── Chart options (memoized; pure builders).
  const radarOption = useMemo(
    () => buildRadar(data.comparedProjects, data.getMetricValue, isDark, t),
    [data.comparedProjects, data.getMetricValue, isDark, t]
  );
  const mentionsBarOption = useMemo(
    () => buildMentionsBar(data.comparedProjects, data.getMetricValue, isDark, t),
    [data.comparedProjects, data.getMetricValue, isDark, t]
  );
  const reachBarOption = useMemo(
    () => buildReachBar(data.comparedProjects, data.getMetricValue, isDark, t),
    [data.comparedProjects, data.getMetricValue, isDark, t]
  );
  const sentimentStackedBar = useMemo(
    () =>
      buildSentimentStackedBar(
        data.comparedProjects,
        data.sentimentDist,
        isDark,
        t
      ),
    [data.comparedProjects, data.sentimentDist, isDark, t]
  );
  const shareOfVoiceDonut = useMemo(
    () => buildShareOfVoiceDonut(data.comparedProjects, data.getMetricValue, isDark),
    [data.comparedProjects, data.getMetricValue, isDark]
  );
  const timeSeriesLine = useMemo(
    () => buildTimeSeriesLine(data.comparedProjects, data.tsPerItem, isDark),
    [data.comparedProjects, data.tsPerItem, isDark]
  );

  // ── Header actions
  const handleRefresh = () => {
    data.resetComparison();
    data.triggerCompare();
    toast.success(t("comparisonPage.toasts.refreshed"));
  };

  const handleExportCsv = () => {
    if (data.comparedProjects.length === 0) {
      toast.error(t("comparisonPage.toasts.noDataExport"));
      return;
    }
    const metrics: ComparisonMetricKey[] = [
      "total_mentions",
      "total_reach",
      "positive_pct",
      "neutral_pct",
      "negative_pct",
      "avg_influence",
      "avg_sentiment",
      "share_of_voice",
    ];
    const rows: CsvRow[] = metrics.map((key) => {
      const row: CsvRow = { metric: key };
      data.comparedProjects.forEach((p) => {
        row[p.name] = data.getMetricValue(key, p.id);
      });
      return row;
    });
    downloadCsv(buildCsvFilename("comparison", projectId), rows);
    toast.success(t("comparisonPage.toasts.exported"));
  };

  return (
    <div className="space-y-6">
      <ComparisonHeader
        datePreset={data.datePreset}
        onPresetChange={data.setDatePreset}
        isComparing={data.isComparing}
        onRefresh={handleRefresh}
        onExportCsv={handleExportCsv}
      />

      <SelectorCard
        projectId={projectId}
        projectsList={data.projectsList}
        selectedProjects={data.selectedProjects}
        setSelectedProjects={data.setSelectedProjects}
        comparedProjects={data.comparedProjects}
        createProjectMutation={data.createProjectMutation}
      />

      {data.comparedProjects.length < 2 ? (
        <Card className="glass">
          <CardContent className="p-12 text-center space-y-3">
            <Sparkles className="h-10 w-10 text-muted-foreground mx-auto" />
            <h3 className="font-display text-lg font-semibold">
              {t("comparisonPage.empty.title")}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {t("comparisonPage.empty.description")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="glass flex-wrap h-auto p-1 gap-1">
            <TabsTrigger value="overview" className="text-xs">
              {t("comparisonPage.tabs.overview")}
            </TabsTrigger>
            <TabsTrigger value="sentiment" className="text-xs">
              {t("comparisonPage.tabs.sentiment")}
            </TabsTrigger>
            <TabsTrigger value="time-series" className="text-xs">
              {t("comparisonPage.tabs.timeSeries")}
            </TabsTrigger>
            <TabsTrigger value="reach" className="text-xs">
              {t("comparisonPage.tabs.reach")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab
              comparedProjects={data.comparedProjects}
              getMetricValue={data.getMetricValue}
              winner={data.winner}
              radarOption={radarOption}
              shareOfVoiceDonut={shareOfVoiceDonut}
            />
          </TabsContent>

          <TabsContent value="sentiment">
            <SentimentTab
              comparedProjects={data.comparedProjects}
              sentimentDist={data.sentimentDist}
              sentimentStackedBar={sentimentStackedBar}
            />
          </TabsContent>

          <TabsContent value="time-series">
            <TimeSeriesTab
              tsPerItem={data.tsPerItem}
              timeSeriesLine={timeSeriesLine}
            />
          </TabsContent>

          <TabsContent value="reach">
            <ReachTab
              reachBarOption={reachBarOption}
              mentionsBarOption={mentionsBarOption}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
