"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { SafeECharts as ReactECharts } from "@/components/ui/safe-echarts";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  ExternalLink,
  Eye,
  Globe,
  Hash,
  Languages as LanguagesIcon,
  Link2,
  MessageCircle,
  PieChart,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks";
import { EmptyState, fmtCompact, safeArray } from "@/features/_shared";
import type {
  AnomalyEvent,
  KeywordItem,
  LanguageItem,
  SourceBreakdownItem,
  TopLinkItem,
} from "@/lib/api/services/analytics";
import type { GeoData, TimeSeriesData } from "@/types";

// Loose Topic shape — same as in chart-options.ts. Topics that come back
// from /analytics/topics may use snake_case or camelCase for sentiment
// distribution and have optional fields, so we don't reuse the strict
// `Topic` type from /types here.
type TopicLike = {
  id?: string;
  name?: string;
  sentiment_distribution?: { positive?: number; neutral?: number; negative?: number };
  sentimentDistribution?: { positive?: number; neutral?: number; negative?: number };
};
import type { MentionsFilters } from "@/stores/use-mentions-filter-store";

type SetDateRange = (dateRange: MentionsFilters["dateRange"]) => void;
import { KpiCard } from "./kpi-card";

// One ECharts option object — typed loosely on purpose; the builders return
// many different chart shapes and ECharts itself accepts an open object.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChartOption = Record<string, any>;

// Top-positive / top-negative items use a few denormalized fields from the
// mentions list response. Tight typing requires fully importing the
// (large) Mention type, so this matches what the page already accessed.
interface MentionListItem {
  id: string;
  url: string;
  title: string;
  source?: { name?: string } | null;
  sentimentScore?: number;
}

interface OverviewProps {
  projectId: string;
  totalMentions: number;
  totalReach: number;
  positivePct: number;
  presenceScore: number;
  stats: {
    mentions_change_percentage?: number | null;
    reach_change_percentage?: number | null;
    positive_change_percentage?: number | null;
  } | undefined;
  sentimentDonut: ChartOption;
  presenceGauge: ChartOption;
  sparklineOption: ChartOption;
  sourcesBarOption: ChartOption;
  languagesPie: ChartOption;
  timeSeries: TimeSeriesData[] | undefined;
  sources: SourceBreakdownItem[] | undefined;
  languages: LanguageItem[] | undefined;
}

