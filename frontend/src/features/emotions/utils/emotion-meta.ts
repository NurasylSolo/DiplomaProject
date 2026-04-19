import type { EmotionKey } from "@/lib/api/services/emotions";
import { PLUTCHIK_EMOTIONS } from "@/lib/api/services/emotions";

export interface EmotionMeta {
  key: EmotionKey;
  emoji: string;
  /** Hex colour used for charts and progress bars. */
  color: string;
  /** i18n key under `emotionsPage.names.*` for the localised label. */
  i18nKey: EmotionKey;
}

/**
 * Display metadata for the 8 Plutchik emotions. Order matches the
 * canonical wheel (joy → trust → fear → surprise → sadness → disgust →
 * anger → anticipation), which keeps the donut/legend visually
 * consistent and pairs neighbours that look similar on screen.
 */
export const EMOTION_META: EmotionMeta[] = [
  { key: "joy", emoji: "😊", color: "#FBBF24", i18nKey: "joy" },
  { key: "trust", emoji: "🤝", color: "#10B981", i18nKey: "trust" },
  { key: "fear", emoji: "😰", color: "#78716C", i18nKey: "fear" },
  { key: "surprise", emoji: "😮", color: "#EC4899", i18nKey: "surprise" },
  { key: "sadness", emoji: "😢", color: "#6366F1", i18nKey: "sadness" },
  { key: "disgust", emoji: "🤢", color: "#84CC16", i18nKey: "disgust" },
  { key: "anger", emoji: "😠", color: "#EF4444", i18nKey: "anger" },
  { key: "anticipation", emoji: "🤩", color: "#8B5CF6", i18nKey: "anticipation" },
];

export function metaFor(key: EmotionKey): EmotionMeta {
  return EMOTION_META.find((m) => m.key === key) ?? EMOTION_META[0];
}

export { PLUTCHIK_EMOTIONS };
export type { EmotionKey };
