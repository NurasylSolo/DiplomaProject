"use client";

import { Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/hooks";
import type { HotHoursAggregate, HotHoursCell } from "@/lib/api/services/analytics";
import { dayLabel, dayLabelLong, formatHour24 } from "../utils/days-hours";

type ReasonKey = "positivePeak" | "highVolume" | "activeDiscussion";

interface Suggestion {
  cell: HotHoursCell;
  reason: ReasonKey;
}

/**
 * Pick the 3 best windows to publish in. Heuristic:
 *
 * 1. **Positive peak** — cell with highest `mentions × (1 + avg_sentiment)`,
 *    so a popular hour with positive coverage wins over a popular hour
 *    with negative tone.
 * 2. **High volume** — fall back to the top mentions cell that wasn't
 *    already chosen.
 * 3. **Active discussion** — third pick by raw mentions count.
 */
function buildSuggestions(data: HotHoursAggregate | undefined): Suggestion[] {
  const cells = data?.cells ?? [];
  if (cells.length === 0) return [];

  const byPositiveScore = [...cells].sort(
    (a, b) =>
      b.mentions * (1 + Math.max(0, b.avg_sentiment)) -
      a.mentions * (1 + Math.max(0, a.avg_sentiment))
  );
  const byVolume = [...cells].sort((a, b) => b.mentions - a.mentions);

  const out: Suggestion[] = [];
  const seen = new Set<string>();

  const tryPush = (cell: HotHoursCell | undefined, reason: ReasonKey) => {
    if (!cell) return;
    const id = `${cell.day}-${cell.hour}`;
    if (seen.has(id)) return;
    seen.add(id);
    out.push({ cell, reason });
  };

  tryPush(byPositiveScore[0], "positivePeak");
  for (const cell of byVolume) {
    if (out.length >= 2) break;
    tryPush(cell, "highVolume");
  }
  for (const cell of byVolume) {
    if (out.length >= 3) break;
    tryPush(cell, "activeDiscussion");
  }
  return out;
}

interface BestTimesPanelProps {
  data: HotHoursAggregate | undefined;
}

export function BestTimesPanel({ data }: BestTimesPanelProps) {
  const { t } = useTranslation();
  const suggestions = buildSuggestions(data);

  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          {t("hotHoursPage.sidebar.bestTimes", {
            defaultValue: "Best times to post",
          })}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            {t("hotHoursPage.empty.noSuggestions", {
              defaultValue: "Not enough data to suggest a window yet.",
            })}
          </p>
        ) : (
          suggestions.map(({ cell, reason }) => (
            <div
              key={`${cell.day}-${cell.hour}`}
              className="p-3 rounded-lg bg-primary/5 border border-primary/10"
            >
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge
                  variant="outline"
                  className="text-xs border-primary/30 text-primary"
                >
                  {dayLabelLong(cell.day, t)}
                </Badge>
                <span className="text-sm font-medium tabular-nums">
                  {formatHour24(cell.hour)}
                </span>
                <Badge
                  variant="secondary"
                  className="text-[10px] tabular-nums ml-auto"
                >
                  {cell.mentions} ·{" "}
                  {cell.avg_sentiment > 0 ? "+" : ""}
                  {cell.avg_sentiment.toFixed(2)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {t(`hotHoursPage.bestTimes.reasons.${reason}`, {
                  day: dayLabel(cell.day, t),
                  hour: formatHour24(cell.hour),
                  defaultValue: reason,
                })}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
