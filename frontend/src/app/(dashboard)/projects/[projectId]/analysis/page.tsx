"use client";

import { use, useState } from "react";
import { motion } from "framer-motion";
import ReactECharts from "echarts-for-react";
import { useTheme } from "next-themes";
import {
  BarChart3,
  Download,
  TrendingUp,
  TrendingDown,
  Hash,
  Link2,
  Globe,
  Smile,
  MessageCircle,
  PieChart,
  Activity,
  Users,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface AnalysisPageProps {
  params: Promise<{ projectId: string }>;
}

// Mock data
const overviewStats = [
  { label: "Total Mentions", value: "12,847", change: 12.5, icon: MessageCircle },
  { label: "Total Reach", value: "3.2M", change: 8.2, icon: Eye },
  { label: "Share of Voice", value: "34%", change: 5.1, icon: PieChart },
  { label: "Presence Score", value: "7.8", change: -2.3, icon: Activity },
];

const categoryData = [
  { name: "News", mentions: 4521, reach: 1200000, percentage: 35 },
  { name: "Social Media", mentions: 5123, reach: 890000, percentage: 40 },
  { name: "Blogs", mentions: 1834, reach: 450000, percentage: 14 },
  { name: "Forums", mentions: 892, reach: 120000, percentage: 7 },
  { name: "Other", mentions: 477, reach: 80000, percentage: 4 },
];

const shareOfVoice = [
  { name: "Your Brand", mentions: 12847, reach: "3.2M", share: 34 },
  { name: "Competitor A", mentions: 9823, reach: "2.8M", share: 26 },
  { name: "Competitor B", mentions: 8234, reach: "2.1M", share: 22 },
  { name: "Competitor C", mentions: 6721, reach: "1.5M", share: 18 },
];

const topInfluencers = [
  { name: "@tech_insider", mentions: 45, reach: "2.3M", followers: "1.2M", score: 9.2 },
  { name: "@digital_trends", mentions: 38, reach: "1.8M", followers: "980K", score: 8.8 },
  { name: "@startup_news", mentions: 32, reach: "1.2M", followers: "750K", score: 8.5 },
  { name: "@ai_weekly", mentions: 28, reach: "890K", followers: "520K", score: 8.1 },
];

const trendingHashtags = [
  { tag: "#AI", mentions: 2341, change: 45 },
  { tag: "#TechNews", mentions: 1892, change: 23 },
  { tag: "#Innovation", mentions: 1456, change: 12 },
  { tag: "#Startup", mentions: 1234, change: -5 },
  { tag: "#DigitalTransformation", mentions: 987, change: 8 },
  { tag: "#Future", mentions: 876, change: 15 },
];

const trendingLinks = [
  { url: "techcrunch.com/article-1", mentions: 234, domain: "TechCrunch" },
  { url: "bloomberg.com/news-2", mentions: 189, domain: "Bloomberg" },
  { url: "medium.com/post-3", mentions: 156, domain: "Medium" },
  { url: "forbes.com/article-4", mentions: 134, domain: "Forbes" },
];

const activeSites = [
  { name: "Twitter/X", mentions: 5234, percentage: 41 },
  { name: "TechCrunch", mentions: 1892, percentage: 15 },
  { name: "Reddit", mentions: 1456, percentage: 11 },
  { name: "LinkedIn", mentions: 1234, percentage: 10 },
  { name: "Facebook", mentions: 987, percentage: 8 },
];

const popularEmojis = [
  { emoji: "🚀", count: 1234 },
  { emoji: "💡", count: 987 },
  { emoji: "🔥", count: 876 },
  { emoji: "👍", count: 765 },
  { emoji: "❤️", count: 654 },
  { emoji: "😊", count: 543 },
];

export default function AnalysisPage({ params }: AnalysisPageProps) {
  const { projectId } = use(params);
  const { theme } = useTheme();
  const isDark = theme === "dark";
  
  const donutOption = {
    tooltip: {
      trigger: "item",
      backgroundColor: isDark ? "rgba(23, 23, 23, 0.95)" : "rgba(255, 255, 255, 0.95)",
      borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
      textStyle: { color: isDark ? "#e5e5e5" : "#171717" },
    },
    series: [{
      type: "pie",
      radius: ["50%", "75%"],
      itemStyle: { borderRadius: 6, borderWidth: 2, borderColor: isDark ? "#171717" : "#fff" },
      label: { show: false },
      data: categoryData.map((item, i) => ({
        value: item.mentions,
        name: item.name,
        itemStyle: { color: [`oklch(0.70 0.15 195)`, `oklch(0.65 0.17 155)`, `oklch(0.75 0.14 75)`, `oklch(0.60 0.18 25)`, `oklch(0.55 0.02 260)`][i] }
      }))
    }]
  };
  
  const sentimentBarOption = {
    tooltip: { trigger: "axis", backgroundColor: isDark ? "rgba(23, 23, 23, 0.95)" : "rgba(255, 255, 255, 0.95)" },
    grid: { left: "3%", right: "4%", bottom: "3%", top: "10%", containLabel: true },
    xAxis: { type: "category", data: categoryData.map(c => c.name), axisLabel: { color: isDark ? "#737373" : "#a3a3a3", fontSize: 11 } },
    yAxis: { type: "value", axisLabel: { color: isDark ? "#737373" : "#a3a3a3" }, splitLine: { lineStyle: { color: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" } } },
    series: [
      { name: "Positive", type: "bar", stack: "total", data: [65, 70, 58, 72, 60], itemStyle: { color: "oklch(0.65 0.17 155)" } },
      { name: "Neutral", type: "bar", stack: "total", data: [25, 20, 32, 18, 28], itemStyle: { color: "oklch(0.55 0.02 260)" } },
      { name: "Negative", type: "bar", stack: "total", data: [10, 10, 10, 10, 12], itemStyle: { color: "oklch(0.60 0.22 25)" } },
    ]
  };
  
  const gaugeOption = {
    series: [{
      type: "gauge",
      startAngle: 180,
      endAngle: 0,
      min: 0,
      max: 10,
      pointer: { show: true, length: "60%", width: 4, itemStyle: { color: "oklch(0.70 0.15 195)" } },
      axisLine: { lineStyle: { width: 20, color: [[0.3, "oklch(0.60 0.22 25)"], [0.7, "oklch(0.75 0.14 75)"], [1, "oklch(0.65 0.17 155)"]] } },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      detail: { valueAnimation: true, fontSize: 28, fontWeight: "bold", color: isDark ? "#fff" : "#171717", offsetCenter: [0, "20%"], formatter: "{value}" },
      data: [{ value: 7.8 }]
    }]
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-primary" />
            Analysis
          </h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive analysis of your media presence
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>
      
      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="glass flex-wrap h-auto p-1 gap-1">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="categories" className="text-xs">By Category</TabsTrigger>
          <TabsTrigger value="sentiment" className="text-xs">Sentiment</TabsTrigger>
          <TabsTrigger value="hashtags" className="text-xs">Hashtags</TabsTrigger>
          <TabsTrigger value="links" className="text-xs">Links</TabsTrigger>
          <TabsTrigger value="sites" className="text-xs">Active Sites</TabsTrigger>
          <TabsTrigger value="emojis" className="text-xs">Emojis</TabsTrigger>
          <TabsTrigger value="context" className="text-xs">Context</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {overviewStats.map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <Card className="glass">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <stat.icon className="h-4 w-4 text-primary" />
                      </div>
                      <span className={cn("text-xs font-medium flex items-center gap-1", stat.change >= 0 ? "text-green-500" : "text-red-500")}>
                        {stat.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {stat.change >= 0 ? "+" : ""}{stat.change}%
                      </span>
                    </div>
                    <p className="text-2xl font-bold mt-3">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
          
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Category Donut */}
            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Mentions by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ReactECharts option={donutOption} style={{ height: "220px" }} opts={{ renderer: "svg" }} />
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {categoryData.map((cat, i) => (
                    <div key={cat.name} className="flex items-center gap-1.5 text-xs">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: [`oklch(0.70 0.15 195)`, `oklch(0.65 0.17 155)`, `oklch(0.75 0.14 75)`, `oklch(0.60 0.18 25)`, `oklch(0.55 0.02 260)`][i] }} />
                      <span className="text-muted-foreground">{cat.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {/* Presence Score */}
            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Presence Score</CardTitle>
              </CardHeader>
              <CardContent>
                <ReactECharts option={gaugeOption} style={{ height: "180px" }} opts={{ renderer: "svg" }} />
                <p className="text-center text-sm text-muted-foreground">Your brand presence is <span className="text-green-500 font-medium">Strong</span></p>
              </CardContent>
            </Card>
            
            {/* Share of Voice */}
            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Share of Voice</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {shareOfVoice.map((item, i) => (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className={i === 0 ? "font-medium text-primary" : "text-muted-foreground"}>{item.name}</span>
                      <span className="font-medium">{item.share}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all", i === 0 ? "bg-primary" : "bg-muted-foreground/30")} style={{ width: `${item.share}%` }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
          
          {/* Top Influencers */}
          <Card className="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Most Followers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground uppercase">
                      <th className="p-3">Profile</th>
                      <th className="p-3">Mentions</th>
                      <th className="p-3">Reach</th>
                      <th className="p-3">Followers</th>
                      <th className="p-3">Influence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topInfluencers.map((inf) => (
                      <tr key={inf.name} className="border-t border-border/30">
                        <td className="p-3 font-medium text-primary">{inf.name}</td>
                        <td className="p-3">{inf.mentions}</td>
                        <td className="p-3">{inf.reach}</td>
                        <td className="p-3">{inf.followers}</td>
                        <td className="p-3"><Badge variant="secondary">{inf.score}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="glass">
              <CardHeader><CardTitle className="text-base">Category Distribution</CardTitle></CardHeader>
              <CardContent>
                <ReactECharts option={donutOption} style={{ height: "300px" }} opts={{ renderer: "svg" }} />
              </CardContent>
            </Card>
            <Card className="glass">
              <CardHeader><CardTitle className="text-base">Category Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {categoryData.map((cat) => (
                  <div key={cat.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div>
                      <p className="font-medium">{cat.name}</p>
                      <p className="text-sm text-muted-foreground">{cat.mentions.toLocaleString()} mentions</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">{cat.percentage}%</p>
                      <p className="text-xs text-muted-foreground">{(cat.reach / 1000).toFixed(0)}K reach</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Sentiment Tab */}
        <TabsContent value="sentiment" className="space-y-6">
          <Card className="glass">
            <CardHeader><CardTitle className="text-base">Sentiment by Category</CardTitle></CardHeader>
            <CardContent>
              <ReactECharts option={sentimentBarOption} style={{ height: "300px" }} opts={{ renderer: "svg" }} />
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Hashtags Tab */}
        <TabsContent value="hashtags" className="space-y-6">
          <Card className="glass">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Hash className="h-4 w-4" /> Trending Hashtags</CardTitle></CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {trendingHashtags.map((tag) => (
                  <div key={tag.tag} className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="font-medium text-primary">{tag.tag}</p>
                      <p className="text-sm text-muted-foreground">{tag.mentions.toLocaleString()} mentions</p>
                    </div>
                    <Badge variant="outline" className={tag.change >= 0 ? "border-green-500/30 text-green-500" : "border-red-500/30 text-red-500"}>
                      {tag.change >= 0 ? "+" : ""}{tag.change}%
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Links Tab */}
        <TabsContent value="links" className="space-y-6">
          <Card className="glass">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Link2 className="h-4 w-4" /> Trending Links</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {trendingLinks.map((link) => (
                  <div key={link.url} className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{link.domain}</p>
                        <p className="text-sm text-muted-foreground truncate max-w-[300px]">{link.url}</p>
                      </div>
                    </div>
                    <Badge variant="secondary">{link.mentions} mentions</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Active Sites Tab */}
        <TabsContent value="sites" className="space-y-6">
          <Card className="glass">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4" /> Most Active Sites</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {activeSites.map((site) => (
                <div key={site.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{site.name}</span>
                    <span className="text-sm text-muted-foreground">{site.mentions.toLocaleString()} ({site.percentage}%)</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${site.percentage}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Emojis Tab */}
        <TabsContent value="emojis" className="space-y-6">
          <Card className="glass">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Smile className="h-4 w-4" /> Popular Emojis</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 justify-center">
                {popularEmojis.map((item) => (
                  <div key={item.emoji} className="flex flex-col items-center p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                    <span className="text-4xl mb-2">{item.emoji}</span>
                    <span className="text-sm font-medium">{item.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Context Tab */}
        <TabsContent value="context" className="space-y-6">
          <Card className="glass">
            <CardHeader><CardTitle className="text-base">Context of Discussion</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 justify-center py-8">
                {["AI", "technology", "innovation", "startup", "future", "digital", "machine learning", "automation", "cloud", "data", "analytics", "software", "platform", "solution", "enterprise"].map((word, i) => (
                  <span key={word} className="px-4 py-2 rounded-full bg-primary/10 text-primary font-medium" style={{ fontSize: `${Math.max(12, 24 - i * 1.5)}px` }}>
                    {word}
                  </span>
                ))}
              </div>
              <div className="flex justify-center gap-4 mt-6">
                {popularEmojis.slice(0, 5).map((item) => (
                  <div key={item.emoji} className="text-center">
                    <span className="text-2xl">{item.emoji}</span>
                    <p className="text-xs text-muted-foreground mt-1">{item.count}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}










