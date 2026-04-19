"use client";

import { forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Copy, ExternalLink, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks";
import { cn } from "@/lib/utils";
import type { ChatMessageDto } from "@/lib/api/services/ai";
import type { Mention } from "@/types";
import {
  formatTime,
  normalizeMentionUrl,
  openMentionUrl,
} from "../utils/format";
import { MessageBody } from "./message-body";

interface MessageListProps {
  visibleMessages: ChatMessageDto[];
  messagesLoading: boolean;
  optimisticPending: boolean;
  isAiPending: boolean;
  mentionsById: Map<string, Mention>;
  suggestedPrompts: string[];
  onSuggestedClick: (prompt: string) => void;
  onCopy: (text: string) => void;
}

export const MessageList = forwardRef<
  HTMLDivElement,
  MessageListProps & { endRef: React.RefObject<HTMLDivElement | null> }
>(function MessageList(
  {
    visibleMessages,
    messagesLoading,
    optimisticPending,
    isAiPending,
    mentionsById,
    suggestedPrompts,
    onSuggestedClick,
    onCopy,
    endRef,
  },
  scrollRef
) {
  const { t } = useTranslation();

  return (
    <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
      <div className="space-y-6 max-w-4xl mx-auto">
        {visibleMessages.length === 0 && !messagesLoading ? (
          <EmptyMessagesState
            suggestedPrompts={suggestedPrompts}
            onSuggestedClick={onSuggestedClick}
          />
        ) : messagesLoading && !optimisticPending ? (
          <div className="text-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground inline" />
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {visibleMessages.map((m) => (
              <ChatMessage
                key={m.id}
                message={m}
                mentionsById={mentionsById}
                onCopy={onCopy}
              />
            ))}
          </AnimatePresence>
        )}

        {isAiPending && <PendingBubble />}
        <div ref={endRef} />
      </div>
    </div>
  );
});

function EmptyMessagesState({
  suggestedPrompts,
  onSuggestedClick,
}: {
  suggestedPrompts: string[];
  onSuggestedClick: (prompt: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="p-4 rounded-full bg-primary/10 mb-4">
        <Bot className="h-8 w-8 text-primary" />
      </div>
      <h3 className="font-semibold text-lg mb-2">
        {t("assistant.empty.title")}
      </h3>
      <p className="text-muted-foreground text-center max-w-sm mb-6">
        {t("assistant.empty.description")}
      </p>
      <div className="flex flex-wrap gap-2 justify-center max-w-md">
        {suggestedPrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => onSuggestedClick(prompt)}
            className="px-3 py-1.5 rounded-full bg-muted/50 text-sm hover:bg-muted transition-colors text-left"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChatMessage({
  message,
  mentionsById,
  onCopy,
}: {
  message: ChatMessageDto;
  mentionsById: Map<string, Mention>;
  onCopy: (text: string) => void;
}) {
  const { t } = useTranslation();
  const cited = (message.metadata?.cited_mention_ids ?? []) as string[];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "flex gap-3",
        message.role === "user" ? "flex-row-reverse" : ""
      )}
    >
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarFallback
          className={cn(
            "text-xs",
            message.role === "assistant"
              ? "bg-primary/10 text-primary"
              : "bg-muted"
          )}
        >
          {message.role === "assistant" ? <Bot className="h-4 w-4" /> : "U"}
        </AvatarFallback>
      </Avatar>

      <div
        className={cn(
          "max-w-[80%] space-y-1.5 min-w-0",
          message.role === "user" ? "items-end" : ""
        )}
      >
        <div
          className={cn(
            "p-3 rounded-2xl",
            message.role === "user"
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-muted/50 rounded-tl-sm"
          )}
        >
          {message.role === "assistant" ? (
            <MessageBody text={message.content} mentionsById={mentionsById} />
          ) : (
            <p className="text-sm whitespace-pre-wrap leading-relaxed break-words">
              {message.content}
            </p>
          )}

          {message.role === "assistant" && cited.length > 0 && (
            <CitedMentionsList citedIds={cited} mentionsById={mentionsById} />
          )}
        </div>

        <div className="flex items-center gap-2 px-1">
          <span className="text-xs text-muted-foreground">
            {formatTime(message.timestamp)}
          </span>
          {message.role === "assistant" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onCopy(message.content)}
            >
              <Copy className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function CitedMentionsList({
  citedIds,
  mentionsById,
}: {
  citedIds: string[];
  mentionsById: Map<string, Mention>;
}) {
  const { t } = useTranslation();
  return (
    <div className="mt-3 pt-3 border-t border-border/30">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground block mb-2">
        {t("assistant.citations.label")} ({citedIds.length})
      </span>
      <div className="flex flex-col gap-1.5">
        {citedIds.slice(0, 8).map((id) => {
          const m =
            mentionsById.get(id) ||
            Array.from(mentionsById.values()).find((x) => x.id.startsWith(id));
          if (!m) {
            return (
              <span key={id} className="text-xs text-muted-foreground">
                [m:{id.slice(0, 6)}] (loading…)
              </span>
            );
          }
          const safeUrl = normalizeMentionUrl(m.url);
          if (!safeUrl) {
            // Don't render a dead link — show a static row instead.
            return (
              <span
                key={id}
                className="flex items-start gap-2 text-xs text-muted-foreground"
              >
                <ExternalLink className="h-3 w-3 mt-0.5 flex-shrink-0 opacity-30" />
                <span className="line-clamp-1 flex-1">
                  <span className="font-medium text-foreground">{m.title}</span>
                  <span className="ml-1 opacity-70">— {m.source?.name || ""}</span>
                </span>
              </span>
            );
          }
          return (
            <a
              key={id}
              href={safeUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.stopPropagation();
                if (e.defaultPrevented) {
                  e.preventDefault();
                  openMentionUrl(safeUrl);
                }
              }}
              onAuxClick={(e) => e.stopPropagation()}
              className="group flex items-start gap-2 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer"
            >
              <ExternalLink className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-1 flex-1">
                <span className="font-medium text-foreground group-hover:text-primary">
                  {m.title}
                </span>
                <span className="ml-1 opacity-70">
                  — {m.source?.name || ""}
                </span>
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

function PendingBubble() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex gap-3"
    >
      <Avatar className="h-8 w-8">
        <AvatarFallback className="bg-primary/10 text-primary">
          <Bot className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      <div className="p-3 rounded-2xl rounded-tl-sm bg-muted/50">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    </motion.div>
  );
}
