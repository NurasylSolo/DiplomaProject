"use client";

import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import ReactECharts from "echarts-for-react";
import { useTheme } from "next-themes";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  Send,
  Share2,
  Clock,
  UserPlus,
  MoreHorizontal,
  ExternalLink,
  MessageSquare,
  FileText,
  Twitter,
  ChevronRight,
  BarChart3,
  Users,
  Globe,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  useDismissInsight,
  useGenerateInsights,
  useInsights,
  useMentionsStats,
  useSources,
  useTimeSeries,
  useTranslation,
} from "@/hooks";
import { getErrorMessage } from "@/lib/api";
import type { InsightDto } from "@/lib/api/services/insights";

interface InsightsPageProps {
  params: Promise<{ projectId: string }>;
}

// Map API insight type → UI bucket (alert / trend / recommendation / opportunity)
function normalizeType(t: string): "alert" | "trend" | "recommendation" | "opportunity" {
  const v = (t || "").toLowerCase();
  if (v === "alert" || v === "anomaly") return "alert";
  if (v === "trend" || v === "trend_up" || v === "trend_down") return "trend";
  if (v === "recommendation") return "recommendation";
  return "opportunity";
}

const severityColors: Record<string, string> = {
  high: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  low: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
};

const typeIcons = {
  alert: AlertTriangle,
  trend: TrendingUp,
  recommendation: Lightbulb,
  opportunity: Sparkles,
} as const;

