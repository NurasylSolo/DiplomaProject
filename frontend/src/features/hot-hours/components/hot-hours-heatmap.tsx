"use client";

import { useMemo } from "react";
import { useTheme } from "next-themes";
import { Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SafeECharts } from "@/components/ui/safe-echarts";
import { useTranslation } from "@/hooks";
import { EmptyState } from "@/features/_shared";
import type { HotHoursAggregate, HotHoursCell } from "@/lib/api/services/analytics";
import { DAY_DISPLAY_ORDER } from "../utils/days-hours";
import { buildHeatmapOption } from "../utils/chart-options";

interface HotHoursHeatmapProps {
  data: HotHoursAggregate | undefined;
  /** Called with the API day number + hour when a cell is clicked. */
  onCellClick: (day: number, hour: number) => void;
}

export function HotHoursHeatmap({ data, onCellClick }: HotHoursHeatmapProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const cells = data?.cells;

  const option = useMemo(
    () => buildHeatmapOption(cells, isDark, t),
    [cells, isDark, t]
  );

  const handleClick = (params: { value: [number, number, number | null] }) => {
    if (!params || !Array.isArray(params.value)) return;
    const [hour, row, mentions] = params.value;
    if (mentions == null || mentions <= 0) return;
    const apiDay = DAY_DISPLAY_ORDER[row];
    if (apiDay === undefined) return;
    onCellClick(apiDay, hour);
  };

  return (
    <Card className="glass overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base font-medium">
            {t("hotHoursPage.heatmap.title", { defaultValue: "Activity Heatmap" })}
          </CardTitle>
          {data?.timezone ? (
            <Badge variant="outline" className="gap-1 text-[10px] font-mono">
              <Globe className="h-3 w-3" />
              {data.timezone}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {!cells || cells.length === 0 ? (
          <EmptyState
            message={t("hotHoursPage.empty.noActivity", {
              defaultValue: "No activity in the selected window.",
            })}
          />
        ) : (
          <>
            <SafeECharts
              option={option}
              style={{ height: 440 }}
              opts={{ renderer: "svg" }}
              onEvents={{ click: handleClick }}
            />
            <HeatmapHint cells={cells} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Small footer note that explains how to read the heatmap. Rendered below
 * the chart so beginners aren't left guessing what the colours mean.
 */
function HeatmapHint({ cells }: { cells: HotHoursCell[] }) {
  const { t } = useTranslation();
  const total = cells.reduce((acc, c) => acc + c.mentions, 0);
  const peak = cells.reduce((m, c) => (c.mentions > m ? c.mentions : m), 0);
  return (
    <p className="text-[11px] text-muted-foreground mt-3 text-center">
      {t("hotHoursPage.heatmap.hint", {
        defaultValue:
          "Click any cell to filter mentions for that day-of-week and hour. Peak: {{peak}} mentions across {{total}} total.",
        peak,
        total,
      })}
    </p>
  );
}
