"use client";

import { use, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import ReactECharts from "echarts-for-react";
import { useTheme } from "next-themes";
import {
  GitCompare,
  Download,
  Plus,
  X,
  Loader2,
  RefreshCw,
  Trophy,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  useComparison,
  useCreateProject,
  useProject,
  useProjects,
  useTranslation,
} from "@/hooks";
import { apiClient, getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { downloadCsv, buildCsvFilename, type CsvRow } from "@/lib/csv";
import type {
  ComparisonResult,
  ComparisonSentimentBucket,
  ComparisonTimeSeries,
} from "@/types";

interface ComparisonPageProps {
  params: Promise<{ projectId: string }>;
}

const PROJECT_COLORS = [
  "oklch(0.70 0.15 195)", // brand cyan
  "oklch(0.65 0.17 155)", // green
  "oklch(0.75 0.14 75)", // gold
  "oklch(0.60 0.22 25)", // red
  "oklch(0.65 0.18 290)", // purple
  "oklch(0.70 0.18 350)", // pink
];

type ComparisonMetricKey =
  | "total_mentions"
  | "total_reach"
  | "positive_pct"
  | "neutral_pct"
  | "negative_pct"
  | "avg_influence"
  | "avg_sentiment"
  | "share_of_voice";

const DATE_PRESETS: { id: string; days?: number }[] = [
  { id: "all" },
  { id: "today", days: 1 },
  { id: "7d", days: 7 },
  { id: "30d", days: 30 },
  { id: "90d", days: 90 },
];

function formatPreset(t: ReturnType<typeof useTranslation>["t"], id: string): string {
  const map: Record<string, string> = {
    all: t("comparisonPage.dateRange.allTime"),
    today: t("comparisonPage.dateRange.today"),
    "7d": t("comparisonPage.dateRange.last7"),
    "30d": t("comparisonPage.dateRange.last30"),
    "90d": t("comparisonPage.dateRange.last90"),
  };
  return map[id] ?? id;
}

function fmtCompact(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

export default function ComparisonPage({ params }: ComparisonPageProps) {
  const { projectId } = use(params);
  const { theme } = useTheme();
  const { t } = useTranslation();
  const isDark = theme === "dark";

  const { isLoading: isLoadingProject } = useProject(projectId);
  const { data: allProjects, isLoading: isLoadingProjects } = useProjects();
  const createProjectMutation = useCreateProject();
  const {
    mutate: runComparison,
    data: comparisonData,
    isPending: isComparing,
    reset: resetComparison,
  } = useComparison(projectId);

  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [projectToAdd, setProjectToAdd] = useState<string>("");
  const [competitorTopic, setCompetitorTopic] = useState("");
  const [datePreset, setDatePreset] = useState<string>("all");

  const projectsList = useMemo(
    () =>
      (allProjects || []).map((project, i: number) => ({
        id: String(project.id),
        name: project.name || `Project ${i + 1}`,
        color: PROJECT_COLORS[i % PROJECT_COLORS.length],
      })),
    [allProjects]
  );

  const comparedProjectIds = useMemo(
    () => [projectId, ...selectedProjects.filter((id) => id !== projectId)],
    [projectId, selectedProjects]
  );
  const comparedKey = comparedProjectIds.join("|");

  // Compute date_from / date_to from preset.
  const dateRangeForApi = useMemo(() => {
    if (datePreset === "all") return {} as { date_from?: string; date_to?: string };
    const days = DATE_PRESETS.find((p) => p.id === datePreset)?.days ?? 7;
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days + 1);
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);
    const fmt = (d: Date) => d.toISOString().slice(0, 19);
    return { date_from: fmt(from), date_to: fmt(to) };
  }, [datePreset]);

  const triggerCompare = () => {
    if (comparedProjectIds.length < 1) return;
    runComparison({
      type: "projects",
      item_ids: comparedProjectIds,
      ...dateRangeForApi,
    });
  };

  // Re-run on selection / date-range change.
  useEffect(() => {
    triggerCompare();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comparedKey, dateRangeForApi.date_from, dateRangeForApi.date_to]);

  const comparison = (comparisonData ?? null) as ComparisonResult | null;
  const comparedProjects = useMemo(
    () =>
      comparedProjectIds.map((id, i) => {
        const fromList = projectsList.find((p) => p.id === id);
        const fromBackend = comparison?.items?.find((item) => item.id === id);
        return {
          id,
          name: fromBackend?.name || fromList?.name || `Project ${i + 1}`,
          color: PROJECT_COLORS[i % PROJECT_COLORS.length],
        };
      }),
    [comparedProjectIds, projectsList, comparison]
  );

  // ─── helpers to read metric value ─────────────────────────────────────

  const getMetricValue = (metric: ComparisonMetricKey, itemId: string): number => {
    const bucket = comparison?.metrics?.find((m) => m.name === metric);
    const v = bucket?.values?.find(
      (item: { itemId?: string; item_id?: string; value: number }) =>
        item.itemId === itemId || (item as { item_id?: string }).item_id === itemId
    );
    return Number(v?.value || 0);
  };

  const sentimentDist = (comparison?.sentiment_distribution ||
    []) as ComparisonSentimentBucket[];
  const tsPerItem = (comparison?.time_series || []) as ComparisonTimeSeries[];

  const winner = (metric: ComparisonMetricKey, higherIsBetter = true): string | null => {
    if (comparedProjects.length < 2) return null;
    const pairs = comparedProjects.map((p) => ({
      id: p.id,
      v: getMetricValue(metric, p.id),
    }));
    if (pairs.every((p) => p.v === 0)) return null;
    pairs.sort((a, b) => (higherIsBetter ? b.v - a.v : a.v - b.v));
    return pairs[0]?.id ?? null;
  };

  // ─── chart options ────────────────────────────────────────────────────

  const radarOption = useMemo(() => {
    const indicators = [
      { name: t("comparisonPage.metrics.totalMentions"), max: 100 },
      { name: t("comparisonPage.metrics.totalReach"), max: 100 },
      { name: t("comparisonPage.metrics.positive"), max: 100 },
      { name: t("comparisonPage.metrics.shareOfVoice"), max: 100 },
      { name: t("comparisonPage.metrics.avgInfluence"), max: 100 },
    ];

    // Normalise each metric on a 0–100 scale relative to the max across compared items.
    const normalise = (key: ComparisonMetricKey) => {
      const vals = comparedProjects.map((p) => getMetricValue(key, p.id));
      const max = Math.max(...vals, 1);
      return comparedProjects.map((p) => Math.round((getMetricValue(key, p.id) / max) * 100));
    };

    const mentions = normalise("total_mentions");
    const reach = normalise("total_reach");
    const sov = normalise("share_of_voice");
    const inf = normalise("avg_influence");
    // positive_pct is already a percentage
    const positivePct = comparedProjects.map((p) =>
      Math.round(getMetricValue("positive_pct", p.id))
    );

    return {
      tooltip: {},
      legend: {
        bottom: 0,
        textStyle: { color: isDark ? "#a3a3a3" : "#737373" },
        data: comparedProjects.map((p) => p.name),
      },
      radar: {
        indicator: indicators,
        axisName: { color: isDark ? "#a3a3a3" : "#525252", fontSize: 11 },
        splitArea: {
          areaStyle: {
            color: isDark
              ? ["rgba(255,255,255,0.02)", "rgba(255,255,255,0.04)"]
              : ["rgba(0,0,0,0.02)", "rgba(0,0,0,0.04)"],
          },
        },
        splitLine: {
          lineStyle: { color: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" },
        },
      },
      series: [
        {
          type: "radar" as const,
          data: comparedProjects.map((p, i) => ({
            value: [mentions[i], reach[i], positivePct[i], sov[i], inf[i]],
            name: p.name,
            itemStyle: { color: p.color },
            lineStyle: { color: p.color, width: 2 },
            areaStyle: { color: p.color, opacity: 0.2 },
          })),
        },
      ],
    };
  }, [comparedProjects, isDark, t, comparison]); // eslint-disable-line react-hooks/exhaustive-deps

  const barOption = useMemo(() => {
    return {
      tooltip: { trigger: "axis" as const, axisPointer: { type: "shadow" as const } },
      legend: { bottom: 0, textStyle: { color: isDark ? "#a3a3a3" : "#737373" } },
      grid: { left: "3%", right: "4%", bottom: "12%", top: "5%", containLabel: true },
      xAxis: {
        type: "category" as const,
        data: comparedProjects.map((p) => p.name),
        axisLabel: { color: isDark ? "#a3a3a3" : "#525252", fontSize: 11 },
      },
      yAxis: {
        type: "value" as const,
        axisLabel: { color: isDark ? "#737373" : "#a3a3a3" },
      },
      series: [
        {
          name: t("comparisonPage.metrics.totalMentions"),
          type: "bar" as const,
          itemStyle: { color: "oklch(0.70 0.15 195)", borderRadius: [4, 4, 0, 0] },
          data: comparedProjects.map((p) => getMetricValue("total_mentions", p.id)),
        },
      ],
    };
  }, [comparedProjects, isDark, t, comparison]); // eslint-disable-line react-hooks/exhaustive-deps

  const reachBarOption = useMemo(() => {
    return {
      tooltip: { trigger: "axis" as const, axisPointer: { type: "shadow" as const } },
      legend: { bottom: 0, textStyle: { color: isDark ? "#a3a3a3" : "#737373" } },
      grid: { left: "3%", right: "4%", bottom: "12%", top: "5%", containLabel: true },
      xAxis: {
        type: "category" as const,
        data: comparedProjects.map((p) => p.name),
        axisLabel: { color: isDark ? "#a3a3a3" : "#525252", fontSize: 11 },
      },
      yAxis: { type: "value" as const, axisLabel: { color: isDark ? "#737373" : "#a3a3a3" } },
      series: [
        {
          name: t("comparisonPage.metrics.totalReach"),
          type: "bar" as const,
          itemStyle: { color: "oklch(0.65 0.17 155)", borderRadius: [4, 4, 0, 0] },
          data: comparedProjects.map((p) => getMetricValue("total_reach", p.id)),
        },
      ],
    };
  }, [comparedProjects, isDark, t, comparison]); // eslint-disable-line react-hooks/exhaustive-deps

  const sentimentStackedBar = useMemo(() => {
    return {
      tooltip: { trigger: "axis" as const, axisPointer: { type: "shadow" as const } },
      legend: { bottom: 0, textStyle: { color: isDark ? "#a3a3a3" : "#737373" } },
      grid: { left: "3%", right: "4%", bottom: "12%", top: "5%", containLabel: true },
      xAxis: {
        type: "category" as const,
        data: comparedProjects.map((p) => p.name),
        axisLabel: { color: isDark ? "#a3a3a3" : "#525252", fontSize: 11 },
      },
      yAxis: { type: "value" as const, axisLabel: { color: isDark ? "#737373" : "#a3a3a3" } },
      series: [
        {
          name: t("mentions.sentiments.positive"),
          type: "bar" as const,
          stack: "s",
          itemStyle: { color: "oklch(0.65 0.17 155)" },
          data: comparedProjects.map((p) => {
            const b = sentimentDist.find((x) => x.itemId === p.id);
            return b?.positive ?? 0;
          }),
        },
        {
          name: t("mentions.sentiments.neutral"),
          type: "bar" as const,
          stack: "s",
          itemStyle: { color: "oklch(0.55 0.02 260)" },
          data: comparedProjects.map((p) => {
            const b = sentimentDist.find((x) => x.itemId === p.id);
            return b?.neutral ?? 0;
          }),
        },
        {
          name: t("mentions.sentiments.negative"),
          type: "bar" as const,
          stack: "s",
          itemStyle: { color: "oklch(0.60 0.22 25)" },
          data: comparedProjects.map((p) => {
            const b = sentimentDist.find((x) => x.itemId === p.id);
            return b?.negative ?? 0;
          }),
        },
      ],
    };
  }, [comparedProjects, sentimentDist, isDark, t]);

  const shareOfVoiceDonut = useMemo(() => {
    return {
      tooltip: { trigger: "item" as const },
      legend: { bottom: 0, textStyle: { color: isDark ? "#a3a3a3" : "#737373" } },
      series: [
        {
          type: "pie" as const,
          radius: ["55%", "78%"],
          itemStyle: { borderRadius: 6, borderWidth: 2, borderColor: isDark ? "#171717" : "#fff" },
          label: { show: false },
          data: comparedProjects.map((p) => ({
            name: p.name,
            value: getMetricValue("share_of_voice", p.id),
            itemStyle: { color: p.color },
          })),
        },
      ],
    };
  }, [comparedProjects, isDark, comparison]); // eslint-disable-line react-hooks/exhaustive-deps

  // Build a unified date axis from the union of all per-item time-series dates.
  const timeSeriesLine = useMemo(() => {
    const dateSet = new Set<string>();
    tsPerItem.forEach((it) =>
      (it.series || []).forEach((p) => dateSet.add(p.date))
    );
    const dates = Array.from(dateSet).sort();

    return {
      tooltip: { trigger: "axis" as const },
      legend: {
        bottom: 0,
        textStyle: { color: isDark ? "#a3a3a3" : "#737373" },
        data: comparedProjects.map((p) => p.name),
      },
      grid: { left: "3%", right: "4%", bottom: "15%", top: "5%", containLabel: true },
      xAxis: {
        type: "category" as const,
        boundaryGap: false,
        data: dates,
        axisLabel: { color: isDark ? "#737373" : "#a3a3a3", fontSize: 10 },
      },
      yAxis: {
        type: "value" as const,
        axisLabel: { color: isDark ? "#737373" : "#a3a3a3" },
        splitLine: {
          lineStyle: { color: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" },
        },
      },
      series: comparedProjects.map((p) => {
        const own = tsPerItem.find((x) => x.itemId === p.id);
        const map = new Map<string, number>();
        (own?.series || []).forEach((pt) => map.set(pt.date, pt.mentions));
        return {
          name: p.name,
          type: "line" as const,
          smooth: true,
          symbol: "circle",
          symbolSize: 6,
          data: dates.map((d) => map.get(d) ?? 0),
          itemStyle: { color: p.color },
          lineStyle: { color: p.color, width: 2 },
          areaStyle: { color: p.color, opacity: 0.08 },
        };
      }),
    };
  }, [comparedProjects, tsPerItem, isDark]);

  // ─── actions ──────────────────────────────────────────────────────────

  const isLoading = isLoadingProject || isLoadingProjects;

  const addExistingProject = () => {
    if (!projectToAdd || projectToAdd === projectId) return;
    if (selectedProjects.includes(projectToAdd)) return;
    setSelectedProjects((prev) => [...prev, projectToAdd]);
    setProjectToAdd("");
  };

  const removeCompared = (id: string) => {
    if (id === projectId) return;
    setSelectedProjects((prev) => prev.filter((x) => x !== id));
  };

  const addCompetitorTopic = () => {
    const topic = competitorTopic.trim();
    if (!topic) return;
    const tokens = topic.split(/[\s,;|]+/).filter((x) => x.length >= 3);
    createProjectMutation.mutate(
      {
        name: topic,
        settings: {
          keywords: Array.from(new Set([topic, ...tokens])),
          excludedKeywords: [],
          topicQuery: topic,
          activeSources: ["news", "blogs", "websites"],
          excludedSites: [],
          notifications: { email: true },
        },
      },
      {
        onSuccess: async (project) => {
          setSelectedProjects((prev) => [...prev, project.id]);
          setCompetitorTopic("");
          toast.success(t("comparisonPage.toasts.added"));
          try {
            await apiClient.post(`/projects/${project.id}/ingestion/run`, {
              limit_sources: 3,
              per_source_limit: 15,
            });
          } catch {
            // optional background start
          }
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      }
    );
  };

  const handleRefresh = () => {
    resetComparison();
    triggerCompare();
    toast.success(t("comparisonPage.toasts.refreshed"));
  };

  const handleExportCsv = () => {
    if (comparedProjects.length === 0) {
      toast.error(t("comparisonPage.toasts.noDataExport"));
      return;
    }
    const metricsRows: CsvRow[] = [
      "total_mentions",
      "total_reach",
      "positive_pct",
      "neutral_pct",
      "negative_pct",
      "avg_influence",
      "avg_sentiment",
      "share_of_voice",
    ].map((key) => {
      const row: CsvRow = { metric: key };
      comparedProjects.forEach((p) => {
        row[p.name] = getMetricValue(key as ComparisonMetricKey, p.id);
      });
      return row;
    });

    if (metricsRows.length === 0) {
      toast.error(t("comparisonPage.toasts.noDataExport"));
      return;
    }
    downloadCsv(buildCsvFilename("comparison", projectId), metricsRows);
    toast.success(t("comparisonPage.toasts.exported"));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ─── render ───────────────────────────────────────────────────────────

  const winnerMentions = winner("total_mentions");
  const winnerReach = winner("total_reach");
  const winnerPositive = winner("positive_pct");
  const winnerSov = winner("share_of_voice");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <GitCompare className="h-7 w-7 text-primary" />
            {t("comparisonPage.title")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("comparisonPage.subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-border p-1 bg-muted/30">
            {DATE_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => setDatePreset(p.id)}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                  datePreset === p.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {formatPreset(t, p.id)}
              </button>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isComparing}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isComparing && "animate-spin")} />
            {t("comparisonPage.actions.refresh")}
          </Button>

          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            <Download className="h-4 w-4 mr-2" />
            {t("comparisonPage.exportCsv")}
          </Button>
        </div>
      </div>

      {/* Selector */}
      <Card className="glass">
        <CardContent className="p-4 space-y-4">
          <div className="grid lg:grid-cols-2 gap-3">
            <div className="flex gap-2">
              <Select value={projectToAdd} onValueChange={setProjectToAdd}>
                <SelectTrigger>
                  <SelectValue placeholder={t("comparisonPage.addExistingPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {projectsList
                    .filter((p) => p.id !== projectId && !selectedProjects.includes(p.id))
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={addExistingProject}>
                <Plus className="h-4 w-4 mr-1" />
                {t("common.add")}
              </Button>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder={t("comparisonPage.newCompetitorPlaceholder")}
                value={competitorTopic}
                onChange={(e) => setCompetitorTopic(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addCompetitorTopic();
                }}
              />
              <Button onClick={addCompetitorTopic} disabled={createProjectMutation.isPending}>
                {createProjectMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-1" />
                )}
                {t("common.create")}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Label className="text-sm">{t("comparisonPage.comparingLabel")}</Label>
            {comparedProjects.map((p) => (
              <Badge key={p.id} variant="outline" className="pl-2 pr-1 py-1">
                <span
                  className="w-2 h-2 rounded-full mr-2"
                  style={{ backgroundColor: p.color }}
                />
                {p.name}
                {p.id !== projectId && (
                  <button
                    className="ml-1 p-0.5 hover:bg-muted rounded"
                    onClick={() => removeCompared(p.id)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            ))}
            {comparedProjects.length < 2 && (
              <span className="text-xs text-muted-foreground ml-2">
                {t("comparisonPage.helpAddOne")}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Empty state if only main project */}
      {comparedProjects.length < 2 ? (
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

          {/* OVERVIEW */}
          <TabsContent value="overview" className="space-y-6">
            {/* Metrics Table */}
            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">
                  {t("comparisonPage.metricsTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground uppercase border-b border-border/50">
                        <th className="p-3">{t("comparisonPage.metricColumn")}</th>
                        {comparedProjects.map((p) => (
                          <th key={p.id} className="p-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: p.color }}
                              />
                              {p.name}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {([
                        { label: t("comparisonPage.metrics.totalMentions"), key: "total_mentions" as ComparisonMetricKey, fmt: (v: number) => v.toLocaleString(), winnerId: winnerMentions },
                        { label: t("comparisonPage.metrics.totalReach"), key: "total_reach" as ComparisonMetricKey, fmt: (v: number) => fmtCompact(v), winnerId: winnerReach },
                        { label: t("comparisonPage.metrics.shareOfVoice"), key: "share_of_voice" as ComparisonMetricKey, fmt: (v: number) => `${v}%`, winnerId: winnerSov },
                        { label: t("comparisonPage.metrics.positive"), key: "positive_pct" as ComparisonMetricKey, fmt: (v: number) => `${v}%`, winnerId: winnerPositive },
                        { label: t("comparisonPage.metrics.neutral"), key: "neutral_pct" as ComparisonMetricKey, fmt: (v: number) => `${v}%`, winnerId: null },
                        { label: t("comparisonPage.metrics.negative"), key: "negative_pct" as ComparisonMetricKey, fmt: (v: number) => `${v}%`, winnerId: winner("negative_pct", false) },
                        { label: t("comparisonPage.metrics.avgInfluence"), key: "avg_influence" as ComparisonMetricKey, fmt: (v: number) => v.toFixed(2), winnerId: winner("avg_influence") },
                        { label: t("comparisonPage.metrics.avgSentiment"), key: "avg_sentiment" as ComparisonMetricKey, fmt: (v: number) => v.toFixed(2), winnerId: winner("avg_sentiment") },
                      ]).map((row) => (
                        <tr key={row.key} className="border-b border-border/30 hover:bg-muted/20">
                          <td className="p-3 font-medium">{row.label}</td>
                          {comparedProjects.map((p) => {
                            const value = getMetricValue(row.key, p.id);
                            const isWinner = row.winnerId === p.id && value > 0;
                            return (
                              <td key={p.id} className="p-3 text-center tabular-nums">
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-1.5",
                                    isWinner && "text-green-500 font-bold"
                                  )}
                                >
                                  {isWinner && <Trophy className="h-3.5 w-3.5" />}
                                  {row.fmt(value)}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Radar + Share of Voice donut */}
            <div className="grid lg:grid-cols-2 gap-6">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="glass">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium">
                      {t("comparisonPage.sections.radar")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ReactECharts option={radarOption} style={{ height: 360 }} opts={{ renderer: "svg" }} />
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="glass">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium">
                      {t("comparisonPage.sections.shareOfVoice")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ReactECharts option={shareOfVoiceDonut} style={{ height: 360 }} opts={{ renderer: "svg" }} />
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </TabsContent>

          {/* SENTIMENT */}
          <TabsContent value="sentiment" className="space-y-6">
            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">
                  {t("comparisonPage.sections.sentimentBreakdown")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ReactECharts
                  option={sentimentStackedBar}
                  style={{ height: 380 }}
                  opts={{ renderer: "svg" }}
                />
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {comparedProjects.map((p) => {
                const b = sentimentDist.find((x) => x.itemId === p.id);
                const total = (b?.positive || 0) + (b?.neutral || 0) + (b?.negative || 0);
                const pos = b?.positive || 0;
                const neg = b?.negative || 0;
                const neu = b?.neutral || 0;
                return (
                  <Card key={p.id} className="glass">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                        {p.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-green-500">{t("mentions.sentiments.positive")}</span>
                        <span className="tabular-nums">{pos} · {total ? Math.round((pos / total) * 100) : 0}%</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{t("mentions.sentiments.neutral")}</span>
                        <span className="tabular-nums">{neu} · {total ? Math.round((neu / total) * 100) : 0}%</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-red-500">{t("mentions.sentiments.negative")}</span>
                        <span className="tabular-nums">{neg} · {total ? Math.round((neg / total) * 100) : 0}%</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* TIME-SERIES */}
          <TabsContent value="time-series" className="space-y-6">
            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">
                  {t("comparisonPage.sections.dailyMentions")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tsPerItem.every((it) => (it.series || []).length === 0) ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    {t("comparisonPage.empty.noTimeSeries")}
                  </div>
                ) : (
                  <ReactECharts
                    option={timeSeriesLine}
                    style={{ height: 420 }}
                    opts={{ renderer: "svg" }}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* REACH */}
          <TabsContent value="reach" className="space-y-6">
            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">
                  {t("comparisonPage.sections.reach")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ReactECharts option={reachBarOption} style={{ height: 380 }} opts={{ renderer: "svg" }} />
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">
                  {t("comparisonPage.sections.totalMentions")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ReactECharts option={barOption} style={{ height: 380 }} opts={{ renderer: "svg" }} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
