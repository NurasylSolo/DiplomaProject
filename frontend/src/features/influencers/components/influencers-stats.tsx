"use client";

import { motion } from "framer-motion";
import { Activity, Eye, Globe, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/hooks";
import { fmtCompact } from "@/features/_shared";

interface InfluencersStatsProps {
  total: number;
  totalReach: number;
  totalMentions: number;
  avgScore: number;
  topPlatform: string;
}

export function InfluencersStats({
  total,
  totalReach,
  totalMentions,
  avgScore,
  topPlatform,
}: InfluencersStatsProps) {
  const { t } = useTranslation();

  const cards = [
    {
      icon: Users,
      iconClass: "bg-primary/10 text-primary",
      value: String(total),
      label: t("influencersPage.stats.total"),
      delay: 0,
    },
    {
      icon: Eye,
      iconClass: "bg-blue-500/10 text-blue-500",
      value: fmtCompact(totalReach),
      label: t("influencersPage.stats.totalReach"),
      delay: 0.05,
    },
    {
      icon: Activity,
      iconClass: "bg-green-500/10 text-green-500",
      value: fmtCompact(totalMentions),
      label: t("influencersPage.stats.totalMentions"),
      delay: 0.1,
    },
    {
      icon: Globe,
      iconClass: "bg-amber-500/10 text-amber-500",
      // Show top platform name if any data, otherwise the avg-score number.
      value: topPlatform === "—" ? avgScore.toFixed(1) : topPlatform,
      label:
        topPlatform === "—"
          ? t("influencersPage.stats.avgScore")
          : t("influencersPage.stats.topPlatform"),
      delay: 0.15,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(({ icon: Icon, iconClass, value, label, delay }) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay }}
        >
          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${iconClass.split(" ")[0]}`}>
                  <Icon
                    className={`h-5 w-5 ${iconClass.split(" ").slice(1).join(" ")}`}
                  />
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums capitalize">
                    {value}
                  </p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
