"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/hooks";
import { num } from "@/features/_shared";
import type { EmotionScores, EmotionKey } from "@/lib/api/services/emotions";
import { EMOTION_META } from "../utils/emotion-meta";

interface EmotionsStatsGridProps {
  averages: EmotionScores | undefined;
  /** Highlight the currently-selected emotion in the drill-down panel. */
  selected: EmotionKey | null;
  onSelect: (key: EmotionKey | null) => void;
}

export function EmotionsStatsGrid({
  averages,
  selected,
  onSelect,
}: EmotionsStatsGridProps) {
  const { t } = useTranslation();
  // Compute percentage relative to the sum so the grid sums to ~100%
  // — same logic the page used before, just inside the component.
  const total =
    EMOTION_META.reduce((acc, m) => acc + num(averages?.[m.key]), 0) || 1;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      {EMOTION_META.map((meta, i) => {
        const score = num(averages?.[meta.key]);
        const percentage = Math.round((score / total) * 100);
        const isActive = selected === meta.key;
        return (
          <motion.button
            key={meta.key}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: Math.min(i * 0.04, 0.32) }}
            onClick={() => onSelect(isActive ? null : meta.key)}
            className="text-left"
            type="button"
          >
            <Card
              className="glass transition-all hover:bg-card/80"
              style={
                isActive
                  ? {
                      borderColor: meta.color,
                      boxShadow: `0 0 0 1px ${meta.color}`,
                    }
                  : undefined
              }
            >
              <CardContent className="p-3 text-center">
                <span className="text-2xl mb-1 block">{meta.emoji}</span>
                <p className="text-xs font-medium">
                  {t(`emotionsPage.names.${meta.i18nKey}`, {
                    defaultValue: meta.key,
                  })}
                </p>
                <p
                  className="text-lg font-bold tabular-nums"
                  style={{ color: meta.color }}
                >
                  {percentage}%
                </p>
                <p className="text-[10px] text-muted-foreground tabular-nums">
                  {t("emotionsPage.scoreLabel", { defaultValue: "score" })}:{" "}
                  {score.toFixed(2)}
                </p>
              </CardContent>
            </Card>
          </motion.button>
        );
      })}
    </div>
  );
}
