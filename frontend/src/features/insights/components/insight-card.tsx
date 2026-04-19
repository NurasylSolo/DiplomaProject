"use client";

import { motion } from "framer-motion";
import {
  ChevronRight,
  ExternalLink,
  MoreHorizontal,
  Send,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks";
import {
  INSIGHT_SEVERITY_COLORS,
  INSIGHT_TYPE_ICONS,
  type InsightItem,
} from "../utils/normalize";

interface InsightCardProps {
  projectId: string;
  insight: InsightItem;
  index: number;
  isDismissPending: boolean;
  onTakeAction: (insight: InsightItem) => void;
  onShareLink: () => void;
  onDismiss: (id: string) => void;
}

export function InsightCard({
  projectId,
  insight,
  index,
  isDismissPending,
  onTakeAction,
  onShareLink,
  onDismiss,
}: InsightCardProps) {
  const { t } = useTranslation();
  const TypeIcon = INSIGHT_TYPE_ICONS[insight.type];
  const categoryLabel = t(`insights.categories.${insight.category}`, {
    defaultValue: insight.category,
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="glass hover:bg-card/80 transition-colors group">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "p-2 rounded-lg shrink-0",
                INSIGHT_SEVERITY_COLORS[insight.severity] ||
                  INSIGHT_SEVERITY_COLORS.medium
              )}
            >
              <TypeIcon className="h-5 w-5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
                    {insight.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {insight.description}
                  </p>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onTakeAction(insight)}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      {t("insights.actions.viewDetails")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onShareLink}>
                      <Send className="h-4 w-4 mr-2" />
                      {t("insights.actions.share")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDismiss(insight.id)}
                      className="text-destructive"
                    >
                      <span className="mr-2">×</span>
                      {t("insights.actions.dismiss")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex items-center gap-3 mt-3 flex-wrap">
                {insight.metricChange !== null &&
                  insight.metricChange !== undefined && (
                    <span className="text-lg font-bold text-primary">
                      {`${insight.metricChange > 0 ? "+" : ""}${insight.metricChange}%`}
                    </span>
                  )}
                <Badge variant="outline" className="text-xs capitalize">
                  {categoryLabel}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
                    insight.severity === "high"
                      ? "border-red-500/30 text-red-500"
                      : insight.severity === "medium"
                        ? "border-amber-500/30 text-amber-500"
                        : "border-green-500/30 text-green-500"
                  )}
                >
                  {t(`insights.severity.${insight.severity}`)}
                </Badge>
                {insight.createdAt && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    {new Date(insight.createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              {Array.isArray(insight.relatedMentionIds) &&
                insight.relatedMentionIds.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground mr-1">
                      {t("insights.relatedMentions.label")} (
                      {insight.relatedMentionIds.length})
                    </span>
                    {insight.relatedMentionIds.slice(0, 5).map((mid) => (
                      <a
                        key={mid}
                        href={`/projects/${projectId}/mentions?highlight=${mid}`}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      >
                        m:{mid.slice(0, 6)}
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    ))}
                  </div>
                )}

              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7"
                  onClick={() => onTakeAction(insight)}
                >
                  {t("insights.actions.takeAction")}
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs h-7"
                  onClick={() => onDismiss(insight.id)}
                  disabled={isDismissPending}
                >
                  {t("insights.actions.dismiss")}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
