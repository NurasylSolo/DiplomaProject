"use client";

import { motion } from "framer-motion";
import { Calendar, Clock, MessageSquare, Moon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/hooks";
import { fmtCompact } from "@/features/_shared";
import type { HotHoursAggregate } from "@/lib/api/services/analytics";
import {
  dayLabel,
  dayLabelLong,
  formatHour24,
} from "../utils/days-hours";

interface HotHoursStatsProps {
  data: HotHoursAggregate | undefined;
}

/**
 * Four KPI cards. All numbers are derived from the API response — no
 * hard-coded "Tue – Thu" placeholder anymore.
 */
export function HotHoursStats({ data }: HotHoursStatsProps) {
  const { t } = useTranslation();

  const peak = data?.peak ?? null;
  const total = data?.total_mentions ?? 0;
  const topDays = (data?.active_days ?? []).filter((d) => d.mentions > 0).slice(0, 2);
  const quietest = data?.quietest_cells?.[0] ?? null;

  const cards = [
    {
      icon: Clock,
      iconClass: "bg-primary/10 text-primary",
      value: peak
        ? `${dayLabel(peak.day, t)} · ${formatHour24(peak.hour)}`
        : "—",
      label: t("hotHoursPage.stats.peak"),
      sub: peak ? `${peak.mentions.toLocaleString()} ${t("hotHoursPage.tooltip.mentions").toLowerCase()}` : null,
    },
    {
      icon: MessageSquare,
      iconClass: "bg-green-500/10 text-green-500",
      value: fmtCompact(total),
      label: t("hotHoursPage.stats.total"),
      sub: null,
    },
    {
      icon: Calendar,
      iconClass: "bg-amber-500/10 text-amber-500",
      value:
        topDays.length === 0
          ? "—"
          : topDays.length === 1
            ? dayLabelLong(topDays[0].day, t)
            : `${dayLabel(topDays[0].day, t)} – ${dayLabel(topDays[1].day, t)}`,
      label: t("hotHoursPage.stats.activeDays"),
      sub: null,
    },
    {
      icon: Moon,
      iconClass: "bg-indigo-500/10 text-indigo-500",
      value: quietest
        ? `${dayLabel(quietest.day, t)} · ${formatHour24(quietest.hour)}`
        : "—",
      label: t("hotHoursPage.stats.quietest"),
      sub: quietest
        ? `${quietest.mentions} ${t("hotHoursPage.tooltip.mentions").toLowerCase()}`
        : null,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(({ icon: Icon, iconClass, value, label, sub }, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
        >
          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${iconClass.split(" ")[0]}`}>
                  <Icon
                    className={`h-5 w-5 ${iconClass.split(" ").slice(1).join(" ")}`}
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold tabular-nums truncate">
                    {value}
                  </p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  {sub ? (
                    <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                      {sub}
                    </p>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
