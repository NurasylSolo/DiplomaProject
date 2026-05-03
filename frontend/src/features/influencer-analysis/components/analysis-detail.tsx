"use client";

import { Globe, Star, UserCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmtCompact } from "@/features/_shared";
import { useTranslation } from "@/hooks";
import { cn } from "@/lib/utils";
import type {
  InfluencerDto,
  InfluencerMentionDto,
} from "@/lib/api/services/influencers";
import { AnalysisMentionsTab } from "./analysis-mentions-tab";

interface AnalysisDetailProps {
  influencer: InfluencerDto | null;
  mentions: InfluencerMentionDto[];
  mentionsLoading: boolean;
}

function pct(n: number, total: number): number {
  if (!Number.isFinite(n) || total <= 0) return 0;
  return Math.round((n / total) * 100);
}

export function AnalysisDetail({
  influencer,
  mentions,
  mentionsLoading,
}: AnalysisDetailProps) {
  const { t } = useTranslation();

  if (!influencer) {
    return (
      <Card className="glass">
        <CardContent className="py-12 text-center space-y-2">
          <UserCheck className="h-10 w-10 text-muted-foreground/40 mx-auto" />
          <p className="text-sm text-muted-foreground">
            {t("influencerAnalysis.detail.noSelection", {
              defaultValue: "Select a voice from the ranking to see details",
            })}
          </p>
        </CardContent>
      </Card>
    );
  }

  const sd = influencer.sentiment_distribution || {
    positive: 0,
    neutral: 0,
    negative: 0,
  };
  const total =
    (sd.positive || 0) + (sd.neutral || 0) + (sd.negative || 0) || 1;
  const positivePct = pct(sd.positive, total);
  const neutralPct = pct(sd.neutral, total);
  const negativePct = Math.max(0, 100 - positivePct - neutralPct);

  const metrics = [
    {
      key: "mentions",
      label: t("influencerAnalysis.metrics.mentions", { defaultValue: "Mentions" }),
      value: influencer.mentions_count.toLocaleString(),
    },
    {
      key: "reach",
      label: t("influencerAnalysis.metrics.reach", { defaultValue: "Reach" }),
      value: fmtCompact(influencer.reach),
    },
    {
      key: "share",
      label: t("influencerAnalysis.metrics.shareOfVoice", {
        defaultValue: "Share of voice",
      }),
      value: `${influencer.share_of_voice.toFixed(1)}%`,
    },
    {
      key: "sentiment",
      label: t("influencerAnalysis.metrics.avgSentiment", {
        defaultValue: "Avg. sentiment",
      }),
      value: influencer.avg_sentiment.toFixed(2),
    },
  ];

  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <div className="flex items-start gap-4 flex-wrap">
          <Avatar className="h-14 w-14">
            <AvatarImage src={influencer.avatar} alt={influencer.display_name} />
            <AvatarFallback className="bg-primary/10 text-primary text-xl">
              {influencer.display_name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold truncate">
              {influencer.display_name}
            </h3>
            <p className="text-sm text-muted-foreground truncate">
              {influencer.handle}
            </p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <Badge variant="outline" className="capitalize text-[10px]">
                {t(`mentions.filters.sourceTypes.${influencer.platform}`, {
                  defaultValue: influencer.platform,
                })}
              </Badge>
              {influencer.country && (
                <Badge variant="outline" className="text-[10px] uppercase">
                  {influencer.country}
                </Badge>
              )}
              {influencer.base_url && (
                <a
                  href={influencer.base_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-primary inline-flex items-center gap-1 hover:underline ml-1"
                >
                  <Globe className="h-3 w-3" />
                  {t("influencerAnalysis.openSite", {
                    defaultValue: "Open site",
                  })}
                </a>
              )}
            </div>
          </div>

          <Badge className="text-base px-3 py-1.5" variant="outline">
            <Star className="h-4 w-4 mr-1 fill-amber-500 text-amber-500" />
            {influencer.influence_score.toFixed(0)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="overview">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">
              {t("influencerAnalysis.tabs.overview", { defaultValue: "Overview" })}
            </TabsTrigger>
            <TabsTrigger value="mentions">
              {t("influencerAnalysis.tabs.recentMentions", {
                defaultValue: "Recent mentions",
              })}
            </TabsTrigger>
            <TabsTrigger value="trends">
              {t("influencerAnalysis.tabs.trends", { defaultValue: "Trends" })}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {metrics.map((m) => (
                <div
                  key={m.key}
                  className="p-3 rounded-lg bg-muted/30 text-center"
                >
                  <p className="text-lg font-bold tabular-nums">{m.value}</p>
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                </div>
              ))}
            </div>

            <div>
              <h4 className="font-medium mb-2 text-sm">
                {t("influencerAnalysis.sentimentWhenMentioning", {
                  defaultValue: "Sentiment when mentioning brand",
                })}
              </h4>
              <div
                className={cn(
                  "flex h-3 rounded-full overflow-hidden",
                  total === 0 && "opacity-30"
                )}
              >
                <div
                  className="bg-emerald-500"
                  style={{ width: `${positivePct}%` }}
                />
                <div
                  className="bg-slate-400"
                  style={{ width: `${neutralPct}%` }}
                />
                <div
                  className="bg-red-500"
                  style={{ width: `${negativePct}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1.5 tabular-nums">
                <span>
                  {t("mentions.sentiment.positive")}: {positivePct}%
                </span>
                <span>
                  {t("mentions.sentiment.neutral")}: {neutralPct}%
                </span>
                <span>
                  {t("mentions.sentiment.negative")}: {negativePct}%
                </span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="mentions">
            <AnalysisMentionsTab
              mentions={mentions}
              isLoading={mentionsLoading}
            />
          </TabsContent>

          <TabsContent value="trends">
            <div className="grid grid-cols-2 gap-3">
              <InfoTile
                label={t("influencerAnalysis.trends.followers", {
                  defaultValue: "Followers (proxy)",
                })}
                value={fmtCompact(influencer.followers)}
              />
              <InfoTile
                label={t("influencerAnalysis.trends.trustScore", {
                  defaultValue: "Trust score",
                })}
                value={influencer.trust_score.toFixed(2)}
              />
              <InfoTile
                label={t("influencerAnalysis.trends.avgEngagement", {
                  defaultValue: "Avg. engagement",
                })}
                value={influencer.avg_engagement.toFixed(2)}
              />
              <InfoTile
                label={t("influencerAnalysis.trends.lastSeen", {
                  defaultValue: "Last seen",
                })}
                value={
                  influencer.last_seen
                    ? new Date(influencer.last_seen).toLocaleDateString()
                    : "—"
                }
              />
              {influencer.language && (
                <InfoTile
                  label={t("influencerAnalysis.trends.language", {
                    defaultValue: "Language",
                  })}
                  value={influencer.language.toUpperCase()}
                />
              )}
              {influencer.country && (
                <InfoTile
                  label={t("influencerAnalysis.trends.country", {
                    defaultValue: "Country",
                  })}
                  value={influencer.country.toUpperCase()}
                />
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg bg-muted/30">
      <p className="text-base font-semibold tabular-nums truncate">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
