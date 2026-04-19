"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Eye,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/hooks";
import type { TopicDto } from "@/lib/api/services/topics";
import { sentimentPct, totalSentiment } from "../utils/sentiment";

interface TopicCardProps {
  projectId: string;
  topic: TopicDto;
  index: number;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function TopicCard({
  projectId,
  topic,
  index,
  onView,
  onEdit,
  onDelete,
}: TopicCardProps) {
  const { t } = useTranslation();
  const total = totalSentiment(topic);
  const pct = sentimentPct(topic);
  const kws = topic.keywords || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4) }}
    >
      <Card className="glass hover:bg-card/80 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-semibold text-lg">{topic.name}</h3>
                {kws.slice(0, 4).map((kw) => (
                  <Badge
                    key={kw}
                    variant="outline"
                    className="text-[10px] px-1.5 py-0"
                  >
                    {kw}
                  </Badge>
                ))}
                {kws.length > 4 && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    +{kws.length - 4}
                  </Badge>
                )}
              </div>
              {topic.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {topic.description}
                </p>
              )}

              <div className="flex flex-wrap gap-6">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("topicsPage.metrics.mentions")}
                  </p>
                  <p className="font-semibold tabular-nums">
                    {total.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("topicsPage.metrics.sentiment")}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <div className="flex h-2 w-32 rounded-full overflow-hidden bg-muted">
                      <div
                        className="bg-green-500"
                        style={{ width: `${pct.positive}%` }}
                      />
                      <div
                        className="bg-gray-400"
                        style={{ width: `${pct.neutral}%` }}
                      />
                      <div
                        className="bg-red-500"
                        style={{ width: `${pct.negative}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums ml-2">
                      {pct.positive}%/{pct.neutral}%/{pct.negative}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={onView}>
                <Eye className="h-4 w-4 mr-1" />
                {t("topicsPage.actions.view")}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onEdit}>
                    <Pencil className="h-4 w-4 mr-2" />
                    {t("topicsPage.actions.edit")}
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href={`/projects/${projectId}/mentions?topic=${topic.id}`}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      {t("topicsPage.actions.viewMentions")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={onDelete}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t("topicsPage.actions.delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
