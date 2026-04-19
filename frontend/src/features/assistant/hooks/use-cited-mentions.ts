"use client";

import { useMemo } from "react";
import { useMentionsByIds } from "@/hooks";
import type { ChatMessageDto } from "@/lib/api/services/ai";
import type { Mention } from "@/types";
import { extractCitationIds } from "../utils/format";

/**
 * Collect every cited mention id from all assistant messages, resolve them
 * to full Mention objects in a single batch request, and expose a Map
 * suitable for click-through citation rendering.
 */
export function useCitedMentions(
  projectId: string,
  visibleMessages: ChatMessageDto[]
): Map<string, Mention> {
  const allCitedIds = useMemo(() => {
    const set = new Set<string>();
    visibleMessages.forEach((m) => {
      if (m.role !== "assistant") return;
      // 1) Explicit citations resolved by the backend.
      ((m.metadata?.cited_mention_ids ?? []) as string[]).forEach((id) =>
        set.add(id)
      );
      // 2) Whole RAG pool — load these too so that short [m:abc123] tokens
      //    in the text can be resolved via `startsWith` even if the backend
      //    couldn't resolve them to citations.
      (
        (m.metadata?.retrieved_mention_ids ?? []) as string[]
      ).forEach((id) => set.add(id));
      // 3) Fallback: any [m:...] tokens that ended up in the raw text.
      extractCitationIds(m.content || "").forEach((id) => set.add(id));
    });
    return Array.from(set);
  }, [visibleMessages]);

  // Only fetch full UUIDs (>= 30 chars). Short prefixes will be resolved
  // client-side from already-loaded full-id mentions.
  const fullCitedIds = useMemo(
    () => allCitedIds.filter((x) => x.length >= 30),
    [allCitedIds]
  );

  const { data: citedMentions = [] } = useMentionsByIds(projectId, fullCitedIds);

  return useMemo(() => {
    const map = new Map<string, Mention>();
    citedMentions.forEach((m) => map.set(m.id, m));
    return map;
  }, [citedMentions]);
}
