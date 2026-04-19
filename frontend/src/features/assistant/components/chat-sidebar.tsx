"use client";

import {
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "@/hooks";
import { cn } from "@/lib/utils";
import type { ChatListItem } from "@/lib/api/services/ai";
import { relativeDate } from "../utils/format";
import { QUICK_PROMPT_KEYS } from "../utils/quick-prompts";

interface ChatSidebarProps {
  chats: ChatListItem[];
  chatsLoading: boolean;
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onRenameRequest: (chat: ChatListItem) => void;
  onDelete: (chatId: string) => void;
  onQuickPrompt: (key: string) => void;
}

export function ChatSidebar({
  chats,
  chatsLoading,
  activeChatId,
  onSelectChat,
  onNewChat,
  onRenameRequest,
  onDelete,
  onQuickPrompt,
}: ChatSidebarProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col pr-3 h-full">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <h2 className="font-semibold text-sm">{t("assistant.chatHistory")}</h2>
        <Button size="sm" onClick={onNewChat}>
          <Plus className="h-4 w-4 mr-1" />
          {t("assistant.newChat")}
        </Button>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-2 pr-2">
            {chatsLoading ? (
              <div className="py-6 text-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground inline" />
              </div>
            ) : chats.length === 0 && !activeChatId ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                {t("assistant.empty.noChats")}
              </p>
            ) : (
              chats.map((chat) => (
                <ChatRow
                  key={chat.id}
                  chat={chat}
                  isActive={activeChatId === chat.id}
                  onSelect={() => onSelectChat(chat.id)}
                  onRenameRequest={() => onRenameRequest(chat)}
                  onDelete={() => onDelete(chat.id)}
                />
              ))
            )}
          </div>
        </ScrollArea>

        <div className="mt-4 pt-4 border-t border-border flex-shrink-0">
          <p className="text-xs font-medium text-muted-foreground uppercase mb-2">
            {t("assistant.quickPrompts")}
          </p>
          <div className="space-y-1">
            {QUICK_PROMPT_KEYS.slice(0, 4).map((p) => (
              <button
                key={p.id}
                onClick={() => onQuickPrompt(p.id)}
                className="w-full flex items-center gap-2 p-2 rounded-lg text-left text-xs hover:bg-muted/50 transition-colors"
              >
                <p.icon className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                <span className="truncate">
                  {t(`assistant.prompts.${p.id}.label`)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatRow({
  chat,
  isActive,
  onSelect,
  onRenameRequest,
  onDelete,
}: {
  chat: ChatListItem;
  isActive: boolean;
  onSelect: () => void;
  onRenameRequest: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        "group flex items-center gap-1 rounded-lg transition-colors",
        isActive
          ? "bg-primary/10 border border-primary/20"
          : "hover:bg-muted/50"
      )}
    >
      <button onClick={onSelect} className="flex-1 text-left p-3 min-w-0">
        <div className="flex items-center justify-between mb-1 gap-2">
          <span className="font-medium text-sm truncate">
            {chat.title || t("assistant.newChat")}
          </span>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {relativeDate(chat.updated_at || chat.created_at, t)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {chat.last_message_preview || t("assistant.empty.noMessages")}
        </p>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 mr-1 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onRenameRequest}>
            <Pencil className="h-4 w-4 mr-2" />
            {t("assistant.actions.rename")}
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            {t("assistant.actions.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
