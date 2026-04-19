"use client";

import {
  Bot,
  FileText,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/hooks";
import type { ChatListItem } from "@/lib/api/services/ai";

interface ChatHeaderProps {
  activeChat: ChatListItem | null;
  activeChatId: string | null;
  isReportPending: boolean;
  onGenerateReport: () => void;
  onRequestRename: () => void;
  onDelete: () => void;
}

export function ChatHeader({
  activeChat,
  activeChatId,
  isReportPending,
  onGenerateReport,
  onRequestRename,
  onDelete,
}: ChatHeaderProps) {
  const { t } = useTranslation();

  return (
    <CardHeader className="border-b border-border/50 py-3 flex-shrink-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-base font-medium truncate">
              {activeChat?.title || t("assistant.newChat")}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {t("assistant.title")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onGenerateReport}
            disabled={isReportPending}
          >
            {isReportPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            <span className="hidden sm:inline">
              {t("assistant.actions.generateReport")}
            </span>
          </Button>
          {activeChatId && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onRequestRename}>
                  <Pencil className="h-4 w-4 mr-2" />
                  {t("assistant.actions.rename")}
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t("assistant.actions.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </CardHeader>
  );
}
