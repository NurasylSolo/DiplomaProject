"use client";

import { motion } from "framer-motion";
import { Eye, Star, TrendingUp, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtCompact } from "@/features/_shared";
import { useTranslation } from "@/hooks";
import { cn } from "@/lib/utils";

interface AnalysisKpiProps {
  isLoading: boolean;
  totalVoices: number;
  avgScore: number;
  totalReach: number;
  topPlatform: string | null;
}

/** Translates a raw platform key (e.g. "news", "twitter") into the
 *  i18n string. We keep the underlying value lowercase to allow stable
 *  grouping. */
function platformLabel(t: (key: string, options?: Record<string, unknown>) => string, key: string | null) {
  if (!key) return "—";
  const k = key.toLowerCase();
  return t(`mentions.filters.sourceTypes.${k}`, { defaultValue: key });
}

export function AnalysisKpi({
  isLoading,
  totalVoices,
  avgScore,
  totalReach,
  topPlatform,
}: AnalysisKpiProps) {
  const { t } = useTranslation();

  const cards = [
    {
      key: "totalVoices",
      label: t("influencerAnalysis.kpi.totalVoices", {
        defaultValue: "Total voices",
      }),
      value: totalVoices.toLocaleString(),
      icon: Users,
      tone: "from-cyan-500/15 to-cyan-500/5",
      iconColor: "text-cyan-500",
    },
    {
      key: "avgScore",
      label: t("influencerAnalysis.kpi.avgScore", {
        defaultValue: "Avg. influence score",
      }),
      value: avgScore.toFixed(1),
      icon: Star,
      tone: "from-amber-500/15 to-amber-500/5",
      iconColor: "text-amber-500",
    },
    {
      key: "totalReach",
      label: t("influencerAnalysis.kpi.totalReach", {
        defaultValue: "Total reach",
      }),
      value: fmtCompact(totalReach),
      icon: Eye,
      tone: "from-violet-500/15 to-violet-500/5",
      iconColor: "text-violet-500",
    },
    {
      key: "topPlatform",
      label: t("influencerAnalysis.kpi.topPlatform", {
        defaultValue: "Top platform",
      }),
      value: platformLabel(t, topPlatform),
      icon: TrendingUp,
      tone: "from-emerald-500/15 to-emerald-500/5",
      iconColor: "text-emerald-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <motion.div
          key={card.key}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.06 }}
        >
          <Card
            className={cn(
              "glass overflow-hidden bg-gradient-to-br",
              card.tone
            )}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-background/60 backdrop-blur">
                  <card.icon className={cn("h-5 w-5", card.iconColor)} />
                </div>
                <div className="flex-1 min-w-0">
                  {isLoading ? (
                    <Skeleton className="h-7 w-20" />
                  ) : (
                    <p className="text-2xl font-bold tabular-nums truncate capitalize">
                      {card.value}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground truncate">
                    {card.label}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
