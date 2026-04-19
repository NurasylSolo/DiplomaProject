import { apiClient } from "../client";
import type { DateRangeParams } from "./analytics";

/** Plutchik primary emotions — order is locked because UI grids depend on it. */
export const PLUTCHIK_EMOTIONS = [
  "joy",
  "trust",
  "fear",
  "surprise",
  "sadness",
  "disgust",
  "anger",
  "anticipation",
] as const;

export type EmotionKey = (typeof PLUTCHIK_EMOTIONS)[number];

export type EmotionScores = Record<EmotionKey, number>;

export interface EmotionDailyPoint extends EmotionScores {
  date: string;
}

export interface EmotionTopMention {
  id: string;
  title: string;
  url: string;
  source: string | null;
  score: number;
  sentiment_label: string;
  sentiment_score: number;
  published_at: string | null;
  language: string | null;
  country: string | null;
  reach: number;
}

export interface EmotionsAggregateResponse {
  averages: EmotionScores;
  total_analyzed: number;
  daily_timeline: EmotionDailyPoint[];
  top_per_emotion: Record<EmotionKey, EmotionTopMention[]>;
}

export interface EmotionsBackfillResponse {
  candidates: number;
  processed: number;
  updated: number;
  skipped: number;
  total_in_project: number;
}

export const emotionsApi = {
  /** Single round-trip aggregate for the Emotions page. */
  async aggregate(
    projectId: string,
    params: DateRangeParams = {}
  ): Promise<EmotionsAggregateResponse> {
    const response = await apiClient.get<EmotionsAggregateResponse>(
      `/projects/${projectId}/analytics/emotions`,
      { params }
    );
    return response.data;
  },

  /** Re-classify mentions whose stored emotions look empty / legacy. */
  async backfill(
    projectId: string,
    limit?: number
  ): Promise<EmotionsBackfillResponse> {
    const response = await apiClient.post<EmotionsBackfillResponse>(
      `/projects/${projectId}/emotions/backfill`,
      undefined,
      { params: limit ? { limit } : undefined }
    );
    return response.data;
  },
};
