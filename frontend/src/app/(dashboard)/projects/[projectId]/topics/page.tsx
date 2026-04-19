"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Tags,
  Search,
  Plus,
  Sparkles,
  RefreshCw,
  MoreHorizontal,
  Eye,
  Trash2,
  ExternalLink,
  Loader2,
  Pencil,
  Wand2,
  X,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  useProjectTopics,
  useCreateTopic,
  useUpdateTopic,
  useDeleteTopic,
  useAutoDiscoverTopics,
  useReassignTopics,
  useSummarizeTopic,
  useTopicMentions,
  useTranslation,
} from "@/hooks";
import { getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";
import type { TopicDto } from "@/lib/api/services/topics";

interface TopicsPageProps {
  params: Promise<{ projectId: string }>;
}

function formatReach(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
  return String(num);
}

function totalSentiment(t: TopicDto): number {
  const sd = t.sentiment_distribution || {};
  return (
    Number(sd.positive ?? 0) + Number(sd.neutral ?? 0) + Number(sd.negative ?? 0)
  );
}

function sentimentPct(t: TopicDto): { positive: number; neutral: number; negative: number } {
  const total = totalSentiment(t) || 1;
  const sd = t.sentiment_distribution || {};
  return {
    positive: Math.round(((Number(sd.positive ?? 0)) / total) * 100),
    neutral: Math.round(((Number(sd.neutral ?? 0)) / total) * 100),
    negative: Math.round(((Number(sd.negative ?? 0)) / total) * 100),
  };
}

export default function TopicsPage({ params }: TopicsPageProps) {
  const { projectId } = use(params);
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: topics = [], isLoading, refetch, isRefetching } = useProjectTopics(projectId);
  const createMutation = useCreateTopic(projectId);
  const updateMutation = useUpdateTopic(projectId);
  const deleteMutation = useDeleteTopic(projectId);
  const discoverMutation = useAutoDiscoverTopics(projectId);
  const reassignMutation = useReassignTopics(projectId);
  const summarizeMutation = useSummarizeTopic(projectId);

  // ─── dialogs ─────────────────────────────────────────────────────────
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<TopicDto | null>(null);
  const [form, setForm] = useState({ name: "", description: "", keywordsRaw: "" });

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTopic, setDetailTopic] = useState<TopicDto | null>(null);
  const [summary, setSummary] = useState<{ topic_id: string; summary: string; mention_ids: string[] } | null>(null);

  const [discoverOpen, setDiscoverOpen] = useState(false);

  const filteredTopics = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return (topics || []).filter(
      (tp) =>
        !q ||
        tp.name.toLowerCase().includes(q) ||
        (tp.description || "").toLowerCase().includes(q) ||
        (tp.keywords || []).some((k) => k.toLowerCase().includes(q))
    );
  }, [topics, searchQuery]);

  // Reset form when editing changes
  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name || "",
        description: editing.description || "",
        keywordsRaw: (editing.keywords || []).join(", "),
      });
    } else {
      setForm({ name: "", description: "", keywordsRaw: "" });
    }
  }, [editing]);

  // Clear summary when changing detail topic
  useEffect(() => {
    setSummary(null);
  }, [detailTopic]);

  // ─── actions ─────────────────────────────────────────────────────────

  const handleSaveForm = async () => {
    const name = form.name.trim();
    if (!name) {
      toast.error(t("topicsPage.toasts.nameRequired"));
      return;
    }
    const keywords = form.keywordsRaw
      .split(/[,;|]/)
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      if (editing) {
        await updateMutation.mutateAsync({
          topicId: editing.id,
          data: {
            name,
            description: form.description.trim() || undefined,
            keywords,
          },
        });
        toast.success(t("topicsPage.toasts.updated"));
      } else {
        await createMutation.mutateAsync({
          name,
          description: form.description.trim() || undefined,
          keywords,
        });
        toast.success(t("topicsPage.toasts.created"));
      }
      setEditOpen(false);
      setEditing(null);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const handleDelete = async (topic: TopicDto) => {
    if (!confirm(t("topicsPage.confirm.delete", { name: topic.name }))) return;
    try {
      await deleteMutation.mutateAsync(topic.id);
      toast.success(t("topicsPage.toasts.deleted"));
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const handleAutoDiscover = async () => {
    try {
      const res = await discoverMutation.mutateAsync();
      toast.success(
        t("topicsPage.toasts.discovered", { count: res.created })
      );
      setDiscoverOpen(false);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const handleReassign = async () => {
    try {
      const res = await reassignMutation.mutateAsync();
      toast.success(
        t("topicsPage.toasts.reassigned", {
          reassigned: res.reassigned,
          unmatched: res.unmatched,
        })
      );
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const handleSummarize = async (topic: TopicDto) => {
    try {
      const res = await summarizeMutation.mutateAsync(topic.id);
      setSummary(res);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  // ─── render ──────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Tags className="h-7 w-7 text-primary" />
            {t("topics.title")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("topics.subtitle")}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw
              className={cn("h-4 w-4 mr-2", isRefetching && "animate-spin")}
            />
            {t("topicsPage.actions.refresh")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReassign}
            disabled={reassignMutation.isPending}
          >
            {reassignMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {t("topicsPage.actions.reassign")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDiscoverOpen(true)}
            disabled={discoverMutation.isPending}
          >
            <Wand2 className="h-4 w-4 mr-2" />
            {t("topicsPage.actions.autoDiscover")}
          </Button>
          <Button
            size="sm"
            className="glow-sm"
            onClick={() => {
              setEditing(null);
              setEditOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("topicsPage.actions.create")}
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card className="glass">
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("topicsPage.filters.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Topics List */}
      {filteredTopics.length === 0 ? (
        <Card className="glass">
          <CardContent className="p-12 text-center space-y-3">
            <Sparkles className="h-10 w-10 text-muted-foreground mx-auto" />
            <h3 className="font-display text-lg font-semibold">
              {topics.length === 0
                ? t("topicsPage.empty.noTopicsTitle")
                : t("topicsPage.empty.noMatchTitle")}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {topics.length === 0
                ? t("topicsPage.empty.noTopicsDescription")
                : t("topicsPage.empty.noMatchDescription")}
            </p>
            {topics.length === 0 && (
              <Button
                onClick={() => setDiscoverOpen(true)}
                className="glow-sm mt-2"
              >
                <Wand2 className="h-4 w-4 mr-2" />
                {t("topicsPage.actions.autoDiscover")}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredTopics.map((topic, index) => {
            const total = totalSentiment(topic);
            const pct = sentimentPct(topic);
            return (
              <motion.div
                key={topic.id}
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
                          {(topic.keywords || []).slice(0, 4).map((kw) => (
                            <Badge
                              key={kw}
                              variant="outline"
                              className="text-[10px] px-1.5 py-0"
                            >
                              {kw}
                            </Badge>
                          ))}
                          {(topic.keywords?.length || 0) > 4 && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0"
                            >
                              +{(topic.keywords?.length || 0) - 4}
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDetailTopic(topic);
                            setDetailOpen(true);
                          }}
                        >
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
                            <DropdownMenuItem
                              onClick={() => {
                                setEditing(topic);
                                setEditOpen(true);
                              }}
                            >
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
                              onClick={() => handleDelete(topic)}
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
          })}
        </div>
      )}

      {/* ── Edit / Create Dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? t("topicsPage.dialogs.edit.title")
                : t("topicsPage.dialogs.create.title")}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? t("topicsPage.dialogs.edit.description")
                : t("topicsPage.dialogs.create.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="topic-name">
                {t("topicsPage.dialogs.fields.name")}
              </Label>
              <Input
                id="topic-name"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="AI Innovation"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="topic-desc">
                {t("topicsPage.dialogs.fields.description")}
              </Label>
              <Textarea
                id="topic-desc"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder={t("topicsPage.dialogs.fields.descriptionPlaceholder")}
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="topic-kws">
                {t("topicsPage.dialogs.fields.keywords")}
              </Label>
              <Input
                id="topic-kws"
                value={form.keywordsRaw}
                onChange={(e) =>
                  setForm((f) => ({ ...f, keywordsRaw: e.target.value }))
                }
                placeholder="ai, gpt, openai, llm"
              />
              <p className="text-xs text-muted-foreground">
                {t("topicsPage.dialogs.fields.keywordsHint")}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSaveForm}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editing
                ? t("topicsPage.actions.save")
                : t("topicsPage.actions.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Auto-discover Dialog ── */}
      <Dialog open={discoverOpen} onOpenChange={setDiscoverOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-primary" />
              {t("topicsPage.dialogs.discover.title")}
            </DialogTitle>
            <DialogDescription>
              {t("topicsPage.dialogs.discover.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-300">
            {t("topicsPage.dialogs.discover.warning")}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiscoverOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleAutoDiscover}
              disabled={discoverMutation.isPending}
            >
              {discoverMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4 mr-2" />
              )}
              {t("topicsPage.dialogs.discover.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Detail Modal ── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[720px] max-h-[88vh] overflow-y-auto">
          {detailTopic && (
            <TopicDetail
              projectId={projectId}
              topic={detailTopic}
              summary={summary}
              onSummarize={() => handleSummarize(detailTopic)}
              isSummarizing={summarizeMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Topic Detail (separate component to use hook safely) ───────────────

function TopicDetail({
  projectId,
  topic,
  summary,
  onSummarize,
  isSummarizing,
}: {
  projectId: string;
  topic: TopicDto;
  summary: { topic_id: string; summary: string; mention_ids: string[] } | null;
  onSummarize: () => void;
  isSummarizing: boolean;
}) {
  const { t } = useTranslation();
  const { data: mentions = [], isLoading } = useTopicMentions(projectId, topic.id, 8);

  const total = totalSentiment(topic);
  const pct = sentimentPct(topic);

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Tags className="h-5 w-5 text-primary" />
          {topic.name}
        </DialogTitle>
        <DialogDescription>
          {topic.description || t("topicsPage.detail.noDescription")}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-5 mt-2">
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-muted/30">
            <p className="text-xs text-muted-foreground">
              {t("topicsPage.metrics.mentions")}
            </p>
            <p className="text-2xl font-bold tabular-nums">{total}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30">
            <p className="text-xs text-muted-foreground">
              {t("topicsPage.metrics.positive")}
            </p>
            <p className="text-2xl font-bold tabular-nums text-green-500">
              {pct.positive}%
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30">
            <p className="text-xs text-muted-foreground">
              {t("topicsPage.metrics.negative")}
            </p>
            <p className="text-2xl font-bold tabular-nums text-red-500">
              {pct.negative}%
            </p>
          </div>
        </div>

        {/* Keywords */}
        {(topic.keywords || []).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {topic.keywords!.map((kw) => (
              <Badge key={kw} variant="secondary" className="text-xs">
                {kw}
              </Badge>
            ))}
          </div>
        )}

        {/* AI Summary */}
        <div className="rounded-lg border border-border/50 p-3 bg-muted/20 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              {t("topicsPage.detail.aiSummary")}
            </h4>
            <Button size="sm" onClick={onSummarize} disabled={isSummarizing}>
              {isSummarizing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {summary
                ? t("topicsPage.actions.regenerateSummary")
                : t("topicsPage.actions.generateSummary")}
            </Button>
          </div>
          {summary ? (
            <p className="text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground">
              {summary.summary}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {t("topicsPage.detail.noSummaryYet")}
            </p>
          )}
          {summary && summary.mention_ids.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/30">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground mr-1">
                {t("topicsPage.detail.cited")} ({summary.mention_ids.length})
              </span>
              {summary.mention_ids.slice(0, 8).map((mid) => (
                <Link
                  key={mid}
                  href={`/projects/${projectId}/mentions?highlight=${mid}`}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded bg-primary/10 text-primary hover:bg-primary/20"
                >
                  m:{mid.slice(0, 6)}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Top mentions */}
        <div>
          <h4 className="font-medium text-sm mb-2">
            {t("topicsPage.detail.topMentions")}
          </h4>
          {isLoading ? (
            <div className="py-6 text-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground inline" />
            </div>
          ) : mentions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {t("topicsPage.detail.noMentions")}
            </p>
          ) : (
            <div className="space-y-2">
              {mentions.map((m) => (
                <a
                  key={m.id}
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium line-clamp-2">{m.title}</p>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  </div>
                  <div className="flex items-center justify-between mt-1.5 text-xs text-muted-foreground">
                    <span>
                      {m.published_at
                        ? new Date(m.published_at).toLocaleDateString()
                        : ""}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        m.sentiment_label === "positive"
                          ? "border-green-500/30 text-green-500"
                          : m.sentiment_label === "negative"
                          ? "border-red-500/30 text-red-500"
                          : "border-gray-500/30 text-muted-foreground"
                      )}
                    >
                      {m.sentiment_label} ({Math.round(m.sentiment_score * 100)})
                    </Badge>
                  </div>
                </a>
              ))}
            </div>
          )}
          <Link
            href={`/projects/${projectId}/mentions?topic=${topic.id}`}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-3"
          >
            {t("topicsPage.detail.viewAllMentions")}
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </>
  );
}
