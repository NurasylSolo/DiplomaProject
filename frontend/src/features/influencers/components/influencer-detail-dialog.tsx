"use client";

import { ExternalLink, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useInfluencerMentions, useTranslation } from "@/hooks";
import { fmtCompact } from "@/features/_shared";
import type { InfluencerDto } from "@/lib/api/services/influencers";
import { influencerSentimentPct } from "../utils/format";

interface InfluencerDetailDialogProps {
  projectId: string;
  influencer: InfluencerDto | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function InfluencerDetailDialog({
  projectId,
  influencer,
  open,
  onOpenChange,
}: InfluencerDetailDialogProps) {
  const { t } = useTranslation();
  const { data: mentions = [], isLoading } = useInfluencerMentions(
    projectId,
    influencer?.id ?? null,
    8
  );

  if (!influencer) return null;
  const pct = influencerSentimentPct(influencer);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={influencer.avatar} />
              <AvatarFallback className="bg-primary/10 text-primary text-lg">
                {(influencer.display_name || influencer.handle || "?")
                  .slice(0, 2)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate">{influencer.display_name}</p>
              <p className="text-sm font-normal text-muted-foreground truncate">
                {influencer.handle}{" "}
                <Badge variant="secondary" className="ml-2 capitalize text-[10px]">
                  {influencer.platform}
                </Badge>
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCell
              value={(influencer.mentions_count || 0).toLocaleString()}
              label={t("influencersPage.metrics.mentions")}
            />
            <StatCell
              value={fmtCompact(influencer.reach)}
              label={t("influencersPage.metrics.reach")}
            />
            <StatCell
              value={`${(influencer.share_of_voice || 0).toFixed(1)}%`}
              label={t("influencersPage.metrics.shareOfVoice")}
            />
            <StatCell
              value={influencer.influence_score.toFixed(1)}
              label={t("influencersPage.metrics.score")}
              valueClass="text-primary"
            />
          </div>

          <div>
            <h4 className="font-medium mb-3 text-sm">
              {t("influencersPage.detail.sentimentDistribution")}
            </h4>
            <div className="flex h-3 rounded-full overflow-hidden bg-muted">
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
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span className="text-green-500">
                {t("mentions.sentiments.positive")}: {pct.positive}%
              </span>
              <span>
                {t("mentions.sentiments.neutral")}: {pct.neutral}%
              </span>
              <span className="text-red-500">
                {t("mentions.sentiments.negative")}: {pct.negative}%
              </span>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-3 text-sm">
              {t("influencersPage.detail.recentPosts")}
            </h4>
            {isLoading ? (
              <div className="py-6 text-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground inline" />
              </div>
            ) : mentions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {t("influencersPage.detail.noMentions")}
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
                        {" · "}
                        {fmtCompact(m.reach)} {t("analysis.kpi.reachLower")}
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
          </div>

          {influencer.base_url && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() =>
                  window.open(influencer.base_url, "_blank", "noopener,noreferrer")
                }
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                {t("influencersPage.actions.openSite")}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatCell({
  value,
  label,
  valueClass,
}: {
  value: string;
  label: string;
  valueClass?: string;
}) {
  return (
    <div className="p-3 rounded-lg bg-muted/30 text-center">
      <p className={cn("text-2xl font-bold tabular-nums", valueClass)}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
