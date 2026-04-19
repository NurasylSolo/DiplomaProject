"use client";

import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/hooks";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/features/_shared";
import type {
  EmotionKey,
  EmotionTopMention,
} from "@/lib/api/services/emotions";
import { EMOTION_META, metaFor } from "../utils/emotion-meta";

interface TopMentionsPerEmotionProps {
  topPerEmotion: Record<EmotionKey, EmotionTopMention[]> | undefined;
  /** When set, renders only this emotion's mentions in a tight list. */
  selected: EmotionKey | null;
}

/**
 * If no emotion is selected, show a 4-column grid with the top mention
 * for every emotion (compact). When the user clicks a card / breakdown
 * row to "drill in", switch to a single full-width list of the top-5
 * for that emotion.
 */
export function TopMentionsPerEmotion({
  topPerEmotion,
  selected,
}: TopMentionsPerEmotionProps) {
  const { t } = useTranslation();
  if (selected) {
    return <FocusedList emotion={selected} mentions={topPerEmotion?.[selected] ?? []} />;
  }
  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">
          {t("emotionsPage.topMentions.title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {EMOTION_META.map((meta) => {
            const items = topPerEmotion?.[meta.key] ?? [];
            const top = items[0];
            return (
              <div
                key={meta.key}
                className="rounded-lg border border-border/40 p-3 bg-muted/20"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{meta.emoji}</span>
                  <span
                    className="text-sm font-medium"
                    style={{ color: meta.color }}
                  >
                    {t(`emotionsPage.names.${meta.i18nKey}`, {
                      defaultValue: meta.key,
                    })}
                  </span>
                </div>
                {top ? (
                  <a
                    href={top.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block group"
                  >
                    <p className="text-xs font-medium line-clamp-3 group-hover:text-primary transition-colors">
                      {top.title}
                    </p>
                    <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
                      <span className="truncate">{top.source ?? "—"}</span>
                      <Badge
                        variant="outline"
                        className="ml-2 tabular-nums"
                        style={{ borderColor: meta.color, color: meta.color }}
                      >
                        {(top.score * 100).toFixed(0)}
                      </Badge>
                    </div>
                  </a>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {t("emotionsPage.topMentions.empty", {
                      defaultValue: "No mentions yet",
                    })}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function FocusedList({
  emotion,
  mentions,
}: {
  emotion: EmotionKey;
  mentions: EmotionTopMention[];
}) {
  const { t } = useTranslation();
  const meta = metaFor(emotion);
  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <span className="text-xl">{meta.emoji}</span>
          {t("emotionsPage.topMentions.focusedTitle", {
            emotion: t(`emotionsPage.names.${meta.i18nKey}`, {
              defaultValue: meta.key,
            }),
            defaultValue: "Top mentions for {{emotion}}",
          })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {mentions.length === 0 ? (
          <EmptyState
            message={t("emotionsPage.topMentions.empty", {
              defaultValue: "No mentions yet",
            })}
          />
        ) : (
          <div className="space-y-2">
            {mentions.map((m) => (
              <a
                key={m.id}
                href={m.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium line-clamp-2">{m.title}</p>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                </div>
                <div className="flex items-center justify-between mt-1.5 text-xs text-muted-foreground">
                  <span>
                    {m.source ?? "—"}
                    {m.published_at
                      ? ` · ${new Date(m.published_at).toLocaleDateString()}`
                      : ""}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        m.sentiment_label === "positive"
                          ? "border-green-500/30 text-green-500"
                          : m.sentiment_label === "negative"
                            ? "border-red-500/30 text-red-500"
                            : "border-gray-500/30 text-muted-foreground"
                      )}
                    >
                      {m.sentiment_label}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="tabular-nums"
                      style={{ borderColor: meta.color, color: meta.color }}
                    >
                      {(m.score * 100).toFixed(0)}
                    </Badge>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
