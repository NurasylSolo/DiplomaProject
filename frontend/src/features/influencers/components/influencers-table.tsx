"use client";

import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  Globe,
  MoreHorizontal,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/hooks";
import { cn } from "@/lib/utils";
import { fmtCompact } from "@/features/_shared";
import type { InfluencerDto } from "@/lib/api/services/influencers";
import {
  INFLUENCERS_PAGE_SIZE,
  type InfluencerSortKey,
} from "../hooks/use-influencers-page";
import { lastSeenAgo } from "../utils/format";

interface InfluencersTableProps {
  paged: InfluencerDto[];
  totalCount: number;
  page: number;
  totalPages: number;
  setPage: (updater: (p: number) => number) => void;

  sortBy: InfluencerSortKey;
  sortOrder: "asc" | "desc";
  onSort: (key: InfluencerSortKey) => void;

  onView: (i: InfluencerDto) => void;
}

export function InfluencersTable({
  paged,
  totalCount,
  page,
  totalPages,
  setPage,
  sortBy,
  sortOrder,
  onSort,
  onView,
}: InfluencersTableProps) {
  const { t } = useTranslation();

  const sortIcon = (key: InfluencerSortKey) => {
    if (sortBy !== key) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortOrder === "asc" ? (
      <ArrowUp className="h-3 w-3" />
    ) : (
      <ArrowDown className="h-3 w-3" />
    );
  };

  return (
    <Card className="glass">
      <CardContent className="p-0">
        {totalCount === 0 ? (
          <div className="py-16 text-center text-muted-foreground space-y-2">
            <Globe className="h-10 w-10 mx-auto opacity-50" />
            <p className="text-sm">{t("influencersPage.empty.message")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50 text-left">
                  <SortHeader
                    label={t("influencersPage.table.influencer")}
                    onClick={() => onSort("name")}
                    icon={sortIcon("name")}
                  />
                  <th className="hidden sm:table-cell p-4 text-xs font-medium text-muted-foreground uppercase tracking-wide w-24 text-center">
                    {t("influencersPage.table.platform")}
                  </th>
                  <SortHeader
                    label={t("influencersPage.table.mentions")}
                    onClick={() => onSort("mentions_count")}
                    icon={sortIcon("mentions_count")}
                    width="w-28"
                    align="right"
                  />
                  <SortHeader
                    label={t("influencersPage.table.reach")}
                    onClick={() => onSort("reach")}
                    icon={sortIcon("reach")}
                    width="w-24"
                    align="right"
                    className="hidden lg:table-cell"
                  />
                  <SortHeader
                    label={t("influencersPage.table.shareOfVoice")}
                    onClick={() => onSort("share_of_voice")}
                    icon={sortIcon("share_of_voice")}
                    width="w-28"
                    align="right"
                    className="hidden lg:table-cell"
                  />
                  <SortHeader
                    label={t("influencersPage.table.score")}
                    onClick={() => onSort("influence_score")}
                    icon={sortIcon("influence_score")}
                    width="w-24"
                    align="center"
                  />
                  <SortHeader
                    label={t("influencersPage.table.lastSeen")}
                    onClick={() => onSort("last_seen")}
                    icon={sortIcon("last_seen")}
                    width="w-32"
                    align="right"
                    className="hidden md:table-cell"
                  />
                  <th className="p-4 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {paged.map((inf, index) => (
                  <InfluencerRow
                    key={inf.id}
                    inf={inf}
                    index={index}
                    onView={() => onView(inf)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4 border-t border-border/30 text-sm">
          <span className="text-muted-foreground">
            {t("influencersPage.pagination.showing", {
              from: (page - 1) * INFLUENCERS_PAGE_SIZE + 1,
              to: Math.min(page * INFLUENCERS_PAGE_SIZE, totalCount),
              total: totalCount,
            })}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 text-xs tabular-nums">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function SortHeader({
  label,
  onClick,
  icon,
  width = "",
  align = "left",
  className = "",
}: {
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
  width?: string;
  align?: "left" | "right" | "center";
  className?: string;
}) {
  const alignCls =
    align === "right" ? "text-right" : align === "center" ? "text-center" : "";
  const flexCls =
    align === "right" ? "ml-auto" : align === "center" ? "mx-auto" : "";

  return (
    <th
      className={cn(
        "p-4 text-xs font-medium text-muted-foreground uppercase tracking-wide",
        width,
        alignCls,
        className
      )}
    >
      <button
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground",
          flexCls
        )}
      >
        {label} {icon}
      </button>
    </th>
  );
}

function InfluencerRow({
  inf,
  index,
  onView,
}: {
  inf: InfluencerDto;
  index: number;
  onView: () => void;
}) {
  const { t } = useTranslation();
  return (
    <motion.tr
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.4) }}
      className="border-b border-border/30 hover:bg-muted/30 transition-colors cursor-pointer"
      onClick={onView}
    >
      <td className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 rounded-lg flex-shrink-0">
            <AvatarImage src={inf.avatar} />
            <AvatarFallback className="rounded-lg text-xs font-medium bg-primary/10 text-primary">
              {(inf.display_name || inf.handle || "?").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm truncate">
                {inf.display_name}
              </span>
              {inf.country && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {inf.country}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate max-w-[260px]">
              {inf.handle}
            </p>
          </div>
        </div>
      </td>
      <td className="hidden sm:table-cell p-4 text-center">
        <Badge variant="secondary" className="capitalize text-[10px]">
          {inf.platform}
        </Badge>
      </td>
      <td className="p-4 text-right tabular-nums font-medium">
        {(inf.mentions_count || 0).toLocaleString()}
      </td>
      <td className="hidden lg:table-cell p-4 text-right tabular-nums text-muted-foreground">
        {fmtCompact(inf.reach)}
      </td>
      <td className="hidden lg:table-cell p-4 text-right tabular-nums">
        {(inf.share_of_voice || 0).toFixed(1)}%
      </td>
      <td className="p-4 text-center">
        <Badge variant="secondary" className="font-semibold tabular-nums">
          {inf.influence_score.toFixed(1)}
        </Badge>
      </td>
      <td className="hidden md:table-cell p-4 text-right text-xs text-muted-foreground">
        {lastSeenAgo(inf.last_seen, t)}
      </td>
      <td className="p-4" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={onView}>
              <Eye className="h-4 w-4 mr-2" />
              {t("influencersPage.actions.viewDetails")}
            </DropdownMenuItem>
            {inf.base_url && (
              <DropdownMenuItem
                onClick={() =>
                  window.open(inf.base_url, "_blank", "noopener,noreferrer")
                }
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                {t("influencersPage.actions.openSite")}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </motion.tr>
  );
}
