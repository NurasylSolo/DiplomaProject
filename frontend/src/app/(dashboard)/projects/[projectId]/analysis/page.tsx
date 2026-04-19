"use client";

import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import ReactECharts from "echarts-for-react";
import { useTheme } from "next-themes";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BarChart3,
  Download,
  TrendingUp,
  TrendingDown,
  Hash,
  Link2,
  Globe,
  MessageCircle,
  PieChart,
  Activity,
  Eye,
  RefreshCw,
  FileText,
  AlertTriangle,
  ExternalLink,
  Loader2,
  ChevronRight,
  Languages as LanguagesIcon,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
// Note: import order kept explicit so unused-icon warnings stay quiet.
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  useProject,
  useTopics,
  useSourcesBreakdown,
  useTimeSeries,
  useMentionsStats,
  useGeoData,
  useLanguages,
  useKeywords,
  useTopLinks,
  useAnomalies,
  useMentions,
  useTranslation,
} from "@/hooks";
import {
  useMentionsFilterStore,
  buildFilterQuery,
  formatDateRangeLabel,
} from "@/stores/use-mentions-filter-store";
import { downloadCsv, buildCsvFilename, type CsvRow } from "@/lib/csv";
import type {
  SourceBreakdownItem,
  KeywordItem,
  TopLinkItem,
  LanguageItem,
  AnomalyEvent,
} from "@/lib/api/services/analytics";

interface AnalysisPageProps {
  params: Promise<{ projectId: string }>;
}

// ─── helpers ──────────────────────────────────────────────────────────────

