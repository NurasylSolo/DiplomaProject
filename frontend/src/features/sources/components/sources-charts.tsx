"use client";

import { SafeECharts as ReactECharts } from "@/components/ui/safe-echarts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/hooks";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChartOption = Record<string, any>;

interface SourcesChartsProps {
  topSourcesBar: ChartOption;
  typesDonut: ChartOption;
}

export function SourcesCharts({ topSourcesBar, typesDonut }: SourcesChartsProps) {
  const { t } = useTranslation();
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <Card className="glass lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">
            {t("sources.charts.topSources")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ReactECharts
            option={topSourcesBar}
            style={{ height: 280 }}
            opts={{ renderer: "svg" }}
          />
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">
            {t("sources.charts.byType")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ReactECharts
            option={typesDonut}
            style={{ height: 280 }}
            opts={{ renderer: "svg" }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
