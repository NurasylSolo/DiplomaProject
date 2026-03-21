"use client";

import { use } from "react";
import { motion } from "framer-motion";
import ReactECharts from "echarts-for-react";
import { useTheme } from "next-themes";
import {
  Heart,
  Download,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEmotions } from "@/hooks";

interface EmotionAnalysisPageProps {
  params: Promise<{ projectId: string }>;
}

const EMOTION_META: Record<string, { emoji: string; color: string }> = {
  joy: { emoji: "😊", color: "#FBBF24" },
  trust: { emoji: "🤝", color: "#10B981" },
  anticipation: { emoji: "🤩", color: "#8B5CF6" },
  surprise: { emoji: "😮", color: "#EC4899" },
  sadness: { emoji: "😢", color: "#6366F1" },
  fear: { emoji: "😰", color: "#78716C" },
  anger: { emoji: "😠", color: "#EF4444" },
  disgust: { emoji: "🤢", color: "#84CC16" },
};

export default function EmotionAnalysisPage({ params }: EmotionAnalysisPageProps) {
  const { projectId } = use(params);
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { data, isLoading } = useEmotions(projectId);

  const averages: Record<string, number> = data?.averages || {};
  const totalAnalyzed: number = data?.total_analyzed || 0;

  const totalScore = Object.values(averages).reduce((a, b) => a + b, 0) || 1;
  const emotions = Object.entries(averages)
    .map(([name, score]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      key: name,
      score: Math.round(score * 100) / 100,
      percentage: Math.round((score / totalScore) * 100),
      emoji: EMOTION_META[name]?.emoji || "❓",
      color: EMOTION_META[name]?.color || "#9CA3AF",
    }))
    .sort((a, b) => b.score - a.score);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading emotions...</span>
      </div>
    );
  }

  const pieOption = {
    tooltip: {
      trigger: "item",
      formatter: "{b}: {d}%",
      backgroundColor: isDark ? "rgba(23,23,23,0.95)" : "rgba(255,255,255,0.95)",
    },
    series: [{
      type: "pie",
      radius: ["45%", "70%"],
      center: ["50%", "50%"],
      itemStyle: { borderRadius: 8, borderWidth: 2, borderColor: isDark ? "#171717" : "#fff" },
      label: { show: false },
      data: emotions.map(e => ({ value: e.percentage, name: e.name, itemStyle: { color: e.color } })),
    }],
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Heart className="h-7 w-7 text-primary" />
            Emotion Analysis
          </h1>
          <p className="text-muted-foreground mt-1">
            {totalAnalyzed} mentions analyzed
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {emotions.length === 0 ? (
        <Card className="glass">
          <CardContent className="p-8 text-center text-muted-foreground">
            No emotion data available yet. Create a project and collect mentions first.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-4 lg:grid-cols-8 gap-3">
            {emotions.map((emotion, i) => (
              <motion.div
                key={emotion.key}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="glass hover:bg-card/80 transition-colors">
                  <CardContent className="p-3 text-center">
                    <span className="text-2xl mb-1 block">{emotion.emoji}</span>
                    <p className="text-xs font-medium">{emotion.name}</p>
                    <p className="text-lg font-bold" style={{ color: emotion.color }}>
                      {emotion.percentage}%
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      score: {emotion.score}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Emotion Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ReactECharts option={pieOption} style={{ height: "300px" }} opts={{ renderer: "svg" }} />
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Emotion Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {emotions.map((emotion) => (
                  <div key={emotion.key} className="flex items-center gap-3">
                    <span className="text-xl w-8">{emotion.emoji}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium">{emotion.name}</span>
                        <span>{emotion.percentage}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${emotion.percentage}%`, backgroundColor: emotion.color }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
