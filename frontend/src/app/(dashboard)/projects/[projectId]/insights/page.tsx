"use client";

import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  FileText,
  Loader2,
  MessageSquare,
  Twitter,
  Users,
} from "lucide-react";
import { toast } from "sonner";
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
import { fmtCompact } from "@/features/_shared";
import {
  InsightsHeader,
  InsightsList,
  InsightsSidebar,
  SummaryCards,
  buildInsightsTrendChart,
  normalizeInsights,
  type InsightItem,
  type RecommendedAction,
  type SuggestedChannel,
} from "@/features/insights";
import type { InsightDto } from "@/lib/api/services/insights";

interface InsightsPageProps {
  params: Promise<{ projectId: string }>;
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
  // Locally hidden ids for instant Dismiss UX (in addition to invalidation).
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  const insights = useMemo(
    () =>
      normalizeInsights(
        (apiInsights as InsightDto[] | undefined) ?? [],
        hiddenIds
      ),
    [apiInsights, hiddenIds]
  );

  const filteredInsights = useMemo(() => {
    if (activeTab === "all") return insights;
    if (activeTab === "alerts")
      return insights.filter((i) => i.type === "alert");
    if (activeTab === "trends")
      return insights.filter((i) => i.type === "trend");
    if (activeTab === "recommendations")
      return insights.filter((i) => i.type === "recommendation");
    if (activeTab === "opportunities")
      return insights.filter((i) => i.type === "opportunity");
    return insights;
  }, [insights, activeTab]);

  const totalMentions = stats?.total_mentions ?? 0;
  const totalReach = stats?.total_reach ?? 0;
  const positivePct = stats?.positive_percentage ?? 0;
  const negativePct = stats?.negative_percentage ?? 0;

  const summaryCards = [
    {
      label: t("insights.cards.totalMentions"),
      value: fmtCompact(totalMentions),
      positive: true,
      change: stats?.mentions_change_percentage,
    },
    {
      label: t("insights.cards.totalReach"),
      value: fmtCompact(totalReach),
      positive: true,
      change: null,
    },
    {
      label: t("insights.cards.positive"),
      value: `${positivePct.toFixed(0)}%`,
      positive: positivePct >= 50,
      change: null,
    },
    {
      label: t("insights.cards.negative"),
      value: `${negativePct.toFixed(0)}%`,
      positive: negativePct < 30,
      change: null,
    },
  ];

  const suggestedChannels: SuggestedChannel[] = useMemo(() => {
    const list = (sources || []) as Array<{
      name?: string;
      mentionCount?: number;
      mention_count?: number;
    }>;
    return list
      .map((s) => ({
        name: String(s.name || "Unknown"),
        mentions: s.mentionCount || s.mention_count || 0,
      }))
      .filter((s) => s.mentions > 0)
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 4);
  }, [sources]);

  const trendChartOption = useMemo(
    () => buildInsightsTrendChart(timeSeries, isDark),
    [timeSeries, isDark]
  );

  const handleGenerate = () => {
    generateMutation.mutate(undefined, {
      onSuccess: () => toast.success(t("insights.generated")),
      onError: (err) =>
        toast.error(`${t("insights.generateFailed")}: ${getErrorMessage(err)}`),
    });
  };

  const handleDismiss = (id: string) => {
    setHiddenIds((prev) => new Set(prev).add(id));
    dismissMutation.mutate(id, {
      onSuccess: () => toast.success(t("insights.actions.dismissed")),
      onError: (err) => {
        // Restore on failure so the user sees the insight again.
        setHiddenIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        toast.error(getErrorMessage(err));
      },
    });
  };

  const handleTakeAction = (insight: InsightItem) => {
    const prompt = `${t("insights.prompts.takeActionPrefix")}${insight.title}`;
    router.push(
      `/projects/${projectId}/assistant?prefill=${encodeURIComponent(prompt)}`
    );
  };

  const handleShareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success(t("insights.linkCopied"));
    } catch {
      toast.error(t("common.error"));
    }
  };

  const goEmail = () => router.push(`/projects/${projectId}/reports/email`);

  const recommendedActions: RecommendedAction[] = [
    {
      icon: MessageSquare,
      label: t("insights.recommendedActions.draftPR.label"),
      description: t("insights.recommendedActions.draftPR.description"),
      onClick: () =>
        router.push(
          `/projects/${projectId}/assistant?prefill=${encodeURIComponent(
            t("insights.prompts.draftPR")
          )}`
        ),
    },
    {
      icon: Twitter,
      label: t("insights.recommendedActions.createTweet.label"),
      description: t("insights.recommendedActions.createTweet.description"),
      onClick: () =>
        router.push(
          `/projects/${projectId}/assistant?prefill=${encodeURIComponent(
            t("insights.prompts.createTweet")
          )}`
        ),
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
      <InsightsHeader
        isGenerating={generateMutation.isPending}
        onGenerate={handleGenerate}
        onSendToEmail={goEmail}
        onShareLink={handleShareLink}
        onSchedule={goEmail}
        onAddRecipients={goEmail}
      />

      <SummaryCards cards={summaryCards} />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <InsightsList
            projectId={projectId}
            filteredInsights={filteredInsights}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            isGenerating={generateMutation.isPending}
            isDismissPending={dismissMutation.isPending}
            onGenerate={handleGenerate}
            onShareLink={handleShareLink}
            onDismiss={handleDismiss}
            onTakeAction={handleTakeAction}
          />
        </div>
        <InsightsSidebar
          recommendedActions={recommendedActions}
          suggestedChannels={suggestedChannels}
          trendChartOption={trendChartOption}
        />
      </div>
    </div>
  );
}
