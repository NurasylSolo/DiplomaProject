"use client";

import { use, useState } from "react";
import { motion } from "framer-motion";
import ReactECharts from "echarts-for-react";
import { useTheme } from "next-themes";
import {
  Heart,
  Download,
  TrendingUp,
  TrendingDown,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks";

interface EmotionAnalysisPageProps {
  params: Promise<{ projectId: string }>;
}

const emotions = [
  { name: "Joy", emoji: "😊", count: 4521, percentage: 35, color: "#FBBF24", change: 12 },
  { name: "Trust", emoji: "🤝", count: 2847, percentage: 22, color: "#10B981", change: 8 },
  { name: "Anticipation", emoji: "🤩", count: 1892, percentage: 15, color: "#8B5CF6", change: 15 },
  { name: "Surprise", emoji: "😮", count: 1234, percentage: 10, color: "#EC4899", change: -5 },
  { name: "Sadness", emoji: "😢", count: 987, percentage: 8, color: "#6366F1", change: -12 },
  { name: "Fear", emoji: "😰", count: 654, percentage: 5, color: "#78716C", change: -8 },
  { name: "Anger", emoji: "😠", count: 432, percentage: 3, color: "#EF4444", change: -15 },
  { name: "Disgust", emoji: "🤢", count: 280, percentage: 2, color: "#84CC16", change: -3 },
];

const emotionsBySource = [
  { source: "Twitter/X", joy: 40, trust: 25, anticipation: 15, surprise: 10, sadness: 5, fear: 2, anger: 2, disgust: 1 },
  { source: "News Sites", joy: 30, trust: 35, anticipation: 12, surprise: 8, sadness: 8, fear: 3, anger: 3, disgust: 1 },
  { source: "Blogs", joy: 45, trust: 20, anticipation: 18, surprise: 8, sadness: 4, fear: 2, anger: 2, disgust: 1 },
  { source: "Forums", joy: 25, trust: 15, anticipation: 10, surprise: 15, sadness: 15, fear: 8, anger: 8, disgust: 4 },
];

const emotionsByTopic = [
  { topic: "Product Launch", emotions: { joy: 60, trust: 20, anticipation: 15, surprise: 5 } },
  { topic: "Customer Support", emotions: { joy: 30, trust: 25, sadness: 20, anger: 15, fear: 10 } },
  { topic: "AI Features", emotions: { joy: 50, anticipation: 30, trust: 15, surprise: 5 } },
  { topic: "Pricing", emotions: { joy: 15, trust: 20, sadness: 25, anger: 25, fear: 15 } },
];

export default function EmotionAnalysisPage({ params }: EmotionAnalysisPageProps) {
  const { projectId } = use(params);
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  
  const pieOption = {
    tooltip: { 
      trigger: "item",
      formatter: "{b}: {c} ({d}%)",
      backgroundColor: isDark ? "rgba(23,23,23,0.95)" : "rgba(255,255,255,0.95)",
    },
    series: [{
      type: "pie",
      radius: ["45%", "70%"],
      center: ["50%", "50%"],
      itemStyle: { borderRadius: 8, borderWidth: 2, borderColor: isDark ? "#171717" : "#fff" },
      label: { show: false },
      data: emotions.map(e => ({ value: e.count, name: e.name, itemStyle: { color: e.color } }))
    }]
  };
  
  const barOption = {
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    legend: { 
      data: emotions.slice(0, 5).map(e => e.name),
      textStyle: { color: isDark ? "#a3a3a3" : "#737373" },
      bottom: 0
    },
    grid: { left: "3%", right: "4%", bottom: "15%", top: "10%", containLabel: true },
    xAxis: { 
      type: "category", 
      data: emotionsBySource.map(s => s.source),
      axisLabel: { color: isDark ? "#737373" : "#a3a3a3" }
    },
    yAxis: { 
      type: "value",
      axisLabel: { color: isDark ? "#737373" : "#a3a3a3" },
      splitLine: { lineStyle: { color: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" } }
    },
    series: emotions.slice(0, 5).map(e => ({
      name: e.name,
      type: "bar",
      stack: "total",
      data: emotionsBySource.map(s => (s as any)[e.name.toLowerCase()]),
      itemStyle: { color: e.color }
    }))
  };
  
  const trendOption = {
    tooltip: { trigger: "axis" },
    grid: { left: "3%", right: "4%", bottom: "3%", top: "10%", containLabel: true },
    xAxis: { 
      type: "category", 
      data: ["Week 1", "Week 2", "Week 3", "Week 4"],
      axisLabel: { color: isDark ? "#737373" : "#a3a3a3" }
    },
    yAxis: { 
      type: "value",
      axisLabel: { color: isDark ? "#737373" : "#a3a3a3" },
      splitLine: { lineStyle: { color: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" } }
    },
    series: [
      { name: "Joy", type: "line", smooth: true, data: [35, 38, 40, 42], itemStyle: { color: "#FBBF24" } },
      { name: "Trust", type: "line", smooth: true, data: [20, 22, 21, 25], itemStyle: { color: "#10B981" } },
      { name: "Anger", type: "line", smooth: true, data: [8, 6, 5, 4], itemStyle: { color: "#EF4444" } },
    ]
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Heart className="h-7 w-7 text-primary" />
            {t("emotions.title")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("emotions.subtitle")}
          </p>
        </div>
        
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>
      
      {/* Emotion Cards */}
      <div className="grid grid-cols-4 lg:grid-cols-8 gap-3">
        {emotions.map((emotion, i) => (
          <motion.div
            key={emotion.name}
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
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-[10px] mt-1",
                    emotion.change >= 0 ? "border-green-500/30 text-green-500" : "border-red-500/30 text-red-500"
                  )}
                >
                  {emotion.change >= 0 ? "+" : ""}{emotion.change}%
                </Badge>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
      
      <Tabs defaultValue="distribution" className="space-y-6">
        <TabsList className="glass">
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="by_source">By Source</TabsTrigger>
          <TabsTrigger value="by_topic">By Topic</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>
        
        {/* Distribution Tab */}
        <TabsContent value="distribution" className="space-y-6">
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
                  <div key={emotion.name} className="flex items-center gap-3">
                    <span className="text-xl w-8">{emotion.emoji}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium">{emotion.name}</span>
                        <span>{emotion.count.toLocaleString()} ({emotion.percentage}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all" 
                          style={{ width: `${emotion.percentage}%`, backgroundColor: emotion.color }}
                        />
                      </div>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs min-w-[50px] justify-center",
                        emotion.change >= 0 ? "border-green-500/30 text-green-500" : "border-red-500/30 text-red-500"
                      )}
                    >
                      {emotion.change >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                      {Math.abs(emotion.change)}%
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* By Source Tab */}
        <TabsContent value="by_source">
          <Card className="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Emotions by Source</CardTitle>
            </CardHeader>
            <CardContent>
              <ReactECharts option={barOption} style={{ height: "350px" }} opts={{ renderer: "svg" }} />
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* By Topic Tab */}
        <TabsContent value="by_topic" className="space-y-4">
          {emotionsByTopic.map((topic) => (
            <Card key={topic.topic} className="glass">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">{topic.topic}</h3>
                  <Badge variant="secondary">
                    <MessageSquare className="h-3 w-3 mr-1" />
                    {Object.values(topic.emotions).reduce((a, b) => a + b, 0)}%
                  </Badge>
                </div>
                <div className="flex h-6 rounded-full overflow-hidden">
                  {Object.entries(topic.emotions).map(([emotion, value]) => {
                    const emotionData = emotions.find(e => e.name.toLowerCase() === emotion);
                    return (
                      <div
                        key={emotion}
                        className="flex items-center justify-center text-[10px] font-medium text-white"
                        style={{ 
                          width: `${value}%`, 
                          backgroundColor: emotionData?.color || "#gray" 
                        }}
                        title={`${emotionData?.name}: ${value}%`}
                      >
                        {value >= 10 && emotionData?.emoji}
                      </div>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {Object.entries(topic.emotions).map(([emotion, value]) => {
                    const emotionData = emotions.find(e => e.name.toLowerCase() === emotion);
                    return (
                      <div key={emotion} className="flex items-center gap-1 text-xs">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: emotionData?.color }} />
                        <span>{emotionData?.name}: {value}%</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        
        {/* Trends Tab */}
        <TabsContent value="trends">
          <Card className="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Emotion Trends (Last 4 Weeks)</CardTitle>
            </CardHeader>
            <CardContent>
              <ReactECharts option={trendOption} style={{ height: "300px" }} opts={{ renderer: "svg" }} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}