function fmtCompact(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

function safeArray<T>(x: T[] | undefined | null): T[] {
  return Array.isArray(x) ? x : [];
}

const DATE_PRESETS: { id: string; days?: number }[] = [
  { id: "all" },
  { id: "today", days: 1 },
  { id: "7d", days: 7 },
  { id: "30d", days: 30 },
  { id: "90d", days: 90 },
];

// ─── reusable date-range button group ────────────────────────────────────

function DateRangeButtons({
  value,
  onChange,
}: {
  value: string;
  onChange: (preset: string) => void;
}) {
  const { t } = useTranslation();
  const labels: Record<string, string> = {
    all: t("analysis.dateRange.allTime"),
    today: t("analysis.dateRange.today"),
    "7d": t("analysis.dateRange.last7"),
    "30d": t("analysis.dateRange.last30"),
    "90d": t("analysis.dateRange.last90"),
  };

  return (
    <div className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-border p-1 bg-muted/30">
      {DATE_PRESETS.map((p) => (
        <button
          key={p.id}
          onClick={() => onChange(p.id)}
          className={cn(
            "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
            value === p.id
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {labels[p.id]}
        </button>
      ))}
    </div>
  );
}

// ─── KPI card with sign-aware delta ─────────────────────────────────────

function KpiCard({
  label,
  value,
  change,
  icon: Icon,
  delay = 0,
  invertColor = false,
}: {
  label: string;
  value: string;
  change: number | null | undefined;
  icon: React.ElementType;
  delay?: number;
  invertColor?: boolean;
}) {
  const { t } = useTranslation();
  const hasChange = change !== null && change !== undefined && Number.isFinite(change);
  const positive = hasChange ? (change as number) >= 0 : true;
  const colored = invertColor ? !positive : positive;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className="glass">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            {hasChange ? (
              <span
                className={cn(
                  "text-xs font-medium flex items-center gap-1",
                  colored ? "text-green-500" : "text-red-500"
                )}
                title={t("analysis.kpi.vsPrev")}
              >
                {positive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {positive ? "+" : ""}
                {change!.toFixed(1)}%
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </div>
          <p className="text-2xl font-bold mt-3 tabular-nums">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── empty state for any chart/list ─────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-10 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

// ─── main page ──────────────────────────────────────────────────────────

export default function AnalysisPage({ params }: AnalysisPageProps) {
  const { projectId } = use(params);
  const { t } = useTranslation();
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const queryClient = useQueryClient();

  // Reuse the global mentions filter store for consistent date-range handling.
  const { filters, setDateRange } = useMentionsFilterStore();
  const filterParams = useMemo(() => buildFilterQuery(filters), [filters]);
  const dateRangeForApi = useMemo(
    () => ({
      date_from: filterParams.date_from as string | undefined,
      date_to: filterParams.date_to as string | undefined,
    }),
    [filterParams]
  );

  // Apply preset → date_from/date_to.
  const handlePresetChange = (preset: string) => {
    if (preset === "all") {
      setDateRange({ from: undefined, to: undefined, preset: "all" });
      return;
    }
    const days = DATE_PRESETS.find((p) => p.id === preset)?.days ?? 7;
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days + 1);
    setDateRange({ from, to, preset });
  };

  const activePreset = filters?.dateRange?.preset ?? "all";
  const dateLabel = formatDateRangeLabel(filters?.dateRange);

  // ─── data ─────────────────────────────────────────────────────────────

  const { data: project, isLoading: projLoading } = useProject(projectId);
  const { data: stats, isLoading: statsLoading, refetch: refetchStats, isRefetching } =
    useMentionsStats(projectId, filterParams);
  const { data: timeSeries } = useTimeSeries(projectId, 30, dateRangeForApi);
  const { data: topics } = useTopics(projectId, dateRangeForApi);
  const { data: srcBreakdown } = useSourcesBreakdown(projectId, {
    ...dateRangeForApi,
    limit: 50,
  });
  const { data: geo } = useGeoData(projectId, dateRangeForApi);
  const { data: languages } = useLanguages(projectId, dateRangeForApi);
  const { data: keywords } = useKeywords(projectId, { ...dateRangeForApi, limit: 60 });
  const { data: links } = useTopLinks(projectId, { ...dateRangeForApi, limit: 20 });
  const { data: anomalies } = useAnomalies(projectId, 30, 2.0);
  const { data: topPositive } = useMentions(projectId, {
    ...filterParams,
    sort_by: "sentiment_score",
    sort_order: "desc",
    per_page: 3,
  });
  const { data: topNegative } = useMentions(projectId, {
    ...filterParams,
    sort_by: "sentiment_score",
    sort_order: "asc",
    per_page: 3,
  });

  // ─── derived ──────────────────────────────────────────────────────────

  const totalMentions = stats?.total_mentions ?? 0;
  const totalReach = stats?.total_reach ?? 0;
  const positivePct = stats?.positive_percentage ?? 0;
  const negativePct = stats?.negative_percentage ?? 0;
  const neutralPct = stats?.neutral_percentage ?? 0;
  const presenceScore = project?.stats?.presenceScore ?? 0;

  const sentimentDonut = useMemo(
    () => ({
      tooltip: {
        trigger: "item" as const,
        backgroundColor: isDark ? "rgba(23,23,23,0.95)" : "rgba(255,255,255,0.95)",
        borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
        textStyle: { color: isDark ? "#e5e5e5" : "#171717" },
      },
      series: [
        {
          type: "pie" as const,
          radius: ["55%", "78%"],
          itemStyle: { borderRadius: 6, borderWidth: 2, borderColor: isDark ? "#171717" : "#fff" },
          label: { show: false },
          data: [
            { value: stats?.positive_count ?? 0, name: t("mentions.sentiments.positive"), itemStyle: { color: "oklch(0.65 0.17 155)" } },
            { value: stats?.neutral_count ?? 0, name: t("mentions.sentiments.neutral"), itemStyle: { color: "oklch(0.55 0.02 260)" } },
            { value: stats?.negative_count ?? 0, name: t("mentions.sentiments.negative"), itemStyle: { color: "oklch(0.60 0.22 25)" } },
          ],
        },
      ],
    }),
    [stats, isDark, t]
  );

  const sparklineOption = useMemo(() => {
    const series = safeArray(timeSeries);
    return {
      tooltip: { trigger: "axis" as const },
      grid: { left: 8, right: 8, top: 8, bottom: 8, containLabel: false },
      xAxis: {
        type: "category" as const,
        show: false,
        data: series.map((p) => p.date),
      },
      yAxis: { type: "value" as const, show: false },
      series: [
        {
          type: "line" as const,
          smooth: true,
          symbol: "none",
          data: series.map((p) => p.mentions),
          areaStyle: { color: "oklch(0.70 0.15 195 / 0.25)" },
          lineStyle: { width: 2, color: "oklch(0.70 0.15 195)" },
        },
      ],
    };
  }, [timeSeries]);

  const dailyStackedArea = useMemo(() => {
    const series = safeArray(timeSeries);
    return {
      tooltip: { trigger: "axis" as const },
      legend: { bottom: 0, textStyle: { color: isDark ? "#a3a3a3" : "#525252" } },
      grid: { left: "3%", right: "4%", bottom: "12%", top: "5%", containLabel: true },
      xAxis: {
        type: "category" as const,
        boundaryGap: false,
        data: series.map((p) => p.date),
        axisLabel: { color: isDark ? "#737373" : "#a3a3a3", fontSize: 10 },
      },
      yAxis: {
        type: "value" as const,
        axisLabel: { color: isDark ? "#737373" : "#a3a3a3" },
        splitLine: { lineStyle: { color: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" } },
      },
      series: [
        {
          name: t("mentions.sentiments.positive"),
          type: "line" as const,
          stack: "total",
          smooth: true,
          areaStyle: { color: "oklch(0.65 0.17 155 / 0.4)" },
          lineStyle: { width: 1.5, color: "oklch(0.65 0.17 155)" },
          data: series.map((p) => p.positive ?? 0),
        },
        {
          name: t("mentions.sentiments.neutral"),
          type: "line" as const,
          stack: "total",
          smooth: true,
          areaStyle: { color: "oklch(0.55 0.02 260 / 0.4)" },
          lineStyle: { width: 1.5, color: "oklch(0.55 0.02 260)" },
          data: series.map((p) => p.neutral ?? 0),
        },
        {
          name: t("mentions.sentiments.negative"),
          type: "line" as const,
          stack: "total",
          smooth: true,
          areaStyle: { color: "oklch(0.60 0.22 25 / 0.4)" },
          lineStyle: { width: 1.5, color: "oklch(0.60 0.22 25)" },
          data: series.map((p) => p.negative ?? 0),
        },
      ],
    };
  }, [timeSeries, isDark, t]);

  const sentimentByTopicBar = useMemo(() => {
    const items = safeArray(topics).slice(0, 8);
    const cats = items.map((tp: any) => tp.name);
    const dist = items.map((tp: any) => tp.sentiment_distribution || tp.sentimentDistribution || {});
    return {
      tooltip: { trigger: "axis" as const },
      legend: { bottom: 0, textStyle: { color: isDark ? "#a3a3a3" : "#525252" } },
      grid: { left: "3%", right: "4%", bottom: "15%", top: "5%", containLabel: true },
      xAxis: {
        type: "category" as const,
        data: cats,
        axisLabel: { color: isDark ? "#737373" : "#a3a3a3", fontSize: 10, interval: 0, rotate: cats.length > 4 ? 20 : 0 },
      },
      yAxis: {
        type: "value" as const,
        axisLabel: { color: isDark ? "#737373" : "#a3a3a3" },
      },
      series: [
        {
          name: t("mentions.sentiments.positive"),
          type: "bar" as const,
          stack: "s",
          itemStyle: { color: "oklch(0.65 0.17 155)" },
          data: dist.map((d: any) => d.positive || 0),
        },
        {
          name: t("mentions.sentiments.neutral"),
          type: "bar" as const,
          stack: "s",
          itemStyle: { color: "oklch(0.55 0.02 260)" },
          data: dist.map((d: any) => d.neutral || 0),
        },
        {
          name: t("mentions.sentiments.negative"),
          type: "bar" as const,
          stack: "s",
          itemStyle: { color: "oklch(0.60 0.22 25)" },
          data: dist.map((d: any) => d.negative || 0),
        },
      ],
    };
  }, [topics, isDark, t]);

  const sourcesBarOption = useMemo(() => {
    const items = safeArray(srcBreakdown).slice(0, 10);
    return {
      tooltip: { trigger: "axis" as const, axisPointer: { type: "shadow" as const } },
      grid: { left: "3%", right: "4%", bottom: "5%", top: "5%", containLabel: true },
      xAxis: { type: "value" as const, axisLabel: { color: isDark ? "#737373" : "#a3a3a3" } },
      yAxis: {
        type: "category" as const,
        inverse: true,
        data: items.map((s) => s.name),
        axisLabel: { color: isDark ? "#a3a3a3" : "#525252", fontSize: 11 },
      },
      series: [
        {
          type: "bar" as const,
          data: items.map((s) => s.mentions_count),
          itemStyle: { color: "oklch(0.70 0.15 195)", borderRadius: [0, 4, 4, 0] },
          barWidth: 14,
        },
      ],
    };
  }, [srcBreakdown, isDark]);

  const sourceTypeDonut = useMemo(() => {
    const items = safeArray(srcBreakdown);
    const byType: Record<string, number> = {};
    items.forEach((s) => {
      byType[s.type] = (byType[s.type] || 0) + s.mentions_count;
    });
    const palette = ["oklch(0.70 0.15 195)", "oklch(0.65 0.17 155)", "oklch(0.75 0.14 75)", "oklch(0.60 0.22 25)", "oklch(0.55 0.02 260)"];
    const data = Object.entries(byType).map(([name, value], i) => ({
      name,
      value,
      itemStyle: { color: palette[i % palette.length] },
    }));
    return {
      tooltip: { trigger: "item" as const },
      series: [
        {
          type: "pie" as const,
          radius: ["55%", "78%"],
          itemStyle: { borderRadius: 6, borderWidth: 2, borderColor: isDark ? "#171717" : "#fff" },
          label: { show: false },
          data,
        },
      ],
    };
  }, [srcBreakdown, isDark]);

  const languagesPie = useMemo(() => {
    const items = safeArray(languages);
    const palette = ["oklch(0.70 0.15 195)", "oklch(0.65 0.17 155)", "oklch(0.75 0.14 75)", "oklch(0.55 0.02 260)"];
    return {
      tooltip: { trigger: "item" as const },
      legend: { bottom: 0, textStyle: { color: isDark ? "#a3a3a3" : "#525252" } },
      series: [
        {
          type: "pie" as const,
          radius: "70%",
          data: items.map((l, i) => ({
            name: l.name,
            value: l.count,
            itemStyle: { color: palette[i % palette.length] },
          })),
          label: { color: isDark ? "#e5e5e5" : "#171717", fontSize: 11 },
        },
      ],
    };
  }, [languages, isDark]);

  const presenceGauge = useMemo(() => {
    return {
      series: [
        {
          type: "gauge" as const,
          startAngle: 180,
          endAngle: 0,
          min: 0,
          max: 10,
          pointer: { show: true, length: "60%", width: 4, itemStyle: { color: "oklch(0.70 0.15 195)" } },
          axisLine: {
            lineStyle: {
              width: 18,
              color: [
                [0.3, "oklch(0.60 0.22 25)"],
                [0.7, "oklch(0.75 0.14 75)"],
                [1, "oklch(0.65 0.17 155)"],
              ],
            },
          },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          detail: {
            valueAnimation: true,
            fontSize: 24,
            fontWeight: "bold",
            color: isDark ? "#fff" : "#171717",
            offsetCenter: [0, "20%"],
            formatter: "{value}",
          },
          data: [{ value: Number(presenceScore.toFixed(1)) }],
        },
      ],
    };
  }, [presenceScore, isDark]);

  // ─── actions ──────────────────────────────────────────────────────────

  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["analytics"] }),
      queryClient.invalidateQueries({ queryKey: ["mentions-stats"] }),
      queryClient.invalidateQueries({ queryKey: ["mentions"] }),
      refetchStats(),
    ]);
    toast.success(t("analysis.actions.refreshDone"));
  };

  const handleExportCsv = (tabKey: string) => {
    let rows: CsvRow[] = [];
    let filenamePrefix = "analysis";

    if (tabKey === "overview") {
      rows = [
        {
          metric: "Total Mentions",
          value: totalMentions,
          change_pct: stats?.mentions_change_percentage ?? "",
        },
        {
          metric: "Total Reach",
          value: totalReach,
          change_pct: stats?.reach_change_percentage ?? "",
        },
        {
          metric: "Positive %",
          value: positivePct,
          change_pct: stats?.positive_change_percentage ?? "",
        },
        {
          metric: "Neutral %",
          value: neutralPct,
          change_pct: "",
        },
        {
          metric: "Negative %",
          value: negativePct,
          change_pct: stats?.negative_change_percentage ?? "",
        },
        {
          metric: "Presence Score",
          value: presenceScore,
          change_pct: "",
        },
      ];
      filenamePrefix = "analysis_overview";
    } else if (tabKey === "sentiment") {
      rows = safeArray(timeSeries).map((p) => ({
        date: p.date,
        mentions: p.mentions,
        positive: p.positive ?? 0,
        neutral: p.neutral ?? 0,
        negative: p.negative ?? 0,
        reach: p.reach,
      }));
      filenamePrefix = "analysis_sentiment";
    } else if (tabKey === "keywords") {
      rows = safeArray(keywords).map((k: KeywordItem) => ({
        word: k.word,
        count: k.count,
        change_pct: k.change_pct,
        is_hashtag: k.is_hashtag,
      }));
      filenamePrefix = "analysis_keywords";
    } else if (tabKey === "sources") {
      rows = safeArray(srcBreakdown).map((s: SourceBreakdownItem) => ({
        name: s.name,
        type: s.type,
        mentions: s.mentions_count,
        reach: s.reach,
        share_pct: s.share_pct,
        avg_sentiment: s.avg_sentiment,
        country: s.country ?? "",
        language: s.language ?? "",
        last_published_at: s.last_published_at ?? "",
        base_url: s.base_url,
      }));
      filenamePrefix = "analysis_sources";
    } else if (tabKey === "geo-lang") {
      const geoRows = safeArray(geo).map((g: any) => ({
        country: g.country,
        country_code: g.country_code,
        mentions: g.mentions,
        reach: g.reach,
        positive: g.sentiment?.positive ?? 0,
        neutral: g.sentiment?.neutral ?? 0,
        negative: g.sentiment?.negative ?? 0,
      }));
      const langRows = safeArray(languages).map((l: LanguageItem) => ({
        country: `[lang] ${l.name}`,
        country_code: l.language,
        mentions: l.count,
        reach: 0,
        positive: 0,
        neutral: 0,
        negative: 0,
      }));
      rows = [...geoRows, ...langRows];
      filenamePrefix = "analysis_geo_languages";
    } else if (tabKey === "anomalies") {
      rows = safeArray(anomalies).map((e: AnomalyEvent) => ({
        date: e.date,
        type: e.type,
        mentions: e.mentions,
        z_score: e.z_score,
      }));
      filenamePrefix = "analysis_anomalies";
    }

    if (rows.length === 0) {
      toast.error(t("analysis.empty.noDataExport"));
      return;
    }

    downloadCsv(buildCsvFilename(filenamePrefix, projectId), rows);
    toast.success(t("analysis.actions.exportDone"));
  };

  const handleAnomalyClick = (e: AnomalyEvent) => {
    // Filter mentions by the anomaly day.
    const day = new Date(e.date);
    if (Number.isNaN(day.getTime())) return;
    const from = new Date(day);
    from.setHours(0, 0, 0, 0);
    const to = new Date(day);
    to.setHours(23, 59, 59, 999);
    setDateRange({ from, to, preset: "custom" });
    router.push(`/projects/${projectId}/mentions`);
  };

  // ─── render ───────────────────────────────────────────────────────────

  if (projLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <AnalysisContent
    projectId={projectId}
    handleRefresh={handleRefresh}
    handleExportCsv={handleExportCsv}
    handleAnomalyClick={handleAnomalyClick}
    handlePresetChange={handlePresetChange}
    activePreset={activePreset}
    dateLabel={dateLabel}
    statsLoading={statsLoading}
    isRefetching={isRefetching}
    totalMentions={totalMentions}
    totalReach={totalReach}
    positivePct={positivePct}
    presenceScore={presenceScore}
    stats={stats}
    sentimentDonut={sentimentDonut}
    sparklineOption={sparklineOption}
    dailyStackedArea={dailyStackedArea}
    sentimentByTopicBar={sentimentByTopicBar}
    sourcesBarOption={sourcesBarOption}
    sourceTypeDonut={sourceTypeDonut}
    languagesPie={languagesPie}
    presenceGauge={presenceGauge}
    timeSeries={timeSeries}
    topics={topics}
    srcBreakdown={srcBreakdown}
    geo={geo}
    languages={languages}
    keywords={keywords}
    links={links}
    anomalies={anomalies}
    topPositive={topPositive}
    topNegative={topNegative}
    isDark={isDark}
  />;
}

// Split into a separate component so we can use useState after data hooks
// (avoids "rendered fewer hooks than expected" when projLoading is true).

interface ContentProps {
  projectId: string;
  handleRefresh: () => Promise<void>;
  handleExportCsv: (tab: string) => void;
  handleAnomalyClick: (e: AnomalyEvent) => void;
  handlePresetChange: (preset: string) => void;
  activePreset: string;
  dateLabel: string;
  statsLoading: boolean;
  isRefetching: boolean;
  totalMentions: number;
  totalReach: number;
  positivePct: number;
  presenceScore: number;
  stats: any;
  sentimentDonut: any;
  sparklineOption: any;
  dailyStackedArea: any;
  sentimentByTopicBar: any;
  sourcesBarOption: any;
  sourceTypeDonut: any;
  languagesPie: any;
  presenceGauge: any;
  timeSeries: any;
  topics: any;
  srcBreakdown: SourceBreakdownItem[] | undefined;
  geo: any;
  languages: LanguageItem[] | undefined;
  keywords: KeywordItem[] | undefined;
  links: TopLinkItem[] | undefined;
  anomalies: AnomalyEvent[] | undefined;
  topPositive: any;
  topNegative: any;
  isDark: boolean;
}

function AnalysisContent(props: ContentProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<string>("overview");

  const {
    projectId,
    handleRefresh,
    handleExportCsv,
    handleAnomalyClick,
    handlePresetChange,
    activePreset,
    dateLabel,
    isRefetching,
    totalMentions,
    totalReach,
    positivePct,
    presenceScore,
    stats,
    sentimentDonut,
    sparklineOption,
    dailyStackedArea,
    sentimentByTopicBar,
    sourcesBarOption,
    sourceTypeDonut,
    languagesPie,
    presenceGauge,
    timeSeries,
    topics,
    srcBreakdown,
    geo,
    languages,
    keywords,
    links,
    anomalies,
    topPositive,
    topNegative,
  } = props;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-primary" />
            {t("analysis.title")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("analysis.subtitle")} · <span className="font-medium">{dateLabel}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DateRangeButtons value={activePreset} onChange={handlePresetChange} />

          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefetching}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isRefetching && "animate-spin")} />
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
              <DropdownMenuItem onClick={() => handleExportCsv("overview")}>
                {t("analysis.tabs.overview")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportCsv("sentiment")}>
                {t("analysis.tabs.sentiment")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportCsv("keywords")}>
                {t("analysis.tabs.keywords")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportCsv("sources")}>
                {t("analysis.tabs.sources")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportCsv("geo-lang")}>
                {t("analysis.tabs.geoLang")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportCsv("anomalies")}>
                {t("analysis.tabs.anomalies")}
              </DropdownMenuItem>
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

      {/* Tabs */}
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
            {safeArray(anomalies).length > 0 && (
              <Badge variant="secondary" className="ml-2 px-1.5 text-[10px]">
                {safeArray(anomalies).length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label={t("analysis.kpi.totalMentions")}
              value={fmtCompact(totalMentions)}
              change={stats?.mentions_change_percentage}
              icon={MessageCircle}
              delay={0}
            />
            <KpiCard
              label={t("analysis.kpi.totalReach")}
              value={fmtCompact(totalReach)}
              change={stats?.reach_change_percentage}
              icon={Eye}
              delay={0.05}
            />
            <KpiCard
              label={t("analysis.kpi.positive")}
              value={`${positivePct}%`}
              change={stats?.positive_change_percentage}
              icon={PieChart}
              delay={0.1}
            />
            <KpiCard
              label={t("analysis.kpi.presenceScore")}
              value={presenceScore.toFixed(1)}
              change={null}
              icon={Activity}
              delay={0.15}
            />
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">
                  {t("analysis.sections.sentimentDistribution")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {totalMentions === 0 ? (
                  <EmptyState message={t("analysis.empty.noMentions")} />
                ) : (
                  <ReactECharts option={sentimentDonut} style={{ height: 220 }} opts={{ renderer: "svg" }} />
                )}
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">
                  {t("analysis.sections.presenceScore")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ReactECharts option={presenceGauge} style={{ height: 200 }} opts={{ renderer: "svg" }} />
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center justify-between">
                  <span>{t("analysis.sections.dailyMentions")}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {safeArray(timeSeries).length} {t("analysis.kpi.days")}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {safeArray(timeSeries).length === 0 ? (
                  <EmptyState message={t("analysis.empty.noData")} />
                ) : (
                  <ReactECharts option={sparklineOption} style={{ height: 200 }} opts={{ renderer: "svg" }} />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="glass lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center justify-between">
                  <span>{t("analysis.sections.topSources")}</span>
                  <Link
                    href={`/projects/${projectId}/sources`}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    {t("analysis.actions.viewAll")} <ChevronRight className="h-3 w-3" />
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {safeArray(srcBreakdown).length === 0 ? (
                  <EmptyState message={t("analysis.empty.noData")} />
                ) : (
                  <ReactECharts option={sourcesBarOption} style={{ height: 280 }} opts={{ renderer: "svg" }} />
                )}
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <LanguagesIcon className="h-4 w-4" />
                  {t("analysis.sections.languages")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {safeArray(languages).length === 0 ? (
                  <EmptyState message={t("analysis.empty.noData")} />
                ) : (
                  <ReactECharts option={languagesPie} style={{ height: 280 }} opts={{ renderer: "svg" }} />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* SENTIMENT */}
        <TabsContent value="sentiment" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">
                  {t("analysis.sections.sentimentByTopic")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {safeArray(topics).length === 0 ? (
                  <EmptyState message={t("analysis.empty.noTopics")} />
                ) : (
                  <ReactECharts option={sentimentByTopicBar} style={{ height: 320 }} opts={{ renderer: "svg" }} />
                )}
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">
                  {t("analysis.sections.dailySentiment")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {safeArray(timeSeries).length === 0 ? (
                  <EmptyState message={t("analysis.empty.noData")} />
                ) : (
                  <ReactECharts option={dailyStackedArea} style={{ height: 320 }} opts={{ renderer: "svg" }} />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-green-500 flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4" />
                  {t("analysis.sections.topPositive")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {safeArray(topPositive?.items).length === 0 ? (
                  <EmptyState message={t("analysis.empty.noMentions")} />
                ) : (
                  safeArray(topPositive?.items).map((m: any) => (
                    <a
                      key={m.id}
                      href={m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start gap-2 justify-between">
                        <p className="text-sm font-medium line-clamp-2">{m.title}</p>
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      </div>
                      <div className="flex items-center justify-between mt-1.5 text-xs text-muted-foreground">
                        <span>{m.source?.name || "—"}</span>
                        <Badge variant="outline" className="border-green-500/30 text-green-500">
                          {Math.round((m.sentimentScore ?? 0) * 100)}
                        </Badge>
                      </div>
                    </a>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-red-500 flex items-center gap-2">
                  <ArrowDownRight className="h-4 w-4" />
                  {t("analysis.sections.topNegative")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {safeArray(topNegative?.items).length === 0 ? (
                  <EmptyState message={t("analysis.empty.noMentions")} />
                ) : (
                  safeArray(topNegative?.items).map((m: any) => (
                    <a
                      key={m.id}
                      href={m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start gap-2 justify-between">
                        <p className="text-sm font-medium line-clamp-2">{m.title}</p>
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      </div>
                      <div className="flex items-center justify-between mt-1.5 text-xs text-muted-foreground">
                        <span>{m.source?.name || "—"}</span>
                        <Badge variant="outline" className="border-red-500/30 text-red-500">
                          {Math.round((m.sentimentScore ?? 0) * 100)}
                        </Badge>
                      </div>
                    </a>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* KEYWORDS */}
        <TabsContent value="keywords" className="space-y-6">
          <Card className="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Hash className="h-4 w-4" />
                {t("analysis.sections.wordCloud")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {safeArray(keywords).length === 0 ? (
                <EmptyState message={t("analysis.empty.noKeywords")} />
              ) : (
                <div className="flex flex-wrap gap-2 justify-center py-6">
                  {safeArray(keywords).slice(0, 60).map((k: KeywordItem) => {
                    const max = Math.max(...safeArray(keywords).map((x) => x.count));
                    const min = Math.min(...safeArray(keywords).map((x) => x.count));
                    const range = max - min || 1;
                    const size = 12 + Math.round(((k.count - min) / range) * 22);
                    return (
                      <span
                        key={k.word}
                        className="px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors cursor-default"
                        style={{ fontSize: `${size}px` }}
                        title={`${k.word} · ${k.count} (${k.change_pct >= 0 ? "+" : ""}${k.change_pct}%)`}
                      >
                        {k.word}
                      </span>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  {t("analysis.sections.topHashtags")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {safeArray(keywords).filter((k) => k.is_hashtag).length === 0 ? (
                  <EmptyState message={t("analysis.empty.noHashtags")} />
                ) : (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {safeArray(keywords).filter((k) => k.is_hashtag).slice(0, 10).map((k: KeywordItem) => (
                      <div key={k.word} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div>
                          <p className="font-medium text-primary text-sm">{k.word}</p>
                          <p className="text-xs text-muted-foreground">
                            {k.count.toLocaleString()} {t("analysis.kpi.mentionsLower")}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={k.change_pct >= 0 ? "border-green-500/30 text-green-500" : "border-red-500/30 text-red-500"}
                        >
                          {k.change_pct >= 0 ? "+" : ""}
                          {k.change_pct}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  {t("analysis.sections.topLinks")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {safeArray(links).length === 0 ? (
                  <EmptyState message={t("analysis.empty.noLinks")} />
                ) : (
                  <div className="space-y-2">
                    {safeArray(links).slice(0, 10).map((l: TopLinkItem) => (
                      <a
                        key={l.url}
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{l.domain || l.url}</p>
                          <p className="text-xs text-muted-foreground truncate">{l.url}</p>
                        </div>
                        <Badge variant="secondary" className="ml-2 flex-shrink-0">
                          {l.count}×
                        </Badge>
                      </a>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* SOURCES */}
        <TabsContent value="sources" className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="glass lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">
                  {t("analysis.sections.activeSources")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {safeArray(srcBreakdown).length === 0 ? (
                  <EmptyState message={t("analysis.empty.noData")} />
                ) : (
                  <ReactECharts option={sourcesBarOption} style={{ height: 380 }} opts={{ renderer: "svg" }} />
                )}
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">
                  {t("analysis.sections.sourcesByType")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {safeArray(srcBreakdown).length === 0 ? (
                  <EmptyState message={t("analysis.empty.noData")} />
                ) : (
                  <ReactECharts option={sourceTypeDonut} style={{ height: 280 }} opts={{ renderer: "svg" }} />
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">
                {t("analysis.sections.sourcesTable")}
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {safeArray(srcBreakdown).length === 0 ? (
                <EmptyState message={t("analysis.empty.noData")} />
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground uppercase">
                      <th className="p-3">{t("analysis.kpi.source")}</th>
                      <th className="p-3">{t("analysis.kpi.type")}</th>
                      <th className="p-3 text-right">{t("analysis.kpi.mentions")}</th>
                      <th className="p-3 text-right">{t("analysis.kpi.reach")}</th>
                      <th className="p-3 text-right">{t("analysis.kpi.share")}</th>
                      <th className="p-3 text-right">{t("analysis.kpi.lastSeen")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {safeArray(srcBreakdown).slice(0, 25).map((s: SourceBreakdownItem) => (
                      <tr key={s.source_id} className="border-t border-border/30 hover:bg-muted/20">
                        <td className="p-3">
                          <div className="font-medium">{s.name}</div>
                          {s.base_url && (
                            <a
                              href={s.base_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-muted-foreground hover:text-primary truncate max-w-[260px] inline-block"
                            >
                              {s.base_url.replace(/^https?:\/\//, "")}
                            </a>
                          )}
                        </td>
                        <td className="p-3">
                          <Badge variant="secondary" className="text-[10px] uppercase">
                            {s.type}
                          </Badge>
                        </td>
                        <td className="p-3 text-right tabular-nums font-medium">
                          {s.mentions_count.toLocaleString()}
                        </td>
                        <td className="p-3 text-right tabular-nums text-muted-foreground">
                          {fmtCompact(s.reach)}
                        </td>
                        <td className="p-3 text-right tabular-nums">{s.share_pct}%</td>
                        <td className="p-3 text-right text-xs text-muted-foreground">
                          {s.last_published_at
                            ? new Date(s.last_published_at).toLocaleDateString()
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* GEO & LANGUAGES */}
        <TabsContent value="geo-lang" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    {t("analysis.sections.topCountries")}
                  </span>
                  <Link
                    href={`/projects/${projectId}/geo`}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    {t("analysis.actions.openGeo")} <ChevronRight className="h-3 w-3" />
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {safeArray(geo).length === 0 ? (
                  <EmptyState message={t("analysis.empty.noGeo")} />
                ) : (
                  <div className="space-y-2">
                    {safeArray(geo).slice(0, 8).map((g: any) => {
                      const max = Math.max(...safeArray(geo).map((x: any) => x.mentions || 0)) || 1;
                      const pct = Math.round(((g.mentions || 0) / max) * 100);
                      return (
                        <div key={g.country_code || g.country} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{g.country}</span>
                            <span className="text-muted-foreground tabular-nums">
                              {g.mentions} · {fmtCompact(g.reach)} {t("analysis.kpi.reachLower")}
                            </span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <LanguagesIcon className="h-4 w-4" />
                  {t("analysis.sections.languages")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {safeArray(languages).length === 0 ? (
                  <EmptyState message={t("analysis.empty.noData")} />
                ) : (
                  <>
                    <ReactECharts option={languagesPie} style={{ height: 240 }} opts={{ renderer: "svg" }} />
                    <div className="mt-4 space-y-1.5">
                      {safeArray(languages).map((l: LanguageItem) => (
                        <div key={l.language} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{l.name}</span>
                          <span className="font-medium tabular-nums">
                            {l.count.toLocaleString()} · {l.share_pct}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ANOMALIES */}
        <TabsContent value="anomalies" className="space-y-6">
          <Card className="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                {t("analysis.sections.anomaliesList")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {safeArray(anomalies).length === 0 ? (
                <EmptyState message={t("analysis.empty.noEvents")} />
              ) : (
                <div className="space-y-2">
                  {safeArray(anomalies).map((e: AnomalyEvent) => (
                    <button
                      key={e.date}
                      onClick={() => handleAnomalyClick(e)}
                      className="w-full flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center",
                            e.type === "spike"
                              ? "bg-green-500/10 text-green-500"
                              : "bg-red-500/10 text-red-500"
                          )}
                        >
                          {e.type === "spike" ? (
                            <TrendingUp className="h-5 w-5" />
                          ) : (
                            <TrendingDown className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">
                            {e.type === "spike"
                              ? t("analysis.anomalies.spike")
                              : t("analysis.anomalies.drop")}{" "}
                            ·{" "}
                            <span className="text-muted-foreground font-normal">
                              {new Date(e.date).toLocaleDateString()}
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {e.mentions} {t("analysis.kpi.mentionsLower")} · z = {e.z_score}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
