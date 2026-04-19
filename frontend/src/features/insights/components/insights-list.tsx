"use client";

import { AnimatePresence } from "framer-motion";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "@/hooks";
import type { InsightItem } from "../utils/normalize";
import { InsightCard } from "./insight-card";

interface InsightsListProps {
  projectId: string;
  filteredInsights: InsightItem[];
  activeTab: string;
  onTabChange: (v: string) => void;
  isGenerating: boolean;
  isDismissPending: boolean;
  onGenerate: () => void;
  onShareLink: () => void;
  onDismiss: (id: string) => void;
  onTakeAction: (insight: InsightItem) => void;
}

export function InsightsList({
  projectId,
  filteredInsights,
  activeTab,
  onTabChange,
  isGenerating,
  isDismissPending,
  onGenerate,
  onShareLink,
  onDismiss,
  onTakeAction,
}: InsightsListProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg">{t("insights.topInsights")}</h2>
        <Tabs value={activeTab} onValueChange={onTabChange} className="w-auto">
          <TabsList className="h-8">
            <TabsTrigger value="all" className="text-xs px-3">
              {t("insights.filters.all")}
            </TabsTrigger>
            <TabsTrigger value="alerts" className="text-xs px-3">
              {t("insights.filters.alerts")}
            </TabsTrigger>
            <TabsTrigger value="trends" className="text-xs px-3">
              {t("insights.filters.trends")}
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="text-xs px-3">
              {t("insights.filters.recommendations")}
            </TabsTrigger>
            <TabsTrigger value="opportunities" className="text-xs px-3">
              {t("insights.filters.opportunities")}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {filteredInsights.length === 0 ? (
        <Card className="glass">
          <CardContent className="p-8 text-center space-y-3">
            <Sparkles className="h-10 w-10 text-muted-foreground/40 mx-auto" />
            <p className="font-medium">{t("insights.noInsights")}</p>
            <p className="text-sm text-muted-foreground">
              {t("insights.noInsightsHint")}
            </p>
            <Button
              onClick={onGenerate}
              disabled={isGenerating}
              className="mt-2"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {t("insights.generateNew")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {filteredInsights.map((insight, index) => (
              <InsightCard
                key={insight.id}
                projectId={projectId}
                insight={insight}
                index={index}
                isDismissPending={isDismissPending}
                onTakeAction={onTakeAction}
                onShareLink={onShareLink}
                onDismiss={onDismiss}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
