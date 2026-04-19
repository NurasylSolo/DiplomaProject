"use client";

import { use, useEffect, useMemo, useState } from "react";
import { Loader2, Search, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  useAutoDiscoverTopics,
  useCreateTopic,
  useDeleteTopic,
  useProjectTopics,
  useReassignTopics,
  useSummarizeTopic,
  useTranslation,
  useUpdateTopic,
} from "@/hooks";
import { getErrorMessage } from "@/lib/api";
import {
  AutoDiscoverDialog,
  TopicCard,
  TopicDetail,
  TopicEditDialog,
  TopicsHeader,
} from "@/features/topics";
import type { TopicDto } from "@/lib/api/services/topics";

interface TopicsPageProps {
  params: Promise<{ projectId: string }>;
}

export default function TopicsPage({ params }: TopicsPageProps) {
  const { projectId } = use(params);
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: topics = [], isLoading, refetch, isRefetching } =
    useProjectTopics(projectId);
  const createMutation = useCreateTopic(projectId);
  const updateMutation = useUpdateTopic(projectId);
  const deleteMutation = useDeleteTopic(projectId);
  const discoverMutation = useAutoDiscoverTopics(projectId);
  const reassignMutation = useReassignTopics(projectId);
  const summarizeMutation = useSummarizeTopic(projectId);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<TopicDto | null>(null);
  const [discoverOpen, setDiscoverOpen] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTopic, setDetailTopic] = useState<TopicDto | null>(null);
  const [summary, setSummary] = useState<{
    topic_id: string;
    summary: string;
    mention_ids: string[];
  } | null>(null);

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

  useEffect(() => {
    setSummary(null);
  }, [detailTopic]);

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
      toast.success(t("topicsPage.toasts.discovered", { count: res.created }));
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TopicsHeader
        isRefetching={isRefetching}
        onRefresh={() => refetch()}
        onReassign={handleReassign}
        isReassignPending={reassignMutation.isPending}
        onAutoDiscover={() => setDiscoverOpen(true)}
        isDiscoverPending={discoverMutation.isPending}
        onCreate={() => {
          setEditing(null);
          setEditOpen(true);
        }}
      />

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
          {filteredTopics.map((topic, index) => (
            <TopicCard
              key={topic.id}
              projectId={projectId}
              topic={topic}
              index={index}
              onView={() => {
                setDetailTopic(topic);
                setDetailOpen(true);
              }}
              onEdit={() => {
                setEditing(topic);
                setEditOpen(true);
              }}
              onDelete={() => handleDelete(topic)}
            />
          ))}
        </div>
      )}

      <TopicEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        editing={editing}
        createMutation={createMutation}
        updateMutation={updateMutation}
      />

      <AutoDiscoverDialog
        open={discoverOpen}
        onOpenChange={setDiscoverOpen}
        isPending={discoverMutation.isPending}
        onConfirm={handleAutoDiscover}
      />

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
