"use client";

import Link from "next/link";
import {
  ChevronRight,
  ExternalLink,
  Loader2,
  Sparkles,
  Tags,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useTopicMentions, useTranslation } from "@/hooks";
import type { TopicDto } from "@/lib/api/services/topics";
import { sentimentPct, totalSentiment } from "../utils/sentiment";

interface TopicDetailProps {
  projectId: string;
  topic: TopicDto;
  summary: { topic_id: string; summary: string; mention_ids: string[] } | null;
  onSummarize: () => void;
  isSummarizing: boolean;
}

export function TopicDetail({
  projectId,
  topic,
  summary,
  onSummarize,
  isSummarizing,
}: TopicDetailProps) {
  const { t } = useTranslation();
  const { data: mentions = [], isLoading } = useTopicMentions(projectId, topic.id, 8);

  const total = totalSentiment(topic);
  const pct = sentimentPct(topic);
  const kws = topic.keywords || [];

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
        <div className="grid grid-cols-3 gap-3">
          <StatBlock
            label={t("topicsPage.metrics.mentions")}
            value={String(total)}
          />
          <StatBlock
            label={t("topicsPage.metrics.positive")}
            value={`${pct.positive}%`}
            valueClass="text-green-500"
          />
          <StatBlock
            label={t("topicsPage.metrics.negative")}
            value={`${pct.negative}%`}
            valueClass="text-red-500"
          />
        </div>

        {kws.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {kws.map((kw) => (
              <Badge key={kw} variant="secondary" className="text-xs">
                {kw}
              </Badge>
            ))}
          </div>
        )}

        <SummarySection
          projectId={projectId}
          summary={summary}
          isSummarizing={isSummarizing}
          onSummarize={onSummarize}
        />

        <TopMentionsSection
          projectId={projectId}
          topicId={topic.id}
          mentions={mentions}
          isLoading={isLoading}
        />
      </div>
    </>
  );
}

function StatBlock({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="p-3 rounded-lg bg-muted/30">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-2xl font-bold tabular-nums", valueClass)}>{value}</p>
    </div>
  );
}

function SummarySection({
  projectId,
  summary,
  isSummarizing,
  onSummarize,
}: {
  projectId: string;
  summary: { summary: string; mention_ids: string[] } | null;
  isSummarizing: boolean;
  onSummarize: () => void;
}) {
  const { t } = useTranslation();
  return (
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
  );
}

interface MentionItem {
  id: string;
  url: string;
  title: string;
  published_at?: string | null;
  sentiment_label?: string;
  sentiment_score: number;
}

function TopMentionsSection({
  projectId,
  topicId,
  mentions,
  isLoading,
}: {
  projectId: string;
  topicId: string;
  mentions: MentionItem[];
  isLoading: boolean;
}) {
  const { t } = useTranslation();
  return (
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
        href={`/projects/${projectId}/mentions?topic=${topicId}`}
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-3"
      >
        {t("topicsPage.detail.viewAllMentions")}
        <ChevronRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
