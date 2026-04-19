"use client";

import { Loader2, Plus, RefreshCw, Tags, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks";

interface TopicsHeaderProps {
  isRefetching: boolean;
  onRefresh: () => void;
  onReassign: () => void;
  isReassignPending: boolean;
  onAutoDiscover: () => void;
  isDiscoverPending: boolean;
  onCreate: () => void;
}

export function TopicsHeader({
  isRefetching,
  onRefresh,
  onReassign,
  isReassignPending,
  onAutoDiscover,
  isDiscoverPending,
  onCreate,
}: TopicsHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Tags className="h-7 w-7 text-primary" />
          {t("topics.title")}
        </h1>
        <p className="text-muted-foreground mt-1">{t("topics.subtitle")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefetching}>
          <RefreshCw className={cn("h-4 w-4 mr-2", isRefetching && "animate-spin")} />
          {t("topicsPage.actions.refresh")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onReassign}
          disabled={isReassignPending}
        >
          {isReassignPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          {t("topicsPage.actions.reassign")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onAutoDiscover}
          disabled={isDiscoverPending}
        >
          <Wand2 className="h-4 w-4 mr-2" />
          {t("topicsPage.actions.autoDiscover")}
        </Button>
        <Button size="sm" className="glow-sm" onClick={onCreate}>
          <Plus className="h-4 w-4 mr-2" />
          {t("topicsPage.actions.create")}
        </Button>
      </div>
    </div>
  );
}
