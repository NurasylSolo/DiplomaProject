"use client";

import { use, useState } from "react";
import { motion } from "framer-motion";
import ReactECharts from "echarts-for-react";
import { useTheme } from "next-themes";
import {
  UserCheck,
  Download,
  TrendingUp,
  TrendingDown,
  Star,
  MessageSquare,
  Eye,
  Users,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks";

interface InfluencerAnalysisPageProps {
  params: Promise<{ projectId: string }>;
}

const influencerRanking = [
  {
    rank: 1,
    name: "Alex Tech Reviews",
    handle: "@alextech",
    score: 9.2,
    mentions: 45,
    reach: "2.3M",
    engagement: "8.5%",
    sentiment: 85,
    followerGrowth: 12.5,
    posts: [
      { content: "Just tested the new AI features - game changing! 🚀", engagement: "12.5K" },
      { content: "Detailed review coming soon...", engagement: "8.2K" },
    ],
  },
  {
    rank: 2,
    name: "Digital Trends",
    handle: "@digitaltrends",
    score: 8.8,
    mentions: 38,
    reach: "1.8M",
    engagement: "6.2%",
    sentiment: 72,
    followerGrowth: 8.3,
    posts: [],
  },
  {
    rank: 3,
    name: "Tech Insider",
    handle: "@techinsider",
    score: 8.5,
    mentions: 32,
    reach: "1.2M",
    engagement: "5.8%",
    sentiment: 68,
    followerGrowth: 5.2,
    posts: [],
  },
  {
    rank: 4,
    name: "AI Weekly",
    handle: "@aiweekly",
    score: 8.1,
    mentions: 28,
    reach: "890K",
    engagement: "7.1%",
    sentiment: 92,
    followerGrowth: 15.8,
    posts: [],
  },
  {
    rank: 5,
    name: "Startup Stories",
    handle: "@startupstories",
    score: 7.6,
    mentions: 24,
    reach: "650K",
    engagement: "4.5%",
    sentiment: 78,
    followerGrowth: 6.9,
    posts: [],
  },
];

const overviewStats = [
  { label: "Total Influencers", value: "156", icon: Users, change: 12 },
  { label: "Avg. Influence Score", value: "7.2", icon: Star, change: 5 },
  { label: "Total Reach", value: "12.5M", icon: Eye, change: 18 },
  { label: "Avg. Engagement", value: "5.8%", icon: MessageSquare, change: -3 },
];

export default function InfluencerAnalysisPage({ params }: InfluencerAnalysisPageProps) {
  const { projectId } = use(params);
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [selectedInfluencer, setSelectedInfluencer] = useState(influencerRanking[0]);
  
  const engagementChartOption = {
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
      { name: "Engagement", type: "line", smooth: true, data: [5.2, 6.8, 7.5, 8.5], areaStyle: { opacity: 0.3 }, itemStyle: { color: "oklch(0.70 0.15 195)" } }
    ]
  };
  
  const followerGrowthOption = {
    tooltip: { trigger: "axis" },
    grid: { left: "3%", right: "4%", bottom: "3%", top: "10%", containLabel: true },
    xAxis: { 
      type: "category", 
      data: influencerRanking.slice(0, 5).map(i => i.handle),
      axisLabel: { color: isDark ? "#737373" : "#a3a3a3", fontSize: 10 }
    },
    yAxis: { 
      type: "value",
      axisLabel: { color: isDark ? "#737373" : "#a3a3a3", formatter: "{value}%" },
      splitLine: { lineStyle: { color: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" } }
    },
    series: [
      { 
        name: "Growth", 
        type: "bar", 
        data: influencerRanking.slice(0, 5).map(i => ({
          value: i.followerGrowth,
          itemStyle: { color: i.followerGrowth >= 10 ? "oklch(0.65 0.17 155)" : "oklch(0.70 0.15 195)" }
        }))
      }
    ]
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <UserCheck className="h-7 w-7 text-primary" />
            {t("influencerAnalysis.title")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("influencerAnalysis.subtitle")}
          </p>
        </div>
        
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewStats.map((stat, i) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="glass">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <stat.icon className="h-4 w-4 text-primary" />
                  </div>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-xs",
                      stat.change >= 0 ? "border-green-500/30 text-green-500" : "border-red-500/30 text-red-500"
                    )}
                  >
                    {stat.change >= 0 ? "+" : ""}{stat.change}%
                  </Badge>
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
      
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Ranking */}
        <Card className="glass lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Star className="h-4 w-4 text-primary" />
              Influencer Ranking
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/30">
              {influencerRanking.map((inf) => (
                <button
                  key={inf.rank}
                  onClick={() => setSelectedInfluencer(inf)}
                  className={cn(
                    "w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors text-left",
                    selectedInfluencer.rank === inf.rank && "bg-primary/5"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                    inf.rank === 1 ? "bg-amber-500/20 text-amber-500" :
                    inf.rank === 2 ? "bg-gray-400/20 text-gray-400" :
                    inf.rank === 3 ? "bg-orange-500/20 text-orange-500" :
                    "bg-muted text-muted-foreground"
                  )}>
                    #{inf.rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{inf.name}</p>
                    <p className="text-xs text-muted-foreground">{inf.handle}</p>
                  </div>
                  <Badge variant="secondary">{inf.score}</Badge>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Influencer Details */}
        <Card className="glass lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarFallback className="bg-primary/10 text-primary text-xl">
                  {selectedInfluencer.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg">{selectedInfluencer.name}</CardTitle>
                <p className="text-muted-foreground">{selectedInfluencer.handle}</p>
              </div>
              <Badge className="ml-auto text-lg px-3 py-1" variant="outline">
                <Star className="h-4 w-4 mr-1 fill-amber-500 text-amber-500" />
                {selectedInfluencer.score}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview">
              <TabsList className="mb-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="posts">Sample Posts</TabsTrigger>
                <TabsTrigger value="trends">Trends</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="p-3 rounded-lg bg-muted/30 text-center">
                    <p className="text-lg font-bold">{selectedInfluencer.mentions}</p>
                    <p className="text-xs text-muted-foreground">Mentions</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 text-center">
                    <p className="text-lg font-bold">{selectedInfluencer.reach}</p>
                    <p className="text-xs text-muted-foreground">Reach</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 text-center">
                    <p className="text-lg font-bold">{selectedInfluencer.engagement}</p>
                    <p className="text-xs text-muted-foreground">Engagement</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 text-center">
                    <p className="text-lg font-bold">{selectedInfluencer.sentiment}%</p>
                    <p className="text-xs text-muted-foreground">Positive</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Sentiment when mentioning brand</h4>
                  <div className="flex h-4 rounded-full overflow-hidden">
                    <div className="bg-green-500" style={{ width: `${selectedInfluencer.sentiment}%` }} />
                    <div className="bg-gray-400" style={{ width: `${100 - selectedInfluencer.sentiment - 5}%` }} />
                    <div className="bg-red-500" style={{ width: `5%` }} />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="posts">
                {selectedInfluencer.posts.length > 0 ? (
                  <div className="space-y-3">
                    {selectedInfluencer.posts.map((post, i) => (
                      <div key={i} className="p-4 rounded-lg bg-muted/30">
                        <p className="text-sm mb-2">{post.content}</p>
                        <p className="text-xs text-muted-foreground">❤️ {post.engagement} engagements</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No sample posts available</p>
                )}
              </TabsContent>
              
              <TabsContent value="trends">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Engagement Trend</h4>
                    <ReactECharts option={engagementChartOption} style={{ height: "150px" }} opts={{ renderer: "svg" }} />
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium">Follower Growth</p>
                      <p className="text-sm text-muted-foreground">+{selectedInfluencer.followerGrowth}% this month</p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      
      {/* Follower Growth Chart */}
      <Card className="glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Follower Growth Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ReactECharts option={followerGrowthOption} style={{ height: "250px" }} opts={{ renderer: "svg" }} />
        </CardContent>
      </Card>
    </div>
  );
}










