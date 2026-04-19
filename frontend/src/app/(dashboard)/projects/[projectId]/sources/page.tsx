"use client";

import { use, useMemo, useState } from "react";
import { motion } from "framer-motion";
import ReactECharts from "echarts-for-react";
import { useTheme } from "next-themes";
import {
  Plus,
  Search,
  Download,
  ExternalLink,
  MoreHorizontal,
  Globe,
  Shield,
  ShieldOff,
  Trash2,
  CheckCircle,
  RefreshCw,
  ListPlus,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  useSources,
  useCreateSource,
  useUpdateSource,
  useDeleteSource,
  useBulkSourcesAction,
  useAttachCatalogSources,
  useTranslation,
} from "@/hooks";
import { downloadCsv, buildCsvFilename, type CsvRow } from "@/lib/csv";
import { getErrorMessage } from "@/lib/api";

interface SourcesPageProps {
  params: Promise<{ projectId: string }>;
}

interface SourceRow {
  id: string;
  name: string;
  type: string;
  baseUrl: string;
  active: boolean;
  trustScore: number;
  trusted: boolean;
  country: string | null;
  language: string | null;
  mentionCount: number;
  totalReach: number;
  avgSentiment: number;
  lastPublishedAt: Date | null;
  lastCrawledAt: Date | null;
  createdAt: Date | null;
}

const TYPE_OPTIONS = ["news", "blogs", "websites", "twitter", "facebook", "youtube", "telegram", "tiktok"] as const;

const typeColors: Record<string, string> = {
  news: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  blogs: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30",
  blog: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30",
  websites: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
  twitter: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30",
  facebook: "bg-blue-700/10 text-blue-700 dark:text-blue-400 border-blue-700/30",
  youtube: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
  telegram: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
  tiktok: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
  social: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
  video: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
};

