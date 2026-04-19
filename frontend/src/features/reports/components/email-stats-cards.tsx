"use client";

import { Mail, Play, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface EmailStatsCardsProps {
  totalSchedules: number;
  activeSchedules: number;
  uniqueRecipients: number;
  t: (key: string, options?: Record<string, unknown>) => string;
}

export function EmailStatsCards({
  totalSchedules,
  activeSchedules,
  uniqueRecipients,
  t,
}: EmailStatsCardsProps) {
  const cards = [
    {
      icon: Mail,
      iconClass: "bg-primary/10 text-primary",
      value: totalSchedules,
      label: t("reportsPage.email.stats.scheduled"),
    },
    {
      icon: Play,
      iconClass: "bg-green-500/10 text-green-500",
      value: activeSchedules,
      label: t("reportsPage.email.stats.active"),
    },
    {
      icon: Users,
      iconClass: "bg-blue-500/10 text-blue-500",
      value: uniqueRecipients,
      label: t("reportsPage.email.stats.recipients"),
    },
  ];
  return (
    <div className="grid grid-cols-3 gap-4">
      {cards.map(({ icon: Icon, iconClass, value, label }) => (
        <Card key={label} className="glass">
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${iconClass.split(" ")[0]}`}>
              <Icon className={`h-5 w-5 ${iconClass.split(" ").slice(1).join(" ")}`} />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
