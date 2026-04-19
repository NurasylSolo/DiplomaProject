"use client";

import { use, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/hooks";
import { safeArray, type DatePresetId } from "@/features/_shared";
import {
  AnalysisHeader,
  AnomaliesTab,
  GeoLangTab,
  KeywordsTab,
  OverviewTab,
  SentimentTab,
  SourcesTab,
  buildDailyStackedArea,
  buildLanguagesPie,
  buildPresenceGauge,
  buildSentimentByTopicBar,
  buildSentimentDonut,
  buildSourceTypeDonut,
  buildSourcesBar,
  buildSparkline,
  exportAnalysisCsv,
  useAnalysisData,
  type AnalysisTabKey,
} from "@/features/analysis";

interface AnalysisPageProps {
  params: Promise<{ projectId: string }>;
}

export default function AnalysisPage({ params }: AnalysisPageProps) {
  const { projectId } = use(params);
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const data = useAnalysisData(projectId);
  const [tab, setTab] = useState<string>("overview");

  // ── Apply preset → date filter (delegates to the global mentions store).
  const handlePresetChange = (preset: DatePresetId) => {
    if (preset === "all") {
      data.setDateRange({ from: undefined, to: undefined, preset: "all" });
      return;
    }
    const days =
      preset === "today"
        ? 1
        : preset === "7d"
          ? 7
          : preset === "30d"
            ? 30
            : preset === "90d"
              ? 90
              : 7;
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days + 1);
    data.setDateRange({ from, to, preset });
  };

  // ── KPI numbers
  const totalMentions = data.stats?.total_mentions ?? 0;
  const totalReach = data.stats?.total_reach ?? 0;
  const positivePct = data.stats?.positive_percentage ?? 0;
  const presenceScore = data.project?.stats?.presenceScore ?? 0;

  // ── Chart options (memoized — pure builders, cheap deps).
  const sentimentDonut = useMemo(
    () => buildSentimentDonut(data.stats, isDark, t),
    [data.stats, isDark, t]
  );
  const sparklineOption = useMemo(
    () => buildSparkline(data.timeSeries),
    [data.timeSeries]
  );
  const dailyStackedArea = useMemo(
    () => buildDailyStackedArea(data.timeSeries, isDark, t),
    [data.timeSeries, isDark, t]
  );
  const sentimentByTopicBar = useMemo(
    () => buildSentimentByTopicBar(data.topics, isDark, t),
    [data.topics, isDark, t]
  );
  const sourcesBarOption = useMemo(
    () => buildSourcesBar(data.sources, isDark),
    [data.sources, isDark]
  );
  const sourceTypeDonut = useMemo(
    () => buildSourceTypeDonut(data.sources, isDark),
    [data.sources, isDark]
  );
  const languagesPie = useMemo(
    () => buildLanguagesPie(data.languages, isDark),
    [data.languages, isDark]
  );
  const presenceGauge = useMemo(
    () => buildPresenceGauge(presenceScore, isDark),
    [presenceScore, isDark]
  );

  // ── Header actions
  const handleRefresh = async () => {
    await data.refresh();
    toast.success(t("analysis.actions.refreshDone"));
  };
  const handleExportCsv = (tabKey: AnalysisTabKey) => {
    const ok = exportAnalysisCsv(tabKey, {
      projectId,
      stats: data.stats,
      timeSeries: data.timeSeries,
      keywords: data.keywords,
      sources: data.sources,
      geo: data.geo,
      languages: data.languages,
      anomalies: data.anomalies,
      presenceScore,
    });
    if (ok) toast.success(t("analysis.actions.exportDone"));
    else toast.error(t("analysis.empty.noDataExport"));
  };

  if (data.isProjectLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AnalysisHeader
        projectId={projectId}
        dateLabel={data.dateLabel}
        activePreset={data.activePreset as DatePresetId}
        onPresetChange={handlePresetChange}
        isRefetching={data.isRefetching}
        onRefresh={handleRefresh}
        onExportCsv={handleExportCsv}
      />

      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList className="glass flex-wrap h-auto p-1 gap-1">
          <TabsTrigger value="overview" className="text-xs">
            {t("analysis.tabs.overview")}
          </TabsTrigger>
          <TabsTrigger value="sentiment" className="text-xs">
            {t("analysis.tabs.sentiment")}
          </TabsTrigger>
          <TabsTrigger value="keywords" className="text-xs">
            {t("analysis.tabs.keywords")}
          </TabsTrigger>
          <TabsTrigger value="sources" className="text-xs">
            {t("analysis.tabs.sources")}
          </TabsTrigger>
          <TabsTrigger value="geo-lang" className="text-xs">
            {t("analysis.tabs.geoLang")}
          </TabsTrigger>
          <TabsTrigger value="anomalies" className="text-xs">
            {t("analysis.tabs.anomalies")}
            {safeArray(data.anomalies).length > 0 && (
              <Badge variant="secondary" className="ml-2 px-1.5 text-[10px]">
                {safeArray(data.anomalies).length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab
            projectId={projectId}
            totalMentions={totalMentions}
            totalReach={totalReach}
            positivePct={positivePct}
            presenceScore={presenceScore}
            stats={data.stats}
            sentimentDonut={sentimentDonut}
            presenceGauge={presenceGauge}
            sparklineOption={sparklineOption}
            sourcesBarOption={sourcesBarOption}
            languagesPie={languagesPie}
            timeSeries={data.timeSeries}
            sources={data.sources}
            languages={data.languages}
          />
        </TabsContent>

        <TabsContent value="sentiment">
          <SentimentTab
            sentimentByTopicBar={sentimentByTopicBar}
            dailyStackedArea={dailyStackedArea}
            topics={data.topics}
            timeSeries={data.timeSeries}
            topPositive={data.topPositive}
            topNegative={data.topNegative}
          />
        </TabsContent>

        <TabsContent value="keywords">
          <KeywordsTab keywords={data.keywords} links={data.links} />
        </TabsContent>

        <TabsContent value="sources">
          <SourcesTab
            sources={data.sources}
            sourcesBarOption={sourcesBarOption}
            sourceTypeDonut={sourceTypeDonut}
          />
        </TabsContent>

        <TabsContent value="geo-lang">
          <GeoLangTab
            projectId={projectId}
            geo={data.geo}
            languages={data.languages}
            languagesPie={languagesPie}
          />
        </TabsContent>

        <TabsContent value="anomalies">
          <AnomaliesTab
            projectId={projectId}
            anomalies={data.anomalies}
            setDateRange={data.setDateRange}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
