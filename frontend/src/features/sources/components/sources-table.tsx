"use client";

import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Globe,
  MoreHorizontal,
  Shield,
  ShieldOff,
  Trash2,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks";
import { fmtCompact } from "@/features/_shared";
import { TYPE_BADGE_COLORS, type SortKey, type SourceRow } from "../types";
import { relativeTime } from "../utils/transform";
import { SOURCES_PAGE_SIZE } from "../hooks/use-sources-page";

interface SourcesTableProps {
  paged: SourceRow[];
  sortedCount: number;
  page: number;
  totalPages: number;
  setPage: (updater: (p: number) => number) => void;

  selectedIds: Set<string>;
  onToggleSelected: (id: string) => void;
  onToggleSelectAll: () => void;

  sortBy: SortKey;
  sortOrder: "asc" | "desc";
  onSort: (key: SortKey) => void;

  isUpdatePending: boolean;
  onToggleActive: (s: SourceRow) => void;
  onToggleTrust: (s: SourceRow) => void;
  onDelete: (s: SourceRow) => void;
}

export function SourcesTable({
  paged,
  sortedCount,
  page,
  totalPages,
  setPage,
  selectedIds,
  onToggleSelected,
  onToggleSelectAll,
  sortBy,
  sortOrder,
  onSort,
  isUpdatePending,
  onToggleActive,
  onToggleTrust,
  onDelete,
}: SourcesTableProps) {
  const { t } = useTranslation();
  const allVisibleSelected =
    paged.length > 0 && paged.every((s) => selectedIds.has(s.id));

  const sortIcon = (key: SortKey) => {
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
        {sortedCount === 0 ? (
          <div className="py-16 text-center text-muted-foreground space-y-2">
            <Globe className="h-10 w-10 mx-auto opacity-50" />
            <p className="text-sm">{t("sources.empty.message")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50 text-left">
                  <th className="p-4 w-10">
                    <Checkbox
                      checked={allVisibleSelected}
                      onCheckedChange={onToggleSelectAll}
                    />
                  </th>
                  <SortHeader
                    label={t("sources.table.source")}
                    onClick={() => onSort("name")}
                    icon={sortIcon("name")}
                  />
                  <SortHeader
                    label={t("sources.table.type")}
                    onClick={() => onSort("type")}
                    icon={sortIcon("type")}
                    width="w-28"
                    className="hidden md:table-cell"
                  />
                  <SortHeader
                    label={t("sources.table.mentions")}
                    onClick={() => onSort("mentions")}
                    icon={sortIcon("mentions")}
                    width="w-28"
                    align="right"
                  />
                  <SortHeader
                    label={t("sources.table.reach")}
                    onClick={() => onSort("reach")}
                    icon={sortIcon("reach")}
                    width="w-24"
                    align="right"
                    className="hidden lg:table-cell"
                  />
                  <SortHeader
                    label={t("sources.table.trust")}
                    onClick={() => onSort("trust")}
                    icon={sortIcon("trust")}
                    width="w-24"
                    align="center"
                    className="hidden md:table-cell"
                  />
                  <SortHeader
                    label={t("sources.table.lastSeen")}
                    onClick={() => onSort("lastPublished")}
                    icon={sortIcon("lastPublished")}
                    width="w-32"
                    align="right"
                    className="hidden lg:table-cell"
                  />
                  <th className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wide w-20 text-center">
                    {t("sources.table.status")}
                  </th>
                  <th className="p-4 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {paged.map((s, index) => (
                  <SourceTableRow
                    key={s.id}
                    source={s}
                    index={index}
                    isSelected={selectedIds.has(s.id)}
                    onToggleSelected={() => onToggleSelected(s.id)}
                    onToggleActive={() => onToggleActive(s)}
                    onToggleTrust={() => onToggleTrust(s)}
                    onDelete={() => onDelete(s)}
                    isUpdatePending={isUpdatePending}
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
            {t("sources.pagination.showing", {
              from: (page - 1) * SOURCES_PAGE_SIZE + 1,
              to: Math.min(page * SOURCES_PAGE_SIZE, sortedCount),
              total: sortedCount,
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

function SourceTableRow({
  source: s,
  index,
  isSelected,
  onToggleSelected,
  onToggleActive,
  onToggleTrust,
  onDelete,
  isUpdatePending,
}: {
  source: SourceRow;
  index: number;
  isSelected: boolean;
  onToggleSelected: () => void;
  onToggleActive: () => void;
  onToggleTrust: () => void;
  onDelete: () => void;
  isUpdatePending: boolean;
}) {
  const { t } = useTranslation();
  return (
    <motion.tr
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.4) }}
      className={cn(
        "border-b border-border/30 hover:bg-muted/30 transition-colors",
        !s.active && "opacity-60"
      )}
    >
      <td className="p-4">
        <Checkbox checked={isSelected} onCheckedChange={onToggleSelected} />
      </td>
      <td className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 rounded-lg flex-shrink-0">
            <AvatarFallback className="rounded-lg text-xs font-medium bg-primary/10">
              {s.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm truncate">{s.name}</span>
              {s.trusted && <Shield className="h-3.5 w-3.5 text-blue-500" />}
              {s.country && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {s.country}
                </Badge>
              )}
              {s.language && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {s.language}
                </Badge>
              )}
            </div>
            <a
              href={s.baseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-primary transition-colors truncate inline-block max-w-[280px]"
            >
              {s.baseUrl.replace(/^https?:\/\//, "")}
            </a>
          </div>
        </div>
      </td>
      <td className="hidden md:table-cell p-4">
        <Badge
          variant="outline"
          className={cn("capitalize text-xs", TYPE_BADGE_COLORS[s.type])}
        >
          {s.type}
        </Badge>
      </td>
      <td className="p-4 text-right tabular-nums font-medium">
        {s.mentionCount.toLocaleString()}
      </td>
      <td className="hidden lg:table-cell p-4 text-right tabular-nums text-muted-foreground">
        {fmtCompact(s.totalReach)}
      </td>
      <td className="hidden md:table-cell p-4 text-center">
        <span
          className={cn(
            "text-sm font-semibold tabular-nums",
            s.trusted ? "text-blue-500" : "text-muted-foreground"
          )}
        >
          {(s.trustScore * 10).toFixed(1)}
        </span>
      </td>
      <td className="hidden lg:table-cell p-4 text-right text-xs text-muted-foreground">
        {relativeTime(s.lastPublishedAt, t)}
      </td>
      <td className="p-4 text-center">
        <Switch
          checked={s.active}
          onCheckedChange={onToggleActive}
          disabled={isUpdatePending}
        />
      </td>
      <td className="p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem
              onClick={() =>
                window.open(s.baseUrl, "_blank", "noopener,noreferrer")
              }
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              {t("sources.actions.goToSite")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleTrust}>
              {s.trusted ? (
                <>
                  <ShieldOff className="h-4 w-4 mr-2" />
                  {t("sources.actions.removeTrust")}
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  {t("sources.actions.markTrusted")}
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              {t("sources.actions.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </motion.tr>
  );
}
