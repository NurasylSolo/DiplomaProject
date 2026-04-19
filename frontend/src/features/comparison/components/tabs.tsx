"use client";

import { motion } from "framer-motion";
import { SafeECharts as ReactECharts } from "@/components/ui/safe-echarts";
import { Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks";
import { fmtCompact, EmptyState } from "@/features/_shared";
import type {
  ComparisonSentimentBucket,
  ComparisonTimeSeries,
} from "@/types";
import type {
  ComparedProject,
  ComparisonMetricKey,
} from "../utils/chart-options";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChartOption = Record<string, any>;

interface OverviewTabProps {
  comparedProjects: ComparedProject[];
  getMetricValue: (metric: ComparisonMetricKey, itemId: string) => number;
  winner: (metric: ComparisonMetricKey, higherIsBetter?: boolean) => string | null;
  radarOption: ChartOption;
  shareOfVoiceDonut: ChartOption;
}

export function OverviewTab({
  comparedProjects,
  getMetricValue,
  winner,
  radarOption,
  shareOfVoiceDonut,
}: OverviewTabProps) {
  const { t } = useTranslation();

  const winnerMentions = winner("total_mentions");
  const winnerReach = winner("total_reach");
  const winnerSov = winner("share_of_voice");
  const winnerPositive = winner("positive_pct");

  const rows: {
    label: string;
    key: ComparisonMetricKey;
    fmt: (v: number) => string;
    winnerId: string | null;
  }[] = [
    {
      label: t("comparisonPage.metrics.totalMentions"),
      key: "total_mentions",
      fmt: (v) => v.toLocaleString(),
      winnerId: winnerMentions,
    },
    {
      label: t("comparisonPage.metrics.totalReach"),
      key: "total_reach",
      fmt: (v) => fmtCompact(v),
      winnerId: winnerReach,
    },
    {
      label: t("comparisonPage.metrics.shareOfVoice"),
      key: "share_of_voice",
      fmt: (v) => `${v}%`,
      winnerId: winnerSov,
    },
    {
      label: t("comparisonPage.metrics.positive"),
      key: "positive_pct",
      fmt: (v) => `${v}%`,
      winnerId: winnerPositive,
    },
    {
      label: t("comparisonPage.metrics.neutral"),
      key: "neutral_pct",
      fmt: (v) => `${v}%`,
      winnerId: null,
    },
    {
      label: t("comparisonPage.metrics.negative"),
      key: "negative_pct",
      fmt: (v) => `${v}%`,
      winnerId: winner("negative_pct", false),
    },
    {
      label: t("comparisonPage.metrics.avgInfluence"),
      key: "avg_influence",
      fmt: (v) => v.toFixed(2),
      winnerId: winner("avg_influence"),
    },
    {
      label: t("comparisonPage.metrics.avgSentiment"),
      key: "avg_sentiment",
      fmt: (v) => v.toFixed(2),
      winnerId: winner("avg_sentiment"),
    },
  ];

  return (
    <div className="space-y-6">
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
                {rows.map((row) => (
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

      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">
                {t("comparisonPage.sections.radar")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReactECharts
                option={radarOption}
                style={{ height: 360 }}
                opts={{ renderer: "svg" }}
              />
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
              <ReactECharts
                option={shareOfVoiceDonut}
                style={{ height: 360 }}
                opts={{ renderer: "svg" }}
              />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

interface SentimentTabProps {
  comparedProjects: ComparedProject[];
  sentimentDist: ComparisonSentimentBucket[];
  sentimentStackedBar: ChartOption;
}

export function SentimentTab({
  comparedProjects,
  sentimentDist,
  sentimentStackedBar,
}: SentimentTabProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
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
          const pos = b?.positive || 0;
          const neg = b?.negative || 0;
          const neu = b?.neutral || 0;
          const total = pos + neg + neu;
          const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
          return (
            <Card key={p.id} className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  {p.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-green-500">
                    {t("mentions.sentiments.positive")}
                  </span>
                  <span className="tabular-nums">
                    {pos} · {pct(pos)}%
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    {t("mentions.sentiments.neutral")}
                  </span>
                  <span className="tabular-nums">
                    {neu} · {pct(neu)}%
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-red-500">
                    {t("mentions.sentiments.negative")}
                  </span>
                  <span className="tabular-nums">
                    {neg} · {pct(neg)}%
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

interface TimeSeriesTabProps {
  tsPerItem: ComparisonTimeSeries[];
  timeSeriesLine: ChartOption;
}

export function TimeSeriesTab({
  tsPerItem,
  timeSeriesLine,
}: TimeSeriesTabProps) {
  const { t } = useTranslation();
  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">
          {t("comparisonPage.sections.dailyMentions")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {tsPerItem.every((it) => (it.series || []).length === 0) ? (
          <EmptyState message={t("comparisonPage.empty.noTimeSeries")} />
        ) : (
          <ReactECharts
            option={timeSeriesLine}
            style={{ height: 420 }}
            opts={{ renderer: "svg" }}
          />
        )}
      </CardContent>
    </Card>
  );
}

interface ReachTabProps {
  reachBarOption: ChartOption;
  mentionsBarOption: ChartOption;
}

export function ReachTab({ reachBarOption, mentionsBarOption }: ReachTabProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <Card className="glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">
            {t("comparisonPage.sections.reach")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ReactECharts
            option={reachBarOption}
            style={{ height: 380 }}
            opts={{ renderer: "svg" }}
          />
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">
            {t("comparisonPage.sections.totalMentions")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ReactECharts
            option={mentionsBarOption}
            style={{ height: 380 }}
            opts={{ renderer: "svg" }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
