"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SafeECharts } from "@/components/ui/safe-echarts";
import { useTranslation } from "@/hooks";
import { EmptyState } from "@/features/_shared";
import type {
  EmotionDailyPoint,
  EmotionScores,
} from "@/lib/api/services/emotions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChartOption = Record<string, any>;

interface EmotionsChartsProps {
  donutOption: ChartOption;
  timelineOption: ChartOption;
  averages: EmotionScores | undefined;
  timeline: EmotionDailyPoint[] | undefined;
}

/**
 * Two-card row: a donut summarising overall mix (left) and a stacked
 * area showing how each emotion ebbed and flowed (right). Both fall
 * back to a friendly empty state when there's nothing to render.
 */
export function EmotionsCharts({
  donutOption,
  timelineOption,
  averages,
  timeline,
}: EmotionsChartsProps) {
  const { t } = useTranslation();
  const hasAverages =
    !!averages && Object.values(averages).some((v) => (v ?? 0) > 0);
  const hasTimeline = (timeline?.length ?? 0) > 0;

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">
            {t("emotionsPage.charts.distribution")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasAverages ? (
            <SafeECharts
              option={donutOption}
              style={{ height: 300 }}
              opts={{ renderer: "svg" }}
            />
          ) : (
            <EmptyState message={t("emotionsPage.empty.noData")} />
          )}
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">
            {t("emotionsPage.charts.timeline")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasTimeline ? (
            <SafeECharts
              option={timelineOption}
              style={{ height: 300 }}
              opts={{ renderer: "svg" }}
            />
          ) : (
            <EmptyState message={t("emotionsPage.empty.noTimeline")} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
