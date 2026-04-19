import { buildCsvFilename, downloadCsv, type CsvRow } from "@/lib/csv";
import type { EmotionsAggregateResponse } from "@/lib/api/services/emotions";
import { PLUTCHIK_EMOTIONS } from "./emotion-meta";

export function exportEmotionsCsv(
  projectId: string,
  data: EmotionsAggregateResponse | undefined
): boolean {
  if (!data) return false;

  const rows: CsvRow[] = [];

  // ── Section 1: averages
  rows.push({ section: "averages", date: "", emotion: "", value: "" });
  for (const key of PLUTCHIK_EMOTIONS) {
    rows.push({
      section: "averages",
      date: "",
      emotion: key,
      value: data.averages[key] ?? 0,
    });
  }

  // ── Section 2: daily timeline (one row per day per emotion)
  for (const point of data.daily_timeline ?? []) {
    for (const key of PLUTCHIK_EMOTIONS) {
      rows.push({
        section: "timeline",
        date: point.date,
        emotion: key,
        value: point[key] ?? 0,
      });
    }
  }

  // ── Section 3: top per emotion
  for (const key of PLUTCHIK_EMOTIONS) {
    for (const m of data.top_per_emotion?.[key] ?? []) {
      rows.push({
        section: "top",
        date: m.published_at ?? "",
        emotion: key,
        value: m.score,
        title: m.title,
        source: m.source ?? "",
        url: m.url,
      });
    }
  }

  if (rows.length === 0) return false;
  downloadCsv(buildCsvFilename("emotions", projectId), rows);
  return true;
}
