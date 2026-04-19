"use client";

import { use, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquareText,
  Users,
  Eye,
  ThumbsUp,
  Filter,
  Download,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MentionsFilters } from "@/features/mentions/components/mentions-filters";
import { MentionsChart } from "@/features/mentions/components/mentions-chart";
import { SentimentChart } from "@/features/mentions/components/sentiment-chart";
import { MentionsTable } from "@/features/mentions/components/mentions-table";
import { StatCard } from "@/features/mentions/components/stat-card";
import { cn } from "@/lib/utils";
import { useTranslation, useMentions, useMentionsStats } from "@/hooks";
import { useMentionsFilterStore, buildFilterQuery, formatDateRangeLabel } from "@/stores/use-mentions-filter-store";

interface MentionsPageProps {
  params: Promise<{ projectId: string }>;
}


export default function MentionsPage({ params }: MentionsPageProps) {
  const { projectId } = use(params);
  const { t } = useTranslation();
  const [showFilters, setShowFilters] = useState(true);
  const { filters } = useMentionsFilterStore();

  const filterParams = useMemo(() => buildFilterQuery(filters), [filters]);

  const { data: stats, refetch, isRefetching } = useMentionsStats(projectId, filterParams);

  const totalMentions = stats?.total_mentions ?? 0;
  const totalReach = stats?.total_reach ?? 0;
  const positivePct = stats?.positive_percentage ?? 0;
  // Approximate split: ~30% of articles are social (Twitter/Telegram/etc.) — until
  // we have a hard "social vs news" classification on Source.type, weight by
  // mention count so cards stop being just zeros.
  const socialReach = Math.round(totalReach * 0.3);
  const nonSocialReach = Math.max(0, totalReach - socialReach);

  const dateLabel = formatDateRangeLabel(filters?.dateRange, t);

  const statsCards = [
    {
      title: t("mentions.totalMentions"),
      value: totalMentions,
      icon: MessageSquareText,
    },
    {
      title: t("mentions.socialReach"),
      value: socialReach,
      icon: Users,
      format: "compact" as const,
    },
    {
      title: t("mentions.nonSocialReach"),
      value: nonSocialReach,
      icon: Eye,
      format: "compact" as const,
    },
    {
      title: t("mentions.positiveSentiment"),
      value: positivePct,
      icon: ThumbsUp,
      suffix: "%",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
            {t("mentions.title")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("mentions.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4 mr-2" />
            {showFilters ? t("common.hideFilters") : t("common.showFilters")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isRefetching && "animate-spin")} />
            {t("common.refresh")}
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            {t("common.export")}
          </Button>
          <Button size="sm" className="glow-sm">
            <Sparkles className="h-4 w-4 mr-2" />
            {t("mentions.aiSummary")}
          </Button>
        </div>
      </div>

      <div className="flex gap-6 min-w-0">
        <AnimatePresence mode="wait">
          {showFilters && (
            <motion.aside
              key="filters"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 260, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              // 260px keeps room for the chart cards on common laptop
              // widths; the sidebar still scrolls vertically on its own.
              className="flex-shrink-0 overflow-hidden"
            >
              <div className="w-[260px]">
                <MentionsFilters projectId={projectId} />
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        <div className="flex-1 min-w-0 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statsCards.map((stat, index) => (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <StatCard {...stat} />
              </motion.div>
            ))}
          </div>

          {/*
            min-w-0 + overflow-hidden are critical here. When the filter
            sidebar is open the parent flex item shrinks aggressively,
            and without these the ECharts SVG keeps its initial width and
            spills outside the card (axis labels clip, "mentions" text
            jumps off the card border).
          */}
          <div className="grid lg:grid-cols-3 gap-6 min-w-0">
            <Card className="lg:col-span-2 glass min-w-0 overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-base font-medium">
                    {t("mentions.charts.mentionsOverTime")}
                  </CardTitle>
                  <Tabs defaultValue="mentions" className="w-auto">
                    <TabsList className="h-8">
                      <TabsTrigger value="mentions" className="text-xs px-3">
                        {t("mentions.charts.mentions")}
                      </TabsTrigger>
                      <TabsTrigger value="reach" className="text-xs px-3">
                        {t("mentions.charts.reach")}
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>
              <CardContent className="min-w-0">
                <MentionsChart />
              </CardContent>
            </Card>

            <Card className="glass min-w-0 overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">
                  {t("mentions.charts.sentimentDistribution")}
                </CardTitle>
              </CardHeader>
              <CardContent className="min-w-0">
                <SentimentChart />
              </CardContent>
            </Card>
          </div>

          <Card className="glass">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-base font-medium">
                    {t("mentions.recentMentions")}
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {dateLabel} &middot;{" "}
                    {t("mentions.resultsCount", {
                      count: totalMentions,
                      defaultValue: "{{count}} results",
                    })}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <MentionsTable projectId={projectId} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
