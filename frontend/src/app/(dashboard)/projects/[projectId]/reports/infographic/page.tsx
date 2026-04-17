"use client";

import { use, useState } from "react";
import { motion } from "framer-motion";
import {
  Image,
  Download,
  RefreshCw,
  Share2,
  MessageSquare,
  TrendingUp,
  Users,
  Globe,
  Hash,
  ThumbsUp,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useProject, useTopics, useInfluencers, useTranslation } from "@/hooks";

interface InfographicPageProps {
  params: Promise<{ projectId: string }>;
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export default function InfographicPage({ params }: InfographicPageProps) {
  const { projectId } = use(params);
  const { t } = useTranslation();
  const { data: project, isLoading: isProjectLoading } = useProject(projectId);
  const { data: topics, isLoading: isTopicsLoading } = useTopics(projectId);
  const { data: influencers, isLoading: isInfluencersLoading } = useInfluencers(projectId);
  const [isGenerating, setIsGenerating] = useState(false);

  const isLoading = isProjectLoading || isTopicsLoading || isInfluencersLoading;

  const stats = project?.stats as Record<string, number> | undefined;
  const totalMentions = stats?.total_mentions ?? stats?.totalMentions ?? 0;
  const reach = stats?.total_reach ?? stats?.totalReach ?? 0;
  const positivePercent = stats?.positive_percentage ?? stats?.positivePercentage ?? 0;
  const negativePercent = stats?.negative_percentage ?? stats?.negativePercentage ?? 0;
  const neutralPercent = Math.max(0, 100 - positivePercent - negativePercent);

  const topTopics = (topics ?? []).slice(0, 4).map(t => ({
    name: t.name,
    percentage: Math.round(t.shareOfVoice * 100),
  }));

  const topInfluencers = (influencers ?? []).slice(0, 3).map(inf => ({
    name: inf.handle || inf.displayName,
    followers: formatCompact(inf.followers),
  }));
  
  const handleRegenerate = async () => {
    setIsGenerating(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsGenerating(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Image className="h-7 w-7 text-primary" />
            {t("reports.infographic.title")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("reports.infographic.subtitle")}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={isGenerating}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isGenerating && "animate-spin")} />
            Regenerate
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button className="glow-sm">
            <Download className="h-4 w-4 mr-2" />
            Export PNG
          </Button>
        </div>
      </div>
      
      {/* Infographic Preview */}
      <Card className="glass overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-gradient-to-br from-primary/10 via-background to-accent/10 p-8">
            {/* Infographic Content */}
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Header */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <h2 className="font-display text-3xl font-bold mb-2">
                  Media Monitoring Report
                </h2>
                <p className="text-muted-foreground">{new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
              </motion.div>
              
              {/* Key Metrics */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-4 gap-4"
              >
                {[
                  { icon: MessageSquare, label: "Mentions", value: totalMentions.toLocaleString() },
                  { icon: Users, label: "Reach", value: formatCompact(reach) },
                  { icon: TrendingUp, label: "Score", value: `${stats?.presence_score ?? stats?.presenceScore ?? 0}` },
                  { icon: ThumbsUp, label: "Positive", value: `${positivePercent}%` },
                ].map((stat, i) => (
                  <div key={stat.label} className="text-center p-4 rounded-xl bg-card/50 backdrop-blur">
                    <stat.icon className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </motion.div>
              
              {/* Sentiment */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="p-6 rounded-xl bg-card/50 backdrop-blur"
              >
                <h3 className="font-semibold mb-4 text-center">Sentiment Distribution</h3>
                <div className="flex h-8 rounded-full overflow-hidden mb-4">
                  <div className="bg-green-500 flex items-center justify-center text-white text-sm font-medium" style={{ width: `${positivePercent}%` }}>
                    {positivePercent}%
                  </div>
                  <div className="bg-gray-400 flex items-center justify-center text-white text-sm font-medium" style={{ width: `${neutralPercent}%` }}>
                    {neutralPercent}%
                  </div>
                  <div className="bg-red-500 flex items-center justify-center text-white text-sm font-medium" style={{ width: `${negativePercent}%` }}>
                    {negativePercent}%
                  </div>
                </div>
                <div className="flex justify-center gap-6 text-sm">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500" /> Positive</div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gray-400" /> Neutral</div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500" /> Negative</div>
                </div>
              </motion.div>
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* Top Topics */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="p-6 rounded-xl bg-card/50 backdrop-blur"
                >
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Top Topics
                  </h3>
                  <div className="space-y-3">
                    {topTopics.map((topic) => (
                      <div key={topic.name}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{topic.name}</span>
                          <span className="font-medium">{topic.percentage}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full" 
                            style={{ width: `${topic.percentage}%` }} 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
                
                {/* Top Countries */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="p-6 rounded-xl bg-card/50 backdrop-blur"
                >
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    Top Countries
                  </h3>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <p>No geographic data available yet.</p>
                  </div>
                </motion.div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* Top Influencers */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="p-6 rounded-xl bg-card/50 backdrop-blur"
                >
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Top Influencers
                  </h3>
                  <div className="space-y-3">
                    {topInfluencers.map((inf, i) => (
                      <div key={inf.name} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">
                            #{i + 1}
                          </div>
                          <span className="font-medium">{inf.name}</span>
                        </div>
                        <Badge variant="secondary">{inf.followers}</Badge>
                      </div>
                    ))}
                  </div>
                </motion.div>
                
                {/* Top Hashtags */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="p-6 rounded-xl bg-card/50 backdrop-blur"
                >
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Hash className="h-4 w-4 text-primary" />
                    Trending Hashtags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {(topics ?? []).slice(0, 5).map((t) => (
                      <Badge key={t.id} variant="outline" className="text-sm px-3 py-1">
                        #{t.name}
                      </Badge>
                    ))}
                  </div>
                </motion.div>
              </div>
              
              {/* Footer */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="text-center text-sm text-muted-foreground pt-4 border-t border-border/50"
              >
                Generated by Senti News • {new Date().toLocaleDateString()}
              </motion.div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}










