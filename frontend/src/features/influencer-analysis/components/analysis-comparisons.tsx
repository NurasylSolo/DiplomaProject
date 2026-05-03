"use client";

import { useMemo } from "react";
import { BarChart3, Layers, PieChart } from "lucide-react";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SafeECharts as ReactECharts } from "@/components/ui/safe-echarts";
import { useTranslation } from "@/hooks";
import type { InfluencerDto } from "@/lib/api/services/influencers";
import {
  buildInfluenceScoreBar,
  buildPlatformShareDonut,
  buildSentimentStack,
} from "../utils/chart-options";

interface AnalysisComparisonsProps {
  influencers: InfluencerDto[];
}

export function AnalysisComparisons({ influencers }: AnalysisComparisonsProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const influenceBar = useMemo(
    () => buildInfluenceScoreBar(influencers, isDark),
    [influencers, isDark]
  );
  const platformDonut = useMemo(
    () => buildPlatformShareDonut(influencers, isDark),
    [influencers, isDark]
  );
  const sentimentStack = useMemo(
    () =>
      buildSentimentStack(influencers, isDark, {
        positive: t("mentions.sentiment.positive"),
        neutral: t("mentions.sentiment.neutral"),
        negative: t("mentions.sentiment.negative"),
      }),
    [influencers, isDark, t]
  );

  const isEmpty = influencers.length === 0;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <ChartCard
        icon={<BarChart3 className="h-4 w-4 text-primary" />}
        title={t("influencerAnalysis.charts.influenceScore", {
          defaultValue: "Top influence score",
        })}
        empty={isEmpty}
        emptyText={t("influencerAnalysis.empty.charts", {
          defaultValue: "No data to compare yet",
        })}
      >
        <ReactECharts
          option={influenceBar}
          style={{ height: "320px", width: "100%" }}
          opts={{ renderer: "svg" }}
        />
      </ChartCard>

      <ChartCard
        icon={<PieChart className="h-4 w-4 text-primary" />}
        title={t("influencerAnalysis.charts.platformDistribution", {
          defaultValue: "Mentions by platform",
        })}
        empty={isEmpty}
        emptyText={t("influencerAnalysis.empty.charts", {
          defaultValue: "No data to compare yet",
        })}
      >
        <ReactECharts
          option={platformDonut}
          style={{ height: "320px", width: "100%" }}
          opts={{ renderer: "svg" }}
        />
      </ChartCard>

      <ChartCard
        icon={<Layers className="h-4 w-4 text-primary" />}
        title={t("influencerAnalysis.charts.sentimentMix", {
          defaultValue: "Sentiment mix per voice",
        })}
        empty={isEmpty}
        emptyText={t("influencerAnalysis.empty.charts", {
          defaultValue: "No data to compare yet",
        })}
      >
        <ReactECharts
          option={sentimentStack}
          style={{ height: "320px", width: "100%" }}
          opts={{ renderer: "svg" }}
        />
      </ChartCard>
    </div>
  );
}

interface ChartCardProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  empty: boolean;
  emptyText: string;
}

function ChartCard({ icon, title, children, empty, emptyText }: ChartCardProps) {
  return (
    <Card className="glass min-w-0 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="min-w-0">
        {empty ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            {emptyText}
          </p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