export function OverviewTab({
  projectId,
  totalMentions,
  totalReach,
  positivePct,
  presenceScore,
  stats,
  sentimentDonut,
  presenceGauge,
  sparklineOption,
  sourcesBarOption,
  languagesPie,
  timeSeries,
  sources,
  languages,
}: OverviewProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label={t("analysis.kpi.totalMentions")}
          value={fmtCompact(totalMentions)}
          change={stats?.mentions_change_percentage}
          icon={MessageCircle}
          delay={0}
        />
        <KpiCard
          label={t("analysis.kpi.totalReach")}
          value={fmtCompact(totalReach)}
          change={stats?.reach_change_percentage}
          icon={Eye}
          delay={0.05}
        />
        <KpiCard
          label={t("analysis.kpi.positive")}
          value={`${positivePct}%`}
          change={stats?.positive_change_percentage}
          icon={PieChart}
          delay={0.1}
        />
        <KpiCard
          label={t("analysis.kpi.presenceScore")}
          value={presenceScore.toFixed(1)}
          change={null}
          icon={Activity}
          delay={0.15}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">
              {t("analysis.sections.sentimentDistribution")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {totalMentions === 0 ? (
              <EmptyState message={t("analysis.empty.noMentions")} />
            ) : (
              <ReactECharts
                option={sentimentDonut}
                style={{ height: 220 }}
                opts={{ renderer: "svg" }}
              />
            )}
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">
              {t("analysis.sections.presenceScore")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ReactECharts
              option={presenceGauge}
              style={{ height: 200 }}
              opts={{ renderer: "svg" }}
            />
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center justify-between">
              <span>{t("analysis.sections.dailyMentions")}</span>
              <Badge variant="secondary" className="text-[10px]">
                {safeArray(timeSeries).length} {t("analysis.kpi.days")}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {safeArray(timeSeries).length === 0 ? (
              <EmptyState message={t("analysis.empty.noData")} />
            ) : (
              <ReactECharts
                option={sparklineOption}
                style={{ height: 200 }}
                opts={{ renderer: "svg" }}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="glass lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center justify-between">
              <span>{t("analysis.sections.topSources")}</span>
              <Link
                href={`/projects/${projectId}/sources`}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                {t("analysis.actions.viewAll")} <ChevronRight className="h-3 w-3" />
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {safeArray(sources).length === 0 ? (
              <EmptyState message={t("analysis.empty.noData")} />
            ) : (
              <ReactECharts
                option={sourcesBarOption}
                style={{ height: 280 }}
                opts={{ renderer: "svg" }}
              />
            )}
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <LanguagesIcon className="h-4 w-4" />
              {t("analysis.sections.languages")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {safeArray(languages).length === 0 ? (
              <EmptyState message={t("analysis.empty.noData")} />
            ) : (
              <ReactECharts
                option={languagesPie}
                style={{ height: 280 }}
                opts={{ renderer: "svg" }}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface SentimentTabProps {
  sentimentByTopicBar: ChartOption;
  dailyStackedArea: ChartOption;
  topics: TopicLike[] | undefined;
  timeSeries: TimeSeriesData[] | undefined;
  topPositive: { items?: MentionListItem[] } | undefined;
  topNegative: { items?: MentionListItem[] } | undefined;
}

export function SentimentTab({
  sentimentByTopicBar,
  dailyStackedArea,
  topics,
  timeSeries,
  topPositive,
  topNegative,
}: SentimentTabProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">
              {t("analysis.sections.sentimentByTopic")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {safeArray(topics).length === 0 ? (
              <EmptyState message={t("analysis.empty.noTopics")} />
            ) : (
              <ReactECharts
                option={sentimentByTopicBar}
                style={{ height: 320 }}
                opts={{ renderer: "svg" }}
              />
            )}
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">
              {t("analysis.sections.dailySentiment")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {safeArray(timeSeries).length === 0 ? (
              <EmptyState message={t("analysis.empty.noData")} />
            ) : (
              <ReactECharts
                option={dailyStackedArea}
                style={{ height: 320 }}
                opts={{ renderer: "svg" }}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <ArticleList
          title={t("analysis.sections.topPositive")}
          icon={<ArrowUpRight className="h-4 w-4" />}
          accentClass="text-green-500"
          items={safeArray(topPositive?.items)}
          badgeClass="border-green-500/30 text-green-500"
          emptyMessage={t("analysis.empty.noMentions")}
        />
        <ArticleList
          title={t("analysis.sections.topNegative")}
          icon={<ArrowDownRight className="h-4 w-4" />}
          accentClass="text-red-500"
          items={safeArray(topNegative?.items)}
          badgeClass="border-red-500/30 text-red-500"
          emptyMessage={t("analysis.empty.noMentions")}
        />
      </div>
    </div>
  );
}

function ArticleList({
  title,
  icon,
  accentClass,
  badgeClass,
  items,
  emptyMessage,
}: {
  title: string;
  icon: React.ReactNode;
  accentClass: string;
  badgeClass: string;
  items: MentionListItem[];
  emptyMessage: string;
}) {
  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <CardTitle
          className={cn("text-base font-medium flex items-center gap-2", accentClass)}
        >
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <EmptyState message={emptyMessage} />
        ) : (
          items.map((m) => (
            <a
              key={m.id}
              href={m.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start gap-2 justify-between">
                <p className="text-sm font-medium line-clamp-2">{m.title}</p>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
              </div>
              <div className="flex items-center justify-between mt-1.5 text-xs text-muted-foreground">
                <span>{m.source?.name || "—"}</span>
                <Badge variant="outline" className={badgeClass}>
                  {Math.round((m.sentimentScore ?? 0) * 100)}
                </Badge>
              </div>
            </a>
          ))
        )}
      </CardContent>
    </Card>
  );
}

interface KeywordsTabProps {
  keywords: KeywordItem[] | undefined;
  links: TopLinkItem[] | undefined;
}

export function KeywordsTab({ keywords, links }: KeywordsTabProps) {
  const { t } = useTranslation();
  const allKw = safeArray(keywords);
  const max = allKw.length ? Math.max(...allKw.map((x) => x.count)) : 0;
  const min = allKw.length ? Math.min(...allKw.map((x) => x.count)) : 0;
  const range = max - min || 1;

  return (
    <div className="space-y-6">
      <Card className="glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Hash className="h-4 w-4" />
            {t("analysis.sections.wordCloud")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allKw.length === 0 ? (
            <EmptyState message={t("analysis.empty.noKeywords")} />
          ) : (
            <div className="flex flex-wrap gap-2 justify-center py-6">
              {allKw.slice(0, 60).map((k) => {
                const size = 12 + Math.round(((k.count - min) / range) * 22);
                return (
                  <span
                    key={k.word}
                    className="px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors cursor-default"
                    style={{ fontSize: `${size}px` }}
                    title={`${k.word} · ${k.count} (${k.change_pct >= 0 ? "+" : ""}${k.change_pct}%)`}
                  >
                    {k.word}
                  </span>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Hash className="h-4 w-4" />
              {t("analysis.sections.topHashtags")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {allKw.filter((k) => k.is_hashtag).length === 0 ? (
              <EmptyState message={t("analysis.empty.noHashtags")} />
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {allKw
                  .filter((k) => k.is_hashtag)
                  .slice(0, 10)
                  .map((k) => (
                    <div
                      key={k.word}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                    >
                      <div>
                        <p className="font-medium text-primary text-sm">{k.word}</p>
                        <p className="text-xs text-muted-foreground">
                          {k.count.toLocaleString()} {t("analysis.kpi.mentionsLower")}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          k.change_pct >= 0
                            ? "border-green-500/30 text-green-500"
                            : "border-red-500/30 text-red-500"
                        }
                      >
                        {k.change_pct >= 0 ? "+" : ""}
                        {k.change_pct}%
                      </Badge>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              {t("analysis.sections.topLinks")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {safeArray(links).length === 0 ? (
              <EmptyState message={t("analysis.empty.noLinks")} />
            ) : (
              <div className="space-y-2">
                {safeArray(links)
                  .slice(0, 10)
                  .map((l) => (
                    <a
                      key={l.url}
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">
                          {l.domain || l.url}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {l.url}
                        </p>
                      </div>
                      <Badge variant="secondary" className="ml-2 flex-shrink-0">
                        {l.count}×
                      </Badge>
                    </a>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface SourcesTabProps {
  sources: SourceBreakdownItem[] | undefined;
  sourcesBarOption: ChartOption;
  sourceTypeDonut: ChartOption;
}

export function SourcesTab({
  sources,
  sourcesBarOption,
  sourceTypeDonut,
}: SourcesTabProps) {
  const { t } = useTranslation();
  const items = safeArray(sources);
  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="glass lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">
              {t("analysis.sections.activeSources")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <EmptyState message={t("analysis.empty.noData")} />
            ) : (
              <ReactECharts
                option={sourcesBarOption}
                style={{ height: 380 }}
                opts={{ renderer: "svg" }}
              />
            )}
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">
              {t("analysis.sections.sourcesByType")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <EmptyState message={t("analysis.empty.noData")} />
            ) : (
              <ReactECharts
                option={sourceTypeDonut}
                style={{ height: 280 }}
                opts={{ renderer: "svg" }}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">
            {t("analysis.sections.sourcesTable")}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {items.length === 0 ? (
            <EmptyState message={t("analysis.empty.noData")} />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground uppercase">
                  <th className="p-3">{t("analysis.kpi.source")}</th>
                  <th className="p-3">{t("analysis.kpi.type")}</th>
                  <th className="p-3 text-right">{t("analysis.kpi.mentions")}</th>
                  <th className="p-3 text-right">{t("analysis.kpi.reach")}</th>
                  <th className="p-3 text-right">{t("analysis.kpi.share")}</th>
                  <th className="p-3 text-right">{t("analysis.kpi.lastSeen")}</th>
                </tr>
              </thead>
              <tbody>
                {items.slice(0, 25).map((s) => (
                  <tr
                    key={s.source_id}
                    className="border-t border-border/30 hover:bg-muted/20"
                  >
                    <td className="p-3">
                      <div className="font-medium">{s.name}</div>
                      {s.base_url && (
                        <a
                          href={s.base_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:text-primary truncate max-w-[260px] inline-block"
                        >
                          {s.base_url.replace(/^https?:\/\//, "")}
                        </a>
                      )}
                    </td>
                    <td className="p-3">
                      <Badge variant="secondary" className="text-[10px] uppercase">
                        {s.type}
                      </Badge>
                    </td>
                    <td className="p-3 text-right tabular-nums font-medium">
                      {s.mentions_count.toLocaleString()}
                    </td>
                    <td className="p-3 text-right tabular-nums text-muted-foreground">
                      {fmtCompact(s.reach)}
                    </td>
                    <td className="p-3 text-right tabular-nums">{s.share_pct}%</td>
                    <td className="p-3 text-right text-xs text-muted-foreground">
                      {s.last_published_at
                        ? new Date(s.last_published_at).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface GeoLangTabProps {
  projectId: string;
  geo: GeoData[] | undefined;
  languages: LanguageItem[] | undefined;
  languagesPie: ChartOption;
}

export function GeoLangTab({
  projectId,
  geo,
  languages,
  languagesPie,
}: GeoLangTabProps) {
  const { t } = useTranslation();
  const geoArr = safeArray(geo);
  const langArr = safeArray(languages);
  const max = geoArr.length ? Math.max(...geoArr.map((x) => x.mentions || 0)) || 1 : 1;

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                {t("analysis.sections.topCountries")}
              </span>
              <Link
                href={`/projects/${projectId}/geo`}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                {t("analysis.actions.openGeo")} <ChevronRight className="h-3 w-3" />
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {geoArr.length === 0 ? (
              <EmptyState message={t("analysis.empty.noGeo")} />
            ) : (
              <div className="space-y-2">
                {geoArr.slice(0, 8).map((g) => {
                  const code =
                    (g as unknown as { country_code?: string }).country_code ?? "";
                  const pct = Math.round(((g.mentions || 0) / max) * 100);
                  return (
                    <div key={code || g.country} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{g.country}</span>
                        <span className="text-muted-foreground tabular-nums">
                          {g.mentions} · {fmtCompact(g.reach)} {t("analysis.kpi.reachLower")}
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <LanguagesIcon className="h-4 w-4" />
              {t("analysis.sections.languages")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {langArr.length === 0 ? (
              <EmptyState message={t("analysis.empty.noData")} />
            ) : (
              <>
                <ReactECharts
                  option={languagesPie}
                  style={{ height: 240 }}
                  opts={{ renderer: "svg" }}
                />
                <div className="mt-4 space-y-1.5">
                  {langArr.map((l) => (
                    <div
                      key={l.language}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="text-muted-foreground">{l.name}</span>
                      <span className="font-medium tabular-nums">
                        {l.count.toLocaleString()} · {l.share_pct}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface AnomaliesTabProps {
  projectId: string;
  anomalies: AnomalyEvent[] | undefined;
  setDateRange: SetDateRange;
}

export function AnomaliesTab({
  projectId,
  anomalies,
  setDateRange,
}: AnomaliesTabProps) {
  const { t } = useTranslation();
  const router = useRouter();

  const handleClick = (e: AnomalyEvent) => {
    const day = new Date(e.date);
    if (Number.isNaN(day.getTime())) return;
    const from = new Date(day);
    from.setHours(0, 0, 0, 0);
    const to = new Date(day);
    to.setHours(23, 59, 59, 999);
    setDateRange({ from, to, preset: "custom" });
    router.push(`/projects/${projectId}/mentions`);
  };

  const items = safeArray(anomalies);

  return (
    <div className="space-y-6">
      <Card className="glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            {t("analysis.sections.anomaliesList")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <EmptyState message={t("analysis.empty.noEvents")} />
          ) : (
            <div className="space-y-2">
              {items.map((e) => (
                <button
                  key={`${e.date}-${e.type}`}
                  onClick={() => handleClick(e)}
                  className="w-full flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        e.type === "spike"
                          ? "bg-green-500/10 text-green-500"
                          : "bg-red-500/10 text-red-500"
                      )}
                    >
                      {e.type === "spike" ? (
                        <TrendingUp className="h-5 w-5" />
                      ) : (
                        <TrendingDown className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {e.type === "spike"
                          ? t("analysis.anomalies.spike")
                          : t("analysis.anomalies.drop")}{" "}
                        ·{" "}
                        <span className="text-muted-foreground font-normal">
                          {new Date(e.date).toLocaleDateString()}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {e.mentions} {t("analysis.kpi.mentionsLower")} · z = {e.z_score}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
