"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/hooks";
import { num } from "@/features/_shared";
import type { EmotionKey, EmotionScores } from "@/lib/api/services/emotions";
import { EMOTION_META } from "../utils/emotion-meta";

interface EmotionBreakdownProps {
  averages: EmotionScores | undefined;
  selected: EmotionKey | null;
  onSelect: (key: EmotionKey | null) => void;
}

/**
 * Horizontal-bar breakdown that doubles as a "click to filter the
 * top-mentions panel" surface. Active row gets a colored ring.
 */
export function EmotionBreakdown({
  averages,
  selected,
  onSelect,
}: EmotionBreakdownProps) {
  const { t } = useTranslation();
  const total =
    EMOTION_META.reduce((acc, m) => acc + num(averages?.[m.key]), 0) || 1;

  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">
          {t("emotionsPage.charts.breakdown")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {EMOTION_META.map((meta) => {
          const score = num(averages?.[meta.key]);
          const percentage = Math.round((score / total) * 100);
          const isActive = selected === meta.key;
          return (
            <button
              key={meta.key}
              type="button"
              onClick={() => onSelect(isActive ? null : meta.key)}
              className="w-full flex items-center gap-3 text-left rounded-md py-1 hover:bg-muted/30 transition-colors"
              style={
                isActive
                  ? { boxShadow: `inset 0 0 0 1px ${meta.color}` }
                  : undefined
              }
            >
              <span className="text-xl w-8 text-center">{meta.emoji}</span>
              <div className="flex-1">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium">
                    {t(`emotionsPage.names.${meta.i18nKey}`, {
                      defaultValue: meta.key,
                    })}
                  </span>
                  <span className="tabular-nums">{percentage}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: meta.color,
                    }}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
