import type { TopicDto } from "@/lib/api/services/topics";

export function totalSentiment(topic: TopicDto): number {
  const sd = topic.sentiment_distribution || {};
  return (
    Number(sd.positive ?? 0) + Number(sd.neutral ?? 0) + Number(sd.negative ?? 0)
  );
}

export function sentimentPct(topic: TopicDto): {
  positive: number;
  neutral: number;
  negative: number;
} {
  const total = totalSentiment(topic) || 1;
  const sd = topic.sentiment_distribution || {};
  return {
    positive: Math.round((Number(sd.positive ?? 0) / total) * 100),
    neutral: Math.round((Number(sd.neutral ?? 0) / total) * 100),
    negative: Math.round((Number(sd.negative ?? 0) / total) * 100),
  };
}
