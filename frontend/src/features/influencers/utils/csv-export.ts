import { buildCsvFilename, downloadCsv, type CsvRow } from "@/lib/csv";
import type { InfluencerDto } from "@/lib/api/services/influencers";

export function exportInfluencersCsv(
  projectId: string,
  influencers: InfluencerDto[]
): boolean {
  if (influencers.length === 0) return false;
  const rows: CsvRow[] = influencers.map((i) => ({
    name: i.display_name,
    handle: i.handle,
    platform: i.platform,
    base_url: i.base_url,
    country: i.country ?? "",
    language: i.language ?? "",
    mentions: i.mentions_count,
    reach: i.reach,
    share_of_voice_pct: i.share_of_voice,
    influence_score: i.influence_score,
    avg_sentiment: i.avg_sentiment,
    positive: i.sentiment_distribution?.positive ?? 0,
    neutral: i.sentiment_distribution?.neutral ?? 0,
    negative: i.sentiment_distribution?.negative ?? 0,
    last_seen: i.last_seen ?? "",
  }));
  downloadCsv(buildCsvFilename("influencers", projectId), rows);
  return true;
}
