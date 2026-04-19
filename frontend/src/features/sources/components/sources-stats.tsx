"use client";

import { motion } from "framer-motion";
import { ArrowUp, CheckCircle, Globe, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/hooks";
import { fmtCompact } from "@/features/_shared";

interface SourcesStatsProps {
  total: number;
  active: number;
  trusted: number;
  mentions: number;
}

export function SourcesStats({ total, active, trusted, mentions }: SourcesStatsProps) {
  const { t } = useTranslation();

  const cards: {
    icon: React.ElementType;
    iconClass: string;
    value: string;
    label: string;
    delay: number;
  }[] = [
    {
      icon: Globe,
      iconClass: "bg-primary/10 text-primary",
      value: String(total),
      label: t("sources.stats.total"),
      delay: 0,
    },
    {
      icon: CheckCircle,
      iconClass: "bg-green-500/10 text-green-500",
      value: String(active),
      label: t("sources.stats.active"),
      delay: 0.05,
    },
    {
      icon: Shield,
      iconClass: "bg-blue-500/10 text-blue-500",
      value: String(trusted),
      label: t("sources.stats.trusted"),
      delay: 0.1,
    },
    {
      icon: ArrowUp,
      iconClass: "bg-amber-500/10 text-amber-500",
      value: fmtCompact(mentions),
      label: t("sources.stats.totalMentions"),
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
                  <Icon className={`h-5 w-5 ${iconClass.split(" ").slice(1).join(" ")}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums">{value}</p>
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
