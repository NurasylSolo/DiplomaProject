"use client";

import { type LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: number;
  change?: number;
  changeType?: "increase" | "decrease";
  icon: LucideIcon;
  suffix?: string;
  format?: "number" | "compact";
}

export function StatCard({
  title,
  value,
  change,
  changeType = "increase",
  icon: Icon,
  suffix = "",
  format = "number",
}: StatCardProps) {
  const formatValue = (val: number) => {
    if (format === "compact") {
      if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
      if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
    }
    return val.toLocaleString();
  };
  
  return (
    <Card className="glass hover:bg-card/80 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {title}
            </p>
            <p className="text-2xl font-bold">
              {formatValue(value)}{suffix}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </div>
        
        {change !== undefined && (
          <div className="mt-3 flex items-center gap-1">
            {changeType === "increase" ? (
              <TrendingUp className="h-3 w-3 text-green-500" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-500" />
            )}
            <span
              className={cn(
                "text-xs font-medium",
                changeType === "increase" ? "text-green-500" : "text-red-500"
              )}
            >
              {changeType === "increase" ? "+" : ""}{change}%
            </span>
            <span className="text-xs text-muted-foreground">vs last period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

