import type { InfluencerDto } from "@/lib/api/services/influencers";

type Translator = (key: string, options?: Record<string, unknown>) => string;

export function influencerSentimentPct(inf: InfluencerDto) {
  const sd = inf.sentiment_distribution || {
    positive: 0,
    neutral: 0,
    negative: 0,
  };
  const total =
    (sd.positive || 0) + (sd.neutral || 0) + (sd.negative || 0) || 1;
  return {
    positive: Math.round(((sd.positive || 0) / total) * 100),
    neutral: Math.round(((sd.neutral || 0) / total) * 100),
    negative: Math.round(((sd.negative || 0) / total) * 100),
  };
}

/** Human-readable "5m ago" / "3d ago" timestamp localised by i18next. */
export function lastSeenAgo(
  iso: string | null | undefined,
  t: Translator
): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return t("sources.relative.justNow");
  const min = Math.floor(sec / 60);
  if (min < 60) return t("sources.relative.minutesAgo", { count: min });
  const hr = Math.floor(min / 60);
  if (hr < 24) return t("sources.relative.hoursAgo", { count: hr });
  const day = Math.floor(hr / 24);
  if (day < 30) return t("sources.relative.daysAgo", { count: day });
  return d.toLocaleDateString();
}
