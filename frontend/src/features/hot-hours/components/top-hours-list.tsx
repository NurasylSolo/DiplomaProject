"use client";

import { TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks";
import type { HotHoursCell } from "@/lib/api/services/analytics";
import { dayLabel, formatHour24 } from "../utils/days-hours";

interface TopHoursListProps {
  cells: HotHoursCell[] | undefined;
  onCellClick: (day: number, hour: number) => void;
}

export function TopHoursList({ cells, onCellClick }: TopHoursListProps) {
  const { t } = useTranslation();
  const safeCells = Array.isArray(cells) ? cells : [];

  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          {t("hotHoursPage.sidebar.topHours", { defaultValue: "Top hours" })}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {safeCells.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            {t("hotHoursPage.empty.noActivity", {
              defaultValue: "No activity yet",
            })}
          </p>
        ) : (
          safeCells.map((cell, index) => (
            <button
              key={`${cell.day}-${cell.hour}`}
              type="button"
              onClick={() => onCellClick(cell.day, cell.hour)}
              className="w-full flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                    index === 0
                      ? "bg-amber-500/20 text-amber-500"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {dayLabel(cell.day, t)}
                  </p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {formatHour24(cell.hour)}
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="tabular-nums">
                {cell.mentions}
              </Badge>
            </button>
          ))
        )}
      </CardContent>
    </Card>
  );
}
