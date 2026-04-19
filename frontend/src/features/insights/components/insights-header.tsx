"use client";

import {
  Clock,
  Loader2,
  RefreshCw,
  Send,
  Share2,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks";

interface InsightsHeaderProps {
  isGenerating: boolean;
  onGenerate: () => void;
  onSendToEmail: () => void;
  onShareLink: () => void;
  onSchedule: () => void;
  onAddRecipients: () => void;
}

export function InsightsHeader({
  isGenerating,
  onGenerate,
  onSendToEmail,
  onShareLink,
  onSchedule,
  onAddRecipients,
}: InsightsHeaderProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="h-7 w-7 text-primary" />
          {t("insights.title")}
        </h1>
        <p className="text-muted-foreground mt-1">{t("insights.subtitle")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          onClick={onGenerate}
          disabled={isGenerating}
          className="glow-sm"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t("insights.generating")}
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              {t("insights.generateNew")}
            </>
          )}
        </Button>
        <Button variant="outline" size="sm" onClick={onSendToEmail}>
          <Send className="h-4 w-4 mr-2" />
          {t("insights.sendToEmail")}
        </Button>
        <Button variant="outline" size="sm" onClick={onShareLink}>
          <Share2 className="h-4 w-4 mr-2" />
          {t("insights.shareLink")}
        </Button>
        <Button variant="outline" size="sm" onClick={onSchedule}>
          <Clock className="h-4 w-4 mr-2" />
          {t("insights.schedule")}
        </Button>
        <Button variant="outline" size="sm" onClick={onAddRecipients}>
          <UserPlus className="h-4 w-4 mr-2" />
          {t("insights.addRecipients")}
        </Button>
      </div>
    </div>
  );
}
