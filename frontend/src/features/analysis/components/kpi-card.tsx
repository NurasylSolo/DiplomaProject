"use client";

import { motion } from "framer-motion";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/hooks";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  change: number | null | undefined;
  icon: React.ElementType;
  delay?: number;
  /** When true, a positive change becomes red (e.g. negative_pct went up). */
  invertColor?: boolean;
}

export function KpiCard({
  label,
  value,
  change,
  icon: Icon,
  delay = 0,
  invertColor = false,
}: KpiCardProps) {
  const { t } = useTranslation();
  const hasChange =
    change !== null && change !== undefined && Number.isFinite(change);
  const positive = hasChange ? (change as number) >= 0 : true;
  const colored = invertColor ? !positive : positive;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className="glass">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            {hasChange ? (
              <span
                className={cn(
                  "text-xs font-medium flex items-center gap-1",
                  colored ? "text-green-500" : "text-red-500"
                )}
                title={t("analysis.kpi.vsPrev")}
              >
                {positive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {positive ? "+" : ""}
                {(change as number).toFixed(1)}%
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </div>
          <p className="text-2xl font-bold mt-3 tabular-nums">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
