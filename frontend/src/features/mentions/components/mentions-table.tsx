"use client";

import { useMemo, useState } from "react";
import { 
  ExternalLink, 
  MoreHorizontal, 
  Tag, 
  FileText, 
  VolumeX, 
  Trash2,
  Bookmark,
  Eye,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getCountryName } from "@/lib/utils/countries";
import { CountryFlag } from "@/components/ui/country-flag";
import { useMentions, useBulkAction, useTranslation } from "@/hooks";
import { useMentionsFilterStore } from "@/stores";
import { buildFilterQuery } from "@/stores/use-mentions-filter-store";
import type { Mention } from "@/types";

interface MentionsTableProps {
  projectId: string;
}

const sentimentColors = {
  positive: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  neutral: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
  negative: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
};

const sourceIcons: Record<string, string> = {
  news: "📰", twitter: "𝕏", instagram: "IG", telegram: "TG",
  facebook: "FB", youtube: "YT", linkedin: "LI", tiktok: "TT",
  blogs: "📝", podcasts: "🎙", videos: "🎬", websites: "🌐", other: "📄",
};

export function MentionsTable({ projectId }: MentionsTableProps) {
  const { t } = useTranslation();
  const { filters } = useMentionsFilterStore();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  // Reset page to 1 whenever the filter object changes — using the
  // "store previous in render" pattern from the React docs to avoid an
  // effect that would otherwise cascade into an extra render.
  const [prevFilters, setPrevFilters] = useState(filters);
  if (filters !== prevFilters) {
    setPrevFilters(filters);
    setCurrentPage(1);
  }

  // Memoize so the queryKey doesn't change ref-equality on every render and
  // doesn't trigger spurious refetches in TanStack Query.
  const queryParams = useMemo(
    () => ({
      ...buildFilterQuery(filters),
      page: currentPage,
      per_page: perPage,
    }),
    [filters, currentPage, perPage]
  );

  const { data, isLoading, isError } = useMentions(projectId, queryParams);
  const bulkAction = useBulkAction(projectId);

  const mentions = data?.items || [];
  const totalPages = data?.totalPages || 0;
  const totalItems = data?.total || 0;
  
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };
  
  const toggleAll = () => {
    if (selectedIds.length === mentions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(mentions.map((m: Mention) => m.id));
    }
  };
  
  const formatReach = (reach: number) => {
    if (reach >= 1000000) return `${(reach / 1000000).toFixed(1)}M`;
    if (reach >= 1000) return `${(reach / 1000).toFixed(1)}K`;
    return reach.toString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">
          {t("mentions.table.loading", { defaultValue: "Loading mentions..." })}
        </span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground">
          {t("mentions.table.loadError", {
            defaultValue: "Failed to load mentions. Please try again.",
          })}
        </p>
      </div>
    );
  }
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border/50 text-left">
            <th className="p-4 w-12">
              <Checkbox
                checked={selectedIds.length === mentions.length && mentions.length > 0}
                onCheckedChange={toggleAll}
              />
            </th>
            <th className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t("mentions.table.mention")}
            </th>
            <th className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wide w-24">
              {t("mentions.table.sentiment")}
            </th>
            <th className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wide w-20 text-center">
              {t("mentions.table.score")}
            </th>
            <th className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wide w-24 text-right">
              {t("mentions.table.reach")}
            </th>
            <th className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wide w-20 text-center">
              {t("mentions.table.location")}
            </th>
            <th className="p-4 w-12"></th>
          </tr>
        </thead>
        <tbody>
          {mentions.length === 0 ? (
            <tr>
              <td colSpan={7} className="p-8 text-center">
                <div className="flex flex-col items-center gap-2">
                  <p className="text-muted-foreground">
                    {t("mentions.table.noMentionsFoundShort", {
                      defaultValue: "No mentions found",
                    })}
                  </p>
                  <p className="text-sm text-muted-foreground/70">
                    {t("mentions.table.tryAdjustingFilters", {
                      defaultValue: "Try adjusting your filter criteria",
                    })}
                  </p>
                </div>
              </td>
            </tr>
          ) : (
            mentions.map((mention: Mention) => {
              const sourceType = mention.source?.type || "other";
              const sourceName = mention.source?.name || "Unknown";
              const icon = sourceIcons[sourceType] || sourceType.substring(0, 2).toUpperCase();
              const sentimentKey = mention.sentimentLabel as keyof typeof sentimentColors;

              return (
                <tr
                  key={mention.id}
                  className={cn(
                    "border-b border-border/30 hover:bg-muted/30 transition-colors cursor-pointer",
                    mention.visited && "opacity-70"
                  )}
                >
                  <td className="p-4" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.includes(mention.id)}
                      onCheckedChange={() => toggleSelection(mention.id)}
                    />
                  </td>
                  <td className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-9 w-9 rounded-lg flex-shrink-0">
                        <AvatarFallback className="rounded-lg text-xs font-medium bg-primary/10">
                          {icon}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-muted-foreground">
                            {sourceName}
                          </span>
                          <span className="text-xs text-muted-foreground/50">•</span>
                          <span className="text-xs text-muted-foreground">
                            {mention.publishedAt ? formatDistanceToNow(new Date(mention.publishedAt), { addSuffix: true }) : ""}
                          </span>
                          {mention.saved && (
                            <Bookmark className="h-3 w-3 text-primary fill-primary" />
                          )}
                        </div>
                        <h4 className="font-medium text-sm line-clamp-1 mb-1">
                          {mention.title}
                        </h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {mention.snippet || mention.body?.substring(0, 150)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge
                      variant="outline"
                      className={cn(
                        "capitalize text-xs font-medium",
                        sentimentColors[sentimentKey] || sentimentColors.neutral
                      )}
                    >
                      {mention.sentimentLabel}
                    </Badge>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-semibold">
                        {mention.influenceScore?.toFixed(1) || "0.0"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {t("mentions.table.influence")}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <span className="text-sm font-medium">
                      {formatReach(mention.reach || 0)}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="inline-flex items-center justify-center" title={getCountryName(mention.country, "en")}>
                      <CountryFlag code={mention.country} size={22} />
                    </span>
                  </td>
                  <td className="p-4" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => window.open(mention.url, "_blank")}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          {t("mentions.actions.goToSource")}
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          {t("mentions.actions.viewDetails")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => bulkAction.mutate({ action: mention.saved ? "unsave" : "save", mention_ids: [mention.id] })}>
                          <Bookmark className="h-4 w-4 mr-2" />
                          {mention.saved
                            ? t("mentions.actions.unsave")
                            : t("mentions.actions.save")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => bulkAction.mutate({ action: "mark_visited", mention_ids: [mention.id] })}>
                          <Eye className="h-4 w-4 mr-2" />
                          {t("mentions.actions.markAsRead", {
                            defaultValue: "Mark as read",
                          })}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      
      {/* Pagination */}
      <div className="flex items-center justify-between p-4 border-t border-border/50">
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground">
            {t("mentions.table.showing", {
              from: Math.min((currentPage - 1) * perPage + 1, totalItems),
              to: Math.min(currentPage * perPage, totalItems),
              total: totalItems,
              defaultValue: "Showing {{from}}-{{to}} of {{total}} mentions",
            })}
          </p>
          <Select value={String(perPage)} onValueChange={(v) => { setPerPage(Number(v)); setCurrentPage(1); }}>
            <SelectTrigger className="w-[100px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">{t("mentions.table.perPage", { count: 10, defaultValue: "{{count}} / page" })}</SelectItem>
              <SelectItem value="25">{t("mentions.table.perPage", { count: 25, defaultValue: "{{count}} / page" })}</SelectItem>
              <SelectItem value="50">{t("mentions.table.perPage", { count: 50, defaultValue: "{{count}} / page" })}</SelectItem>
              <SelectItem value="100">{t("mentions.table.perPage", { count: 100, defaultValue: "{{count}} / page" })}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {t("common.previous", { defaultValue: "Previous" })}
          </Button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  className="w-8 p-0"
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={() => setCurrentPage(p => p + 1)}
          >
            {t("common.next", { defaultValue: "Next" })}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
