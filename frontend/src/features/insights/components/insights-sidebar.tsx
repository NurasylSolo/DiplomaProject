"use client";

import { SafeECharts as ReactECharts } from "@/components/ui/safe-echarts";
import {
  BarChart3,
  ChevronRight,
  Globe,
  Lightbulb,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChartOption = Record<string, any>;

export interface RecommendedAction {
  icon: React.ElementType;
  label: string;
  description: string;
  onClick: () => void;
}

export interface SuggestedChannel {
  name: string;
  mentions: number;
}

interface InsightsSidebarProps {
  recommendedActions: RecommendedAction[];
  suggestedChannels: SuggestedChannel[];
  trendChartOption: ChartOption;
}

export function InsightsSidebar({
  recommendedActions,
  suggestedChannels,
  trendChartOption,
}: InsightsSidebarProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
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
                <p className="text-xs text-muted-foreground truncate">
                  {action.description}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          ))}
        </CardContent>
      </Card>

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
                const potentialKey =
                  idx === 0 ? "high" : idx === 1 ? "high" : idx === 2 ? "medium" : "low";
                return (
                  <div
                    key={channel.name}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {channel.name}
                      </p>
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

      <Card className="glass">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            {t("insights.sidebar.insightTrends")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ReactECharts
            option={trendChartOption}
            style={{ height: "180px" }}
            opts={{ renderer: "svg" }}
          />
          <p className="text-xs text-muted-foreground text-center mt-2">
            {t("insights.sidebar.last30Days")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
