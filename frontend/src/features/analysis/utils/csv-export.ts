import { buildCsvFilename, downloadCsv, type CsvRow } from "@/lib/csv";
import { safeArray } from "@/features/_shared";
import type {
  SourceBreakdownItem,
  KeywordItem,
  LanguageItem,
  AnomalyEvent,
} from "@/lib/api/services/analytics";
import type { MentionsStats } from "@/lib/api/services/mentions";
import type { TimeSeriesData, GeoData } from "@/types";

export type AnalysisTabKey =
  | "overview"
  | "sentiment"
  | "keywords"
  | "sources"
  | "geo-lang"
  | "anomalies";

interface ExportContext {
  projectId: string;
  stats: MentionsStats | undefined;
  timeSeries: TimeSeriesData[] | undefined;
  keywords: KeywordItem[] | undefined;
  sources: SourceBreakdownItem[] | undefined;
  geo: GeoData[] | undefined;
  languages: LanguageItem[] | undefined;
  anomalies: AnomalyEvent[] | undefined;
  presenceScore: number;
}

/**
 * Build the CSV row set for a given Analysis tab. Returns null if there is
 * nothing meaningful to export (so caller can show a toast instead of
 * downloading an empty file).
 */
function rowsForTab(tabKey: AnalysisTabKey, ctx: ExportContext): { rows: CsvRow[]; prefix: string } {
  const {
    stats,
    timeSeries,
    keywords,
    sources,
    geo,
    languages,
    anomalies,
    presenceScore,
  } = ctx;

  switch (tabKey) {
    case "overview": {
      return {
        prefix: "analysis_overview",
        rows: [
          {
            metric: "Total Mentions",
            value: stats?.total_mentions ?? 0,
            change_pct: stats?.mentions_change_percentage ?? "",
          },
          {
            metric: "Total Reach",
            value: stats?.total_reach ?? 0,
            change_pct: stats?.reach_change_percentage ?? "",
          },
          {
            metric: "Positive %",
            value: stats?.positive_percentage ?? 0,
            change_pct: stats?.positive_change_percentage ?? "",
          },
          {
            metric: "Neutral %",
            value: stats?.neutral_percentage ?? 0,
            change_pct: "",
          },
          {
            metric: "Negative %",
            value: stats?.negative_percentage ?? 0,
            change_pct: stats?.negative_change_percentage ?? "",
          },
          { metric: "Presence Score", value: presenceScore, change_pct: "" },
        ],
      };
    }
    case "sentiment":
      return {
        prefix: "analysis_sentiment",
        rows: safeArray(timeSeries).map((p) => ({
          date: p.date,
          mentions: p.mentions,
          positive: p.positive ?? 0,
          neutral: p.neutral ?? 0,
          negative: p.negative ?? 0,
          reach: p.reach,
        })),
      };
    case "keywords":
      return {
        prefix: "analysis_keywords",
        rows: safeArray(keywords).map((k) => ({
          word: k.word,
          count: k.count,
          change_pct: k.change_pct,
          is_hashtag: k.is_hashtag,
        })),
      };
    case "sources":
      return {
        prefix: "analysis_sources",
        rows: safeArray(sources).map((s) => ({
          name: s.name,
          type: s.type,
          mentions: s.mentions_count,
          reach: s.reach,
          share_pct: s.share_pct,
          avg_sentiment: s.avg_sentiment,
          country: s.country ?? "",
          language: s.language ?? "",
          last_published_at: s.last_published_at ?? "",
          base_url: s.base_url,
        })),
      };
    case "geo-lang": {
      const geoRows = safeArray(geo).map((g) => ({
        country: g.country,
        country_code: (g as unknown as { country_code?: string }).country_code ?? "",
        mentions: g.mentions,
        reach: g.reach,
        positive: g.sentiment?.positive ?? 0,
        neutral: g.sentiment?.neutral ?? 0,
        negative: g.sentiment?.negative ?? 0,
      }));
      const langRows = safeArray(languages).map((l) => ({
        country: `[lang] ${l.name}`,
        country_code: l.language,
        mentions: l.count,
        reach: 0,
        positive: 0,
        neutral: 0,
        negative: 0,
      }));
      return { prefix: "analysis_geo_languages", rows: [...geoRows, ...langRows] };
    }
    case "anomalies":
      return {
        prefix: "analysis_anomalies",
        rows: safeArray(anomalies).map((e) => ({
          date: e.date,
          type: e.type,
          mentions: e.mentions,
          z_score: e.z_score,
        })),
      };
  }
}

/**
 * Run a CSV export for the given Analysis tab.
 * Returns true on success, false if there was nothing to export.
 */
export function exportAnalysisCsv(
  tabKey: AnalysisTabKey,
  ctx: ExportContext
): boolean {
  const { rows, prefix } = rowsForTab(tabKey, ctx);
  if (rows.length === 0) return false;
  downloadCsv(buildCsvFilename(prefix, ctx.projectId), rows);
  return true;
}
