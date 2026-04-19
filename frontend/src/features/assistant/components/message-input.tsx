"use client";

import { forwardRef } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/hooks";
import { QUICK_PROMPT_KEYS } from "../utils/quick-prompts";

interface MessageInputProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  isPending: boolean;
  showQuickPrompts: boolean;
  onQuickPrompt: (key: string) => void;
}

export const MessageInput = forwardRef<HTMLTextAreaElement, MessageInputProps>(
  function MessageInput(
    {
      value,
      onChange,
      onSend,
      isPending,
      showQuickPrompts,
      onQuickPrompt,
    }: MessageInputProps,
    ref
  ) {
    const { t } = useTranslation();
    return (
      <div className="p-4 border-t border-border/50 flex-shrink-0">
        {showQuickPrompts && (
          <div className="flex gap-2 mb-3 overflow-x-auto pb-2 -mx-1 px-1">
            {QUICK_PROMPT_KEYS.slice(0, 4).map((p) => (
              <button
                key={p.id}
                onClick={() => onQuickPrompt(p.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 text-xs whitespace-nowrap hover:bg-muted transition-colors flex-shrink-0"
              >
                <p.icon className="h-3 w-3" />
                {t(`assistant.prompts.${p.id}.label`)}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Textarea
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder={t("assistant.inputPlaceholder")}
            className="min-h-[44px] max-h-32 resize-none"
            rows={1}
          />
          <Button
            onClick={onSend}
            disabled={!value.trim() || isPending}
            size="icon"
            className="h-11 w-11 glow-sm flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-2">
          {t("assistant.footerHint")}
        </p>
      </div>
    );
  }
);