function fmtCompact(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

function relativeTime(d: Date | null, t: ReturnType<typeof useTranslation>["t"]): string {
  if (!d || Number.isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return t("sources.relative.justNow");
  const min = Math.floor(sec / 60);
  if (min < 60) return t("sources.relative.minutesAgo", { count: min });
  const hr = Math.floor(min / 60);
  if (hr < 24) return t("sources.relative.hoursAgo", { count: hr });
  const day = Math.floor(hr / 24);
  if (day < 30) return t("sources.relative.daysAgo", { count: day });
  return d.toLocaleDateString();
}

type SortKey = "name" | "type" | "mentions" | "reach" | "trust" | "lastPublished";
type SortOrder = "asc" | "desc";

const PAGE_SIZE = 25;

export default function SourcesPage({ params }: SourcesPageProps) {
  const { projectId } = use(params);
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const { data: apiSources, isLoading, refetch, isRefetching } = useSources(projectId);
  const createMutation = useCreateSource(projectId);
  const updateMutation = useUpdateSource(projectId);
  const deleteMutation = useDeleteSource(projectId);
  const bulkMutation = useBulkSourcesAction(projectId);
  const attachMutation = useAttachCatalogSources(projectId);

  // ─── filters / sort / pagination ──────────────────────────────────────

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [trustedFilter, setTrustedFilter] = useState<string>("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [languageFilter, setLanguageFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortKey>("mentions");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);

  // ─── add source dialog state ──────────────────────────────────────────

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    base_url: "",
    type: "news" as string,
    country: "",
    language: "",
  });

  // ─── attach catalog dialog state ──────────────────────────────────────

  const [attachOpen, setAttachOpen] = useState(false);
  const [attachLangs, setAttachLangs] = useState<string[]>([]);
  const [attachCountries, setAttachCountries] = useState<string[]>([]);
  const [attachLimit, setAttachLimit] = useState<number>(100);

  // ─── transform API → row model ────────────────────────────────────────

  const sources: SourceRow[] = useMemo(() => {
    return (apiSources || []).map((s: any) => {
      const trust = Number(s.trustScore ?? s.trust_score ?? 0);
      const lastPub = s.lastPublishedAt || s.last_published_at;
      const lastCrawled = s.lastCrawledAt || s.last_crawled_at;
      return {
        id: s.id,
        name: s.name,
        type: (s.type || "news").toLowerCase(),
        baseUrl: s.baseUrl || s.base_url || "",
        active: !!s.active,
        trustScore: trust,
        trusted: trust >= 0.7,
        country: s.country ?? null,
        language: s.language ?? null,
        mentionCount: Number(s.mentionCount ?? s.mention_count ?? 0),
        totalReach: Number(s.totalReach ?? s.total_reach ?? 0),
        avgSentiment: Number(s.avgSentiment ?? s.avg_sentiment ?? 0),
        lastPublishedAt: lastPub ? new Date(lastPub) : null,
        lastCrawledAt: lastCrawled ? new Date(lastCrawled) : null,
        createdAt: s.createdAt || s.created_at ? new Date(s.createdAt || s.created_at) : null,
      };
    });
  }, [apiSources]);

  // unique values for filter dropdowns
  const uniqueCountries = useMemo(
    () => Array.from(new Set(sources.map((s) => s.country).filter((x): x is string => !!x))).sort(),
    [sources]
  );
  const uniqueLanguages = useMemo(
    () => Array.from(new Set(sources.map((s) => s.language).filter((x): x is string => !!x))).sort(),
    [sources]
  );
  const uniqueTypes = useMemo(
    () => Array.from(new Set(sources.map((s) => s.type))).sort(),
    [sources]
  );

  const filtered: SourceRow[] = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sources.filter((s) => {
      if (q && !(`${s.name} ${s.baseUrl}`.toLowerCase().includes(q))) return false;
      if (typeFilter !== "all" && s.type !== typeFilter) return false;
      if (activeFilter === "active" && !s.active) return false;
      if (activeFilter === "inactive" && s.active) return false;
      if (trustedFilter === "trusted" && !s.trusted) return false;
      if (trustedFilter === "untrusted" && s.trusted) return false;
      if (countryFilter !== "all" && s.country !== countryFilter) return false;
      if (languageFilter !== "all" && s.language !== languageFilter) return false;
      return true;
    });
  }, [sources, searchQuery, typeFilter, activeFilter, trustedFilter, countryFilter, languageFilter]);

  const sorted: SourceRow[] = useMemo(() => {
    const dir = sortOrder === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "name": return a.name.localeCompare(b.name) * dir;
        case "type": return a.type.localeCompare(b.type) * dir;
        case "mentions": return (a.mentionCount - b.mentionCount) * dir;
        case "reach": return (a.totalReach - b.totalReach) * dir;
        case "trust": return (a.trustScore - b.trustScore) * dir;
        case "lastPublished": {
          const av = a.lastPublishedAt?.getTime() ?? 0;
          const bv = b.lastPublishedAt?.getTime() ?? 0;
          return (av - bv) * dir;
        }
        default: return 0;
      }
    });
  }, [filtered, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // ─── stats cards ──────────────────────────────────────────────────────

  const stats = useMemo(() => {
    return {
      total: sources.length,
      active: sources.filter((s) => s.active).length,
      trusted: sources.filter((s) => s.trusted).length,
      mentions: sources.reduce((acc, s) => acc + s.mentionCount, 0),
    };
  }, [sources]);

  // ─── chart options ────────────────────────────────────────────────────

  const topSourcesBar = useMemo(() => {
    const top = [...sources].sort((a, b) => b.mentionCount - a.mentionCount).slice(0, 10);
    return {
      tooltip: { trigger: "axis" as const, axisPointer: { type: "shadow" as const } },
      grid: { left: "3%", right: "4%", bottom: "5%", top: "5%", containLabel: true },
      xAxis: { type: "value" as const, axisLabel: { color: isDark ? "#737373" : "#a3a3a3" } },
      yAxis: {
        type: "category" as const,
        inverse: true,
        data: top.map((s) => s.name),
        axisLabel: { color: isDark ? "#a3a3a3" : "#525252", fontSize: 11 },
      },
      series: [
        {
          type: "bar" as const,
          data: top.map((s) => s.mentionCount),
          itemStyle: { color: "oklch(0.70 0.15 195)", borderRadius: [0, 4, 4, 0] },
          barWidth: 14,
        },
      ],
    };
  }, [sources, isDark]);

  const typesDonut = useMemo(() => {
    const byType: Record<string, number> = {};
    sources.forEach((s) => {
      byType[s.type] = (byType[s.type] || 0) + s.mentionCount;
    });
    const palette = [
      "oklch(0.70 0.15 195)",
      "oklch(0.65 0.17 155)",
      "oklch(0.75 0.14 75)",
      "oklch(0.60 0.22 25)",
      "oklch(0.65 0.18 290)",
      "oklch(0.70 0.18 350)",
    ];
    const data = Object.entries(byType)
      .filter(([, v]) => v > 0)
      .map(([name, value], i) => ({
        name,
        value,
        itemStyle: { color: palette[i % palette.length] },
      }));
    return {
      tooltip: { trigger: "item" as const },
      legend: { bottom: 0, textStyle: { color: isDark ? "#a3a3a3" : "#525252" } },
      series: [
        {
          type: "pie" as const,
          radius: ["55%", "78%"],
          itemStyle: { borderRadius: 6, borderWidth: 2, borderColor: isDark ? "#171717" : "#fff" },
          label: { show: false },
          data,
        },
      ],
    };
  }, [sources, isDark]);

  // ─── selection helpers ────────────────────────────────────────────────

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const allVisibleSelected = paged.every((s) => prev.has(s.id));
      const next = new Set(prev);
      if (allVisibleSelected) {
        paged.forEach((s) => next.delete(s.id));
      } else {
        paged.forEach((s) => next.add(s.id));
      }
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());

  // ─── actions ──────────────────────────────────────────────────────────

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortOrder("desc");
    }
  };

  const handleToggleActive = (s: SourceRow) => {
    updateMutation.mutate(
      { sourceId: s.id, data: { active: !s.active } },
      {
        onError: (err) => toast.error(getErrorMessage(err)),
      }
    );
  };

  const handleToggleTrust = (s: SourceRow) => {
    updateMutation.mutate(
      { sourceId: s.id, data: { trust_score: s.trusted ? 0.4 : 0.85 } },
      {
        onSuccess: () => toast.success(t(s.trusted ? "sources.toasts.untrusted" : "sources.toasts.trusted")),
        onError: (err) => toast.error(getErrorMessage(err)),
      }
    );
  };

  const handleDelete = (s: SourceRow) => {
    if (!confirm(t("sources.confirm.deleteOne", { name: s.name }))) return;
    deleteMutation.mutate(s.id, {
      onSuccess: () => toast.success(t("sources.toasts.deleted")),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  };

  const handleBulk = (action: Parameters<typeof bulkMutation.mutate>[0]["action"]) => {
    if (selectedIds.size === 0) return;
    if (action === "delete" && !confirm(t("sources.confirm.deleteMany", { count: selectedIds.size }))) return;
    bulkMutation.mutate(
      { action, source_ids: Array.from(selectedIds) },
      {
        onSuccess: (res) => {
          toast.success(res.message);
          clearSelection();
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      }
    );
  };

  const handleRefresh = () => {
    refetch();
  };

  const handleExportCsv = () => {
    if (sorted.length === 0) {
      toast.error(t("sources.toasts.noDataExport"));
      return;
    }
    const rows: CsvRow[] = sorted.map((s) => ({
      name: s.name,
      base_url: s.baseUrl,
      type: s.type,
      active: s.active,
      trusted: s.trusted,
      trust_score: s.trustScore,
      country: s.country ?? "",
      language: s.language ?? "",
      mentions: s.mentionCount,
      total_reach: s.totalReach,
      avg_sentiment: s.avgSentiment,
      last_published_at: s.lastPublishedAt ? s.lastPublishedAt.toISOString() : "",
      last_crawled_at: s.lastCrawledAt ? s.lastCrawledAt.toISOString() : "",
    }));
    downloadCsv(buildCsvFilename("sources", projectId), rows);
    toast.success(t("sources.toasts.exported"));
  };

  const handleAddSubmit = () => {
    const name = addForm.name.trim();
    let url = addForm.base_url.trim();
    if (!name || !url) {
      toast.error(t("sources.toasts.fillRequired"));
      return;
    }
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

    createMutation.mutate(
      {
        name,
        base_url: url,
        type: addForm.type,
        country: addForm.country.trim() || undefined,
        language: addForm.language.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success(t("sources.toasts.added"));
          setAddOpen(false);
          setAddForm({ name: "", base_url: "", type: "news", country: "", language: "" });
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      }
    );
  };

  const handleAttachSubmit = () => {
    attachMutation.mutate(
      {
        languages: attachLangs.length ? attachLangs : undefined,
        countries: attachCountries.length ? attachCountries : undefined,
        active_only: true,
        limit: attachLimit,
      },
      {
        onSuccess: (res) => {
          toast.success(
            t("sources.toasts.attached", { created: res.created, matched: res.matched })
          );
          setAttachOpen(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      }
    );
  };

  const sortIcon = (key: SortKey) => {
    if (sortBy !== key) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  // ─── render ───────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const allVisibleSelected = paged.length > 0 && paged.every((s) => selectedIds.has(s.id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Globe className="h-7 w-7 text-primary" />
            {t("sources.title")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("sources.subtitle")}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefetching}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isRefetching && "animate-spin")} />
            {t("sources.actions.refresh")}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            <Download className="h-4 w-4 mr-2" />
            {t("sources.actions.exportCsv")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAttachOpen(true)}>
            <ListPlus className="h-4 w-4 mr-2" />
            {t("sources.actions.attachCatalog")}
          </Button>
          <Button size="sm" className="glow-sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t("sources.addSource")}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Globe className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">{t("sources.stats.total")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.active}</p>
                  <p className="text-xs text-muted-foreground">{t("sources.stats.active")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Shield className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.trusted}</p>
                  <p className="text-xs text-muted-foreground">{t("sources.stats.trusted")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <ArrowUp className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums">{fmtCompact(stats.mentions)}</p>
                  <p className="text-xs text-muted-foreground">{t("sources.stats.totalMentions")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts */}
      {sources.length > 0 && (
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="glass lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">{t("sources.charts.topSources")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ReactECharts option={topSourcesBar} style={{ height: 280 }} opts={{ renderer: "svg" }} />
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">{t("sources.charts.byType")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ReactECharts option={typesDonut} style={{ height: 280 }} opts={{ renderer: "svg" }} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="glass">
        <CardContent className="p-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("sources.filters.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder={t("sources.filters.type")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("sources.filters.allTypes")}</SelectItem>
                {(uniqueTypes.length ? uniqueTypes : TYPE_OPTIONS).map((tp) => (
                  <SelectItem key={tp} value={tp}>{tp}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={activeFilter} onValueChange={(v) => { setActiveFilter(v); setPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder={t("sources.filters.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("sources.filters.allStatus")}</SelectItem>
                <SelectItem value="active">{t("sources.filters.activeOnly")}</SelectItem>
                <SelectItem value="inactive">{t("sources.filters.inactiveOnly")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={trustedFilter} onValueChange={(v) => { setTrustedFilter(v); setPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder={t("sources.filters.trust")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("sources.filters.allTrust")}</SelectItem>
                <SelectItem value="trusted">{t("sources.filters.trustedOnly")}</SelectItem>
                <SelectItem value="untrusted">{t("sources.filters.untrustedOnly")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={countryFilter} onValueChange={(v) => { setCountryFilter(v); setPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder={t("sources.filters.country")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("sources.filters.allCountries")}</SelectItem>
                {uniqueCountries.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={languageFilter} onValueChange={(v) => { setLanguageFilter(v); setPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder={t("sources.filters.language")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("sources.filters.allLanguages")}</SelectItem>
                {uniqueLanguages.map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <Card className="glass border-primary/40">
          <CardContent className="p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              <span className="font-medium">{selectedIds.size}</span>{" "}
              {t("sources.bulk.selected")}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => handleBulk("activate")} disabled={bulkMutation.isPending}>
                <CheckCircle className="h-4 w-4 mr-2" />
                {t("sources.bulk.activate")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleBulk("deactivate")} disabled={bulkMutation.isPending}>
                {t("sources.bulk.deactivate")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleBulk("mark_trusted")} disabled={bulkMutation.isPending}>
                <Shield className="h-4 w-4 mr-2" />
                {t("sources.bulk.markTrusted")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleBulk("unmark_trusted")} disabled={bulkMutation.isPending}>
                <ShieldOff className="h-4 w-4 mr-2" />
                {t("sources.bulk.unmarkTrusted")}
              </Button>
              <Button variant="destructive" size="sm" onClick={() => handleBulk("delete")} disabled={bulkMutation.isPending}>
                <Trash2 className="h-4 w-4 mr-2" />
                {t("sources.bulk.delete")}
              </Button>
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                {t("sources.bulk.clear")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sources Table */}
      <Card className="glass">
        <CardContent className="p-0">
          {sorted.length === 0 ? (
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
                        onCheckedChange={toggleSelectAllVisible}
                      />
                    </th>
                    <th className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      <button onClick={() => handleSort("name")} className="inline-flex items-center gap-1 hover:text-foreground">
                        {t("sources.table.source")} {sortIcon("name")}
                      </button>
                    </th>
                    <th className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wide w-28">
                      <button onClick={() => handleSort("type")} className="inline-flex items-center gap-1 hover:text-foreground">
                        {t("sources.table.type")} {sortIcon("type")}
                      </button>
                    </th>
                    <th className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wide w-28 text-right">
                      <button onClick={() => handleSort("mentions")} className="inline-flex items-center gap-1 hover:text-foreground ml-auto">
                        {t("sources.table.mentions")} {sortIcon("mentions")}
                      </button>
                    </th>
                    <th className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wide w-24 text-right">
                      <button onClick={() => handleSort("reach")} className="inline-flex items-center gap-1 hover:text-foreground ml-auto">
                        {t("sources.table.reach")} {sortIcon("reach")}
                      </button>
                    </th>
                    <th className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wide w-24 text-center">
                      <button onClick={() => handleSort("trust")} className="inline-flex items-center gap-1 hover:text-foreground mx-auto">
                        {t("sources.table.trust")} {sortIcon("trust")}
                      </button>
                    </th>
                    <th className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wide w-32 text-right">
                      <button onClick={() => handleSort("lastPublished")} className="inline-flex items-center gap-1 hover:text-foreground ml-auto">
                        {t("sources.table.lastSeen")} {sortIcon("lastPublished")}
                      </button>
                    </th>
                    <th className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wide w-20 text-center">
                      {t("sources.table.status")}
                    </th>
                    <th className="p-4 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((s, index) => (
                    <motion.tr
                      key={s.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.02, 0.4) }}
                      className={cn(
                        "border-b border-border/30 hover:bg-muted/30 transition-colors",
                        !s.active && "opacity-60"
                      )}
                    >
                      <td className="p-4">
                        <Checkbox
                          checked={selectedIds.has(s.id)}
                          onCheckedChange={() => toggleSelected(s.id)}
                        />
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
                      <td className="p-4">
                        <Badge variant="outline" className={cn("capitalize text-xs", typeColors[s.type])}>
                          {s.type}
                        </Badge>
                      </td>
                      <td className="p-4 text-right tabular-nums font-medium">
                        {s.mentionCount.toLocaleString()}
                      </td>
                      <td className="p-4 text-right tabular-nums text-muted-foreground">
                        {fmtCompact(s.totalReach)}
                      </td>
                      <td className="p-4 text-center">
                        <span className={cn(
                          "text-sm font-semibold tabular-nums",
                          s.trusted ? "text-blue-500" : "text-muted-foreground"
                        )}>
                          {(s.trustScore * 10).toFixed(1)}
                        </span>
                      </td>
                      <td className="p-4 text-right text-xs text-muted-foreground">
                        {relativeTime(s.lastPublishedAt, t)}
                      </td>
                      <td className="p-4 text-center">
                        <Switch
                          checked={s.active}
                          onCheckedChange={() => handleToggleActive(s)}
                          disabled={updateMutation.isPending}
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
                              onClick={() => window.open(s.baseUrl, "_blank", "noopener,noreferrer")}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              {t("sources.actions.goToSite")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleTrust(s)}>
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
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(s)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t("sources.actions.delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-border/30 text-sm">
            <span className="text-muted-foreground">
              {t("sources.pagination.showing", {
                from: (safePage - 1) * PAGE_SIZE + 1,
                to: Math.min(safePage * PAGE_SIZE, sorted.length),
                total: sorted.length,
              })}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-3 text-xs tabular-nums">
                {safePage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Add Source Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{t("sources.dialogs.add.title")}</DialogTitle>
            <DialogDescription>{t("sources.dialogs.add.description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="src-name">{t("sources.dialogs.add.name")}</Label>
              <Input
                id="src-name"
                value={addForm.name}
                onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="TechCrunch"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="src-url">{t("sources.dialogs.add.baseUrl")}</Label>
              <Input
                id="src-url"
                value={addForm.base_url}
                onChange={(e) => setAddForm((f) => ({ ...f, base_url: e.target.value }))}
                placeholder="https://techcrunch.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("sources.dialogs.add.type")}</Label>
              <Select
                value={addForm.type}
                onValueChange={(v) => setAddForm((f) => ({ ...f, type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((tp) => (
                    <SelectItem key={tp} value={tp}>{tp}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="src-country">{t("sources.dialogs.add.country")}</Label>
                <Input
                  id="src-country"
                  value={addForm.country}
                  onChange={(e) => setAddForm((f) => ({ ...f, country: e.target.value.toUpperCase() }))}
                  placeholder="US"
                  maxLength={2}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="src-lang">{t("sources.dialogs.add.language")}</Label>
                <Input
                  id="src-lang"
                  value={addForm.language}
                  onChange={(e) => setAddForm((f) => ({ ...f, language: e.target.value.toLowerCase() }))}
                  placeholder="en"
                  maxLength={5}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleAddSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("sources.dialogs.add.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attach Catalog Dialog */}
      <Dialog open={attachOpen} onOpenChange={setAttachOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{t("sources.dialogs.attach.title")}</DialogTitle>
            <DialogDescription>{t("sources.dialogs.attach.description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label>{t("sources.dialogs.attach.languages")}</Label>
              <Input
                value={attachLangs.join(", ")}
                onChange={(e) =>
                  setAttachLangs(
                    e.target.value
                      .split(",")
                      .map((s) => s.trim().toLowerCase())
                      .filter(Boolean)
                  )
                }
                placeholder="en, ru, kk"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("sources.dialogs.attach.countries")}</Label>
              <Input
                value={attachCountries.join(", ")}
                onChange={(e) =>
                  setAttachCountries(
                    e.target.value
                      .split(",")
                      .map((s) => s.trim().toUpperCase())
                      .filter(Boolean)
                  )
                }
                placeholder="US, KZ, RU"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="att-limit">{t("sources.dialogs.attach.limit")}</Label>
              <Input
                id="att-limit"
                type="number"
                min={1}
                max={1000}
                value={attachLimit}
                onChange={(e) => setAttachLimit(Math.max(1, Math.min(1000, Number(e.target.value) || 100)))}
              />
            </div>
            <p className="text-xs text-muted-foreground">{t("sources.dialogs.attach.hint")}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttachOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleAttachSubmit} disabled={attachMutation.isPending}>
              {attachMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("sources.dialogs.attach.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
