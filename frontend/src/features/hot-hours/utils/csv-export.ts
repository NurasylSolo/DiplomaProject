import { buildCsvFilename, downloadCsv, type CsvRow } from "@/lib/csv";
import type { HotHoursAggregate } from "@/lib/api/services/analytics";

/**
 * Flatten the heatmap into a CSV (one row per non-zero cell). The row
 * shape mirrors what the backend returned so the file pairs cleanly
 * with downstream BI tools.
 */
export function exportHotHoursCsv(
  projectId: string,
  data: HotHoursAggregate | undefined
): boolean {
  if (!data || !Array.isArray(data.cells) || data.cells.length === 0) {
    return false;
  }
  const rows: CsvRow[] = data.cells.map((c) => ({
    day_of_week: c.day,
    hour: c.hour,
    mentions: c.mentions,
    reach: c.reach,
    avg_sentiment: c.avg_sentiment,
    positive: c.positive,
    neutral: c.neutral,
    negative: c.negative,
    timezone: data.timezone,
  }));
  downloadCsv(buildCsvFilename("hot_hours", projectId), rows);
  return true;
}