function fmtCompact(n: number): string {
  if (!Number.isFinite(n)) return "0";
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

export default function InsightsPage({ params }: InsightsPageProps) {
  const { projectId } = use(params);
  const router = useRouter();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const { data: apiInsights, isLoading: insightsLoading } = useInsights(projectId);
  const { data: stats } = useMentionsStats(projectId);
  const { data: sources } = useSources(projectId);
  const { data: timeSeries } = useTimeSeries(projectId, 30);

  const generateMutation = useGenerateInsights(projectId);
  const dismissMutation = useDismissInsight(projectId);

  const [activeTab, setActiveTab] = useState<string>("all");
  // Locally hidden ids for instant UI on Dismiss (in addition to server invalidation)
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  const insights = useMemo(() => {
    return ((apiInsights || []) as InsightDto[])
      .filter((i) => !hiddenIds.has(i.id))
      .map((i) => ({
        id: i.id,
        type: normalizeType(i.type),
        rawType: i.type,
        severity: (i.severity || "medium") as "high" | "medium" | "low",
        title: i.title,
        description: i.description,
        category: (i.category || "general").toLowerCase(),
        metricChange: i.metric_change,
        relatedMentionIds: i.related_mention_ids || [],
        createdAt: i.created_at,
      }));
  }, [apiInsights, hiddenIds]);

  const filteredInsights = useMemo(() => {
    if (activeTab === "all") return insights;
    if (activeTab === "alerts") return insights.filter((i) => i.type === "alert");
    if (activeTab === "trends") return insights.filter((i) => i.type === "trend");
    if (activeTab === "recommendations") return insights.filter((i) => i.type === "recommendation");
    if (activeTab === "opportunities") return insights.filter((i) => i.type === "opportunity");
    return insights;
  }, [insights, activeTab]);

  // Summary cards from real stats
  const totalMentions = stats?.total_mentions ?? 0;
  const totalReach = stats?.total_reach ?? 0;
  const positivePct = stats?.positive_percentage ?? 0;
  const negativePct = stats?.negative_percentage ?? 0;
  const summaryCards = [
    { label: t("insights.cards.totalMentions"), value: fmtCompact(totalMentions), positive: true, change: stats?.mentions_change_percentage },
    { label: t("insights.cards.totalReach"), value: fmtCompact(totalReach), positive: true, change: null },
    { label: t("insights.cards.positive"), value: `${positivePct.toFixed(0)}%`, positive: positivePct >= 50, change: null },
    { label: t("insights.cards.negative"), value: `${negativePct.toFixed(0)}%`, positive: negativePct < 30, change: null },
  ];

  // Suggested channels from real top sources
  const suggestedChannels = useMemo(() => {
    const list = (sources || []) as Array<{ name?: string; type?: string; mentionCount?: number; mention_count?: number }>;
    return list
      .map((s) => ({
        name: String(s.name || "Unknown"),
        mentions: s.mentionCount || s.mention_count || 0,
      }))
      .filter((s) => s.mentions > 0)
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 4);
  }, [sources]);

  // Insight Trends chart (real time-series of mentions per day)
  const trendChartOption = useMemo(() => {
    const data: Array<{ date: string; mentions: number }> = Array.isArray(timeSeries)
      ? timeSeries.map((d: { date: string; mentions?: number }) => ({ date: d.date, mentions: d.mentions || 0 }))
      : [];
    return {
      tooltip: { trigger: "axis", backgroundColor: isDark ? "rgba(23,23,23,0.95)" : "rgba(255,255,255,0.95)" },
      grid: { left: "3%", right: "4%", bottom: "3%", top: "8%", containLabel: true },
      xAxis: {
        type: "category",
        data: data.map((d) => new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })),
        axisLabel: { color: isDark ? "#737373" : "#a3a3a3", fontSize: 10, interval: Math.max(0, Math.floor(data.length / 8)) },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: isDark ? "#737373" : "#a3a3a3", fontSize: 10 },
        splitLine: { lineStyle: { color: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" } },
      },
      series: [
        {
          type: "bar",
          data: data.map((d) => d.mentions),
          itemStyle: {
            color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [
              { offset: 0, color: "oklch(0.70 0.15 195)" },
              { offset: 1, color: "oklch(0.70 0.15 195 / 0.4)" },
            ] },
            borderRadius: [4, 4, 0, 0],
          },
        },
      ],
    };
  }, [timeSeries, isDark]);

  const handleGenerate = () => {
    generateMutation.mutate(undefined, {
      onSuccess: () => toast.success(t("insights.generated")),
      onError: (err) => toast.error(`${t("insights.generateFailed")}: ${getErrorMessage(err)}`),
    });
  };

  const handleDismiss = (id: string) => {
    setHiddenIds((prev) => new Set(prev).add(id));
    dismissMutation.mutate(id, {
      onSuccess: () => toast.success(t("insights.actions.dismissed")),
      onError: (err) => {
        // restore on failure
        setHiddenIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        toast.error(getErrorMessage(err));
      },
    });
  };

  const handleTakeAction = (insight: { title: string }) => {
    const prefix = t("insights.prompts.takeActionPrefix");
    const prompt = `${prefix}${insight.title}`;
    router.push(`/projects/${projectId}/assistant?prefill=${encodeURIComponent(prompt)}`);
  };

  const handleShareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success(t("insights.linkCopied"));
    } catch {
      toast.error(t("common.error"));
    }
  };

  const handleSendToEmail = () => router.push(`/projects/${projectId}/reports/email`);
  const handleSchedule = () => router.push(`/projects/${projectId}/reports/email`);
  const handleAddRecipients = () => router.push(`/projects/${projectId}/reports/email`);

  // Recommended sidebar actions — real navigation
  const recommendedActions = [
    {
      icon: MessageSquare,
      label: t("insights.recommendedActions.draftPR.label"),
      description: t("insights.recommendedActions.draftPR.description"),
      onClick: () => router.push(`/projects/${projectId}/assistant?prefill=${encodeURIComponent(t("insights.prompts.draftPR"))}`),
    },
    {
      icon: Twitter,
      label: t("insights.recommendedActions.createTweet.label"),
      description: t("insights.recommendedActions.createTweet.description"),
      onClick: () => router.push(`/projects/${projectId}/assistant?prefill=${encodeURIComponent(t("insights.prompts.createTweet"))}`),
    },
    {
      icon: FileText,
      label: t("insights.recommendedActions.generateReport.label"),
      description: t("insights.recommendedActions.generateReport.description"),
      onClick: () => router.push(`/projects/${projectId}/reports/pdf`),
    },
    {
      icon: Users,
      label: t("insights.recommendedActions.contactInfluencers.label"),
      description: t("insights.recommendedActions.contactInfluencers.description"),
      onClick: () => router.push(`/projects/${projectId}/influencers`),
    },
  ];

  if (insightsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-primary" />
            {t("insights.title")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("insights.subtitle")}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={handleGenerate} disabled={generateMutation.isPending} className="glow-sm">
            {generateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("insights.generating")}
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                {t("insights.generateNew")}
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={handleSendToEmail}>
            <Send className="h-4 w-4 mr-2" />
            {t("insights.sendToEmail")}
          </Button>
          <Button variant="outline" size="sm" onClick={handleShareLink}>
            <Share2 className="h-4 w-4 mr-2" />
            {t("insights.shareLink")}
          </Button>
          <Button variant="outline" size="sm" onClick={handleSchedule}>
            <Clock className="h-4 w-4 mr-2" />
            {t("insights.schedule")}
          </Button>
          <Button variant="outline" size="sm" onClick={handleAddRecipients}>
            <UserPlus className="h-4 w-4 mr-2" />
            {t("insights.addRecipients")}
          </Button>
        </div>
      </div>

      {/* Summary Cards — real data from /mentions/stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, index) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="glass">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {card.label}
                </p>
                <div className="flex items-end justify-between mt-2">
                  <p className="text-2xl font-bold">{card.value}</p>
                  {card.change !== null && card.change !== undefined && (
                    <span className={cn(
                      "text-sm font-medium flex items-center gap-1",
                      card.positive ? "text-green-500" : "text-red-500"
                    )}>
                      {card.positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {`${card.change > 0 ? "+" : ""}${card.change}%`}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Insights Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">{t("insights.topInsights")}</h2>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
              <TabsList className="h-8">
                <TabsTrigger value="all" className="text-xs px-3">{t("insights.filters.all")}</TabsTrigger>
                <TabsTrigger value="alerts" className="text-xs px-3">{t("insights.filters.alerts")}</TabsTrigger>
                <TabsTrigger value="trends" className="text-xs px-3">{t("insights.filters.trends")}</TabsTrigger>
                <TabsTrigger value="recommendations" className="text-xs px-3">{t("insights.filters.recommendations")}</TabsTrigger>
                <TabsTrigger value="opportunities" className="text-xs px-3">{t("insights.filters.opportunities")}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {filteredInsights.length === 0 ? (
            <Card className="glass">
              <CardContent className="p-8 text-center space-y-3">
                <Sparkles className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                <p className="font-medium">{t("insights.noInsights")}</p>
                <p className="text-sm text-muted-foreground">{t("insights.noInsightsHint")}</p>
                <Button onClick={handleGenerate} disabled={generateMutation.isPending} className="mt-2">
                  {generateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  {t("insights.generateNew")}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {filteredInsights.map((insight, index) => {
                  const TypeIcon = typeIcons[insight.type];
                  const categoryLabel = t(`insights.categories.${insight.category}`, { defaultValue: insight.category });
                  return (
                    <motion.div
                      key={insight.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="glass hover:bg-card/80 transition-colors group">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className={cn(
                              "p-2 rounded-lg shrink-0",
                              severityColors[insight.severity] || severityColors.medium
                            )}>
                              <TypeIcon className="h-5 w-5" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
                                    {insight.title}
                                  </h3>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {insight.description}
                                  </p>
                                </div>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleTakeAction(insight)}>
                                      <ExternalLink className="h-4 w-4 mr-2" />
                                      {t("insights.actions.viewDetails")}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleShareLink}>
                                      <Send className="h-4 w-4 mr-2" />
                                      {t("insights.actions.share")}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDismiss(insight.id)} className="text-destructive">
                                      <span className="mr-2">×</span>
                                      {t("insights.actions.dismiss")}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>

                              <div className="flex items-center gap-3 mt-3 flex-wrap">
                                {insight.metricChange !== null && insight.metricChange !== undefined && (
                                  <span className="text-lg font-bold text-primary">
                                    {`${insight.metricChange > 0 ? "+" : ""}${insight.metricChange}%`}
                                  </span>
                                )}
                                <Badge variant="outline" className="text-xs capitalize">
                                  {categoryLabel}
                                </Badge>
                                <Badge variant="outline" className={cn(
                                  "text-xs",
                                  insight.severity === "high" ? "border-red-500/30 text-red-500" :
                                  insight.severity === "medium" ? "border-amber-500/30 text-amber-500" :
                                  "border-green-500/30 text-green-500"
                                )}>
                                  {t(`insights.severity.${insight.severity}`)}
                                </Badge>
                                {insight.createdAt && (
                                  <span className="text-xs text-muted-foreground ml-auto">
                                    {new Date(insight.createdAt).toLocaleDateString()}
                                  </span>
                                )}
                              </div>

                              <div className="flex gap-2 mt-3">
                                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleTakeAction(insight)}>
                                  {t("insights.actions.takeAction")}
                                  <ChevronRight className="h-3 w-3 ml-1" />
                                </Button>
                                <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => handleDismiss(insight.id)} disabled={dismissMutation.isPending}>
                                  {t("insights.actions.dismiss")}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Recommended Actions — real navigation */}
          <Card className="glass">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                {t("insights.sidebar.recommendedActions")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recommendedActions.map((action) => (
                <button
                  key={action.label}
                  onClick={action.onClick}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                    <action.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{action.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{action.description}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Suggested Channels — real top sources */}
          <Card className="glass">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                {t("insights.sidebar.suggestedChannels")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {suggestedChannels.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t("insights.sidebar.noChannels")}
                </p>
              ) : (
                <div className="space-y-3">
                  {suggestedChannels.map((channel, idx) => {
                    const potentialKey = idx === 0 ? "high" : idx === 1 ? "high" : idx === 2 ? "medium" : "low";
                    return (
                      <div
                        key={channel.name}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{channel.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {channel.mentions} {t("mentions.title").toLowerCase()}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs ml-2",
                            potentialKey === "high"
                              ? "border-green-500/30 text-green-600 dark:text-green-400"
                              : potentialKey === "medium"
                                ? "border-amber-500/30 text-amber-600 dark:text-amber-400"
                                : "border-muted-foreground/30 text-muted-foreground"
                          )}
                        >
                          {t(`insights.channelPotential.${potentialKey}`)}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Insight Trends — real time-series */}
          <Card className="glass">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                {t("insights.sidebar.insightTrends")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReactECharts option={trendChartOption} style={{ height: "180px" }} opts={{ renderer: "svg" }} />
              <p className="text-xs text-muted-foreground text-center mt-2">
                {t("insights.sidebar.last30Days")}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
