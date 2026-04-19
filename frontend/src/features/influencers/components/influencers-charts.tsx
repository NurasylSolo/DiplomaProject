"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SafeECharts } from "@/components/ui/safe-echarts";
import { useTranslation } from "@/hooks";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChartOption = Record<string, any>;

interface InfluencersChartsProps {
  topInfluencersBar: ChartOption;
  platformDonut: ChartOption;
}

export function InfluencersCharts({
  topInfluencersBar,
  platformDonut,
}: InfluencersChartsProps) {
  const { t } = useTranslation();
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <Card className="glass lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">
            {t("influencersPage.charts.topInfluencers")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SafeECharts
            option={topInfluencersBar}
            style={{ height: 280 }}
            opts={{ renderer: "svg" }}
          />
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">
            {t("influencersPage.charts.byPlatform")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SafeECharts
            option={platformDonut}
            style={{ height: 280 }}
            opts={{ renderer: "svg" }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
