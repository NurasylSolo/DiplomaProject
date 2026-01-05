"use client";

import { use, useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  Send,
  Share2,
  Clock,
  UserPlus,
  MoreHorizontal,
  ExternalLink,
  MessageSquare,
  FileText,
  Twitter,
  Pencil,
  ChevronRight,
  BarChart3,
  Users,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface InsightsPageProps {
  params: Promise<{ projectId: string }>;
}

// Mock insights data
const insightsData = [
  {
    id: "1",
    type: "alert",
    severity: "high",
    title: "Negative mentions spike detected",
    description: "Negative mentions about your brand increased by 42% in the last 72 hours. Primary source: Twitter/X discussions about product issues.",
    metric: "+42%",
    metricLabel: "vs last week",
    actionable: true,
    category: "sentiment",
    timestamp: "2 hours ago",
  },
  {
    id: "2",
    type: "trend",
    severity: "medium",
    title: "Growing discussion in tech blogs",
    description: "Your brand is being mentioned 3x more frequently in technology blogs compared to last month. Focus topics: AI features and integrations.",
    metric: "+215%",
    metricLabel: "blog mentions",
    actionable: true,
    category: "reach",
    timestamp: "5 hours ago",
  },
  {
    id: "3",
    type: "recommendation",
    severity: "low",
    title: "Optimal posting time identified",
    description: "Based on engagement analysis, posting between 9-11 AM (local time) generates 67% more engagement than other time slots.",
    metric: "9-11 AM",
    metricLabel: "best time",
    actionable: true,
    category: "engagement",
    timestamp: "1 day ago",
  },
  {
    id: "4",
    type: "opportunity",
    severity: "medium",
    title: "Influencer collaboration potential",
    description: "3 high-influence tech reviewers have mentioned your brand positively. Consider reaching out for potential partnerships.",
    metric: "3",
    metricLabel: "influencers",
    actionable: true,
    category: "influencers",
    timestamp: "1 day ago",
  },
  {
    id: "5",
    type: "trend",
    severity: "low",
    title: "Positive sentiment in Kazakhstan market",
    description: "Mentions from Kazakhstan show 85% positive sentiment, significantly higher than global average of 72%.",
    metric: "85%",
    metricLabel: "positive",
    actionable: false,
    category: "geo",
    timestamp: "2 days ago",
  },
];

const summaryCards = [
  { label: "Total Mentions", value: "12.8K", change: "+12%", positive: true },
  { label: "Social Reach", value: "2.4M", change: "+8%", positive: true },
  { label: "Avg. Sentiment", value: "72%", change: "+5%", positive: true },
  { label: "Active Sources", value: "156", change: "-3", positive: false },
];

const recommendedActions = [
  { id: "1", icon: MessageSquare, label: "Draft PR Response", description: "Address the negative sentiment spike" },
  { id: "2", icon: Twitter, label: "Create Tweet Thread", description: "Highlight positive reviews" },
  { id: "3", icon: FileText, label: "Generate Weekly Report", description: "Summary for stakeholders" },
  { id: "4", icon: Users, label: "Contact Influencers", description: "Reach out to potential partners" },
];

const suggestedChannels = [
  { name: "Twitter/X", potential: "High", reason: "Active discussions" },
  { name: "Tech Blogs", potential: "High", reason: "Growing interest" },
  { name: "YouTube", potential: "Medium", reason: "Review videos" },
  { name: "LinkedIn", potential: "Medium", reason: "B2B audience" },
];

const severityColors = {
  high: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  low: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
};

const typeIcons = {
  alert: AlertTriangle,
  trend: TrendingUp,
  recommendation: Lightbulb,
  opportunity: Sparkles,
};

export default function InsightsPage({ params }: InsightsPageProps) {
  const { projectId } = use(params);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-primary" />
            AI Insights
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-generated insights and recommendations based on your media data
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Send className="h-4 w-4 mr-2" />
            Send to Email
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share Link
          </Button>
          <Button variant="outline" size="sm">
            <Clock className="h-4 w-4 mr-2" />
            Schedule
          </Button>
          <Button variant="outline" size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Recipients
          </Button>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, index) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="glass">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {card.label}
                </p>
                <div className="flex items-end justify-between mt-2">
                  <p className="text-2xl font-bold">{card.value}</p>
                  <span className={cn(
                    "text-sm font-medium flex items-center gap-1",
                    card.positive ? "text-green-500" : "text-red-500"
                  )}>
                    {card.positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {card.change}
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
      
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Insights Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Top Insights</h2>
            <Tabs defaultValue="all" className="w-auto">
              <TabsList className="h-8">
                <TabsTrigger value="all" className="text-xs px-3">All</TabsTrigger>
                <TabsTrigger value="alerts" className="text-xs px-3">Alerts</TabsTrigger>
                <TabsTrigger value="trends" className="text-xs px-3">Trends</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          <div className="space-y-4">
            {insightsData.map((insight, index) => {
              const TypeIcon = typeIcons[insight.type as keyof typeof typeIcons];
              return (
                <motion.div
                  key={insight.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="glass hover:bg-card/80 transition-colors group">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "p-2 rounded-lg",
                          severityColors[insight.severity as keyof typeof severityColors]
                        )}>
                          <TypeIcon className="h-5 w-5" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
                                {insight.title}
                              </h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                {insight.description}
                              </p>
                            </div>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit title
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  View details
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Send className="h-4 w-4 mr-2" />
                                  Share insight
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          
                          <div className="flex items-center gap-4 mt-3">
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold text-primary">{insight.metric}</span>
                              <span className="text-xs text-muted-foreground">{insight.metricLabel}</span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {insight.category}
                            </Badge>
                            <span className="text-xs text-muted-foreground ml-auto">
                              {insight.timestamp}
                            </span>
                          </div>
                          
                          {insight.actionable && (
                            <div className="flex gap-2 mt-3">
                              <Button size="sm" variant="outline" className="text-xs h-7">
                                Take Action
                                <ChevronRight className="h-3 w-3 ml-1" />
                              </Button>
                              <Button size="sm" variant="ghost" className="text-xs h-7">
                                Dismiss
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Recommended Actions */}
          <Card className="glass">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                Recommended Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recommendedActions.map((action) => (
                <button
                  key={action.id}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="p-2 rounded-lg bg-primary/10">
                    <action.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{action.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{action.description}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </CardContent>
          </Card>
          
          {/* Suggested Channels */}
          <Card className="glass">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                Suggested Channels
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {suggestedChannels.map((channel) => (
                  <div
                    key={channel.name}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{channel.name}</p>
                      <p className="text-xs text-muted-foreground">{channel.reason}</p>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs",
                        channel.potential === "High" 
                          ? "border-green-500/30 text-green-600 dark:text-green-400" 
                          : "border-amber-500/30 text-amber-600 dark:text-amber-400"
                      )}
                    >
                      {channel.potential}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Trend Chart Placeholder */}
          <Card className="glass">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Insight Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-32 flex items-end gap-1">
                {[40, 65, 45, 80, 55, 70, 90, 60, 75, 85, 65, 95].map((h, i) => (
                  <div 
                    key={i} 
                    className="flex-1 bg-gradient-to-t from-primary/20 to-primary rounded-t transition-all hover:from-primary/30 hover:to-primary"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground text-center mt-3">
                Last 12 weeks
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}










