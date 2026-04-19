"use client";

import { useMemo } from "react";
import { ExternalLink } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Mention } from "@/types";
import {
  normalizeMentionUrl,
  openMentionUrl,
  splitTextWithCitations,
} from "../utils/format";

interface MessageBodyProps {
  text: string;
  mentionsById: Map<string, Mention>;
}

/**
 * Render assistant message text turning every `[m:abc12345]` token into a
 * clickable, tooltipped citation badge linking to the source article.
 *
 * Notes on the click handling:
 * - We render a plain `<a>` (NOT inside `TooltipTrigger asChild`) and put the
 *   tooltip beside it — Radix's `asChild` clones the child and its event
 *   binding sometimes intercepts clicks, sending the user nowhere.
 * - We always normalise `m.url` first; if it's empty or relative we fall
 *   back to a non-link badge so we never silently navigate to "/" of the
 *   current app.
 */
export function MessageBody({ text, mentionsById }: MessageBodyProps) {
  const parts = useMemo(() => splitTextWithCitations(text), [text]);

  return (
    <p className="text-sm whitespace-pre-wrap leading-relaxed break-words">
      {parts.map((p, i) => {
        if (p.type === "text") return <span key={i}>{p.value}</span>;

        // GPT often returns a shortened UUID prefix; fall back to startsWith().
        const m =
          mentionsById.get(p.value) ||
          Array.from(mentionsById.values()).find((x) =>
            x.id.startsWith(p.value)
          );

        const safeUrl = m ? normalizeMentionUrl(m.url) : null;

        if (m && safeUrl) {
          return (
            <CitationLink
              key={i}
              shortId={p.value}
              mention={m}
              url={safeUrl}
            />
          );
        }

        return (
          <span
            key={i}
            className="inline-flex items-center px-1.5 py-0.5 mx-0.5 text-[11px] font-medium rounded-md bg-muted text-muted-foreground align-baseline"
            title={m?.title}
          >
            [{p.value.slice(0, 6)}]
          </span>
        );
      })}
    </p>
  );
}

function CitationLink({
  shortId,
  mention,
  url,
}: {
  shortId: string;
  mention: Mention;
  url: string;
}) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            // Failsafe — bypass any wrapper that may have called preventDefault
            // and guarantee the source article opens in a new tab.
            onClick={(e) => {
              e.stopPropagation();
              if (e.defaultPrevented) {
                e.preventDefault();
                openMentionUrl(url);
              }
            }}
            onAuxClick={(e) => e.stopPropagation()}
            className="inline-flex items-center px-1.5 py-0.5 mx-0.5 text-[11px] font-medium rounded-md bg-primary/15 text-primary hover:bg-primary/25 transition-colors no-underline align-baseline cursor-pointer"
          >
            [{shortId.slice(0, 6)}]
            <ExternalLink className="h-2.5 w-2.5 ml-0.5" />
          </a>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="font-medium text-xs line-clamp-2">{mention.title}</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            {mention.source?.name || tryHost(url)} ·{" "}
            {mention.publishedAt
              ? new Date(mention.publishedAt).toLocaleDateString()
              : ""}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function tryHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}
