"use client";

import { use, useState } from "react";
import { motion } from "framer-motion";
import {
  Tags,
  Search,
  Plus,
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
  Eye,
  Merge,
  Trash2,
  ExternalLink,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface TopicsPageProps {
  params: Promise<{ projectId: string }>;
}

const topicsData = [
  {
    id: "1",
    name: "Product Launch",
    description: "Discussions about new product releases and features",
    mentions: 3421,
    reach: "1.2M",
    shareOfVoice: 28,
    sentiment: { positive: 72, neutral: 18, negative: 10 },
    trend: [30, 45, 38, 52, 48, 65, 72],
    change: 15,
  },
  {
    id: "2",
    name: "Customer Support",
    description: "Mentions related to customer service and support",
    mentions: 2156,
    reach: "890K",
    shareOfVoice: 18,
    sentiment: { positive: 45, neutral: 35, negative: 20 },
    trend: [40, 38, 42, 35, 48, 52, 45],
    change: -5,
  },
  {
    id: "3",
    name: "AI Features",
    description: "Discussions about artificial intelligence capabilities",
    mentions: 1892,
    reach: "750K",
    shareOfVoice: 15,
    sentiment: { positive: 85, neutral: 12, negative: 3 },
    trend: [20, 35, 45, 55, 68, 82, 95],
    change: 42,
  },
  {
    id: "4",
    name: "Pricing",
    description: "Conversations about pricing and value",
    mentions: 1234,
    reach: "450K",
    shareOfVoice: 10,
    sentiment: { positive: 38, neutral: 42, negative: 20 },
    trend: [50, 48, 52, 45, 42, 38, 35],
    change: -12,
  },
  {
    id: "5",
    name: "Competitor Comparison",
    description: "Mentions comparing with competitors",
    mentions: 987,
    reach: "320K",
    shareOfVoice: 8,
    sentiment: { positive: 55, neutral: 30, negative: 15 },
    trend: [25, 30, 35, 42, 38, 45, 50],
    change: 8,
  },
  {
    id: "6",
    name: "Integration",
    description: "Discussions about third-party integrations",
    mentions: 756,
    reach: "280K",
    shareOfVoice: 6,
    sentiment: { positive: 68, neutral: 25, negative: 7 },
    trend: [35, 40, 38, 45, 50, 55, 60],
    change: 18,
  },
];

const topMentions = [
  { title: "New AI feature revolutionizes workflow", source: "TechCrunch", sentiment: "positive" },
  { title: "Users report significant productivity gains", source: "Medium", sentiment: "positive" },
  { title: "Comparison with competitor shows advantages", source: "Forbes", sentiment: "neutral" },
];

const topSources = [
  { name: "Twitter/X", mentions: 1234 },
  { name: "TechCrunch", mentions: 456 },
  { name: "Reddit", mentions: 321 },
];

export default function TopicsPage({ params }: TopicsPageProps) {
  const { projectId } = use(params);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<typeof topicsData[0] | null>(null);
  
  const filteredTopics = topicsData.filter((topic) =>
    topic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    topic.description.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Tags className="h-7 w-7 text-primary" />
            AI Topic Analysis
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-detected topics from your media mentions
          </p>
        </div>
        
        <Button size="sm" className="glow-sm">
          <Plus className="h-4 w-4 mr-2" />
          Create Topic
        </Button>
      </div>
      
      {/* Search */}
      <Card className="glass">
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Topics List */}
      <div className="space-y-4">
        {filteredTopics.map((topic, index) => (
          <motion.div
            key={topic.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="glass hover:bg-card/80 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Topic Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{topic.name}</h3>
                      <Badge variant="outline" className={cn(
                        "text-xs",
                        topic.change >= 0 
                          ? "border-green-500/30 text-green-500" 
                          : "border-red-500/30 text-red-500"
                      )}>
                        {topic.change >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                        {topic.change >= 0 ? "+" : ""}{topic.change}%
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{topic.description}</p>
                    
                    {/* Stats */}
                    <div className="flex flex-wrap gap-6">
                      <div>
                        <p className="text-xs text-muted-foreground">Mentions</p>
                        <p className="font-semibold">{topic.mentions.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Reach</p>
                        <p className="font-semibold">{topic.reach}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Share of Voice</p>
                        <p className="font-semibold">{topic.shareOfVoice}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Sentiment</p>
                        <div className="flex items-center gap-1 mt-1">
                          <div className="flex h-2 w-24 rounded-full overflow-hidden">
                            <div className="bg-green-500" style={{ width: `${topic.sentiment.positive}%` }} />
                            <div className="bg-gray-400" style={{ width: `${topic.sentiment.neutral}%` }} />
                            <div className="bg-red-500" style={{ width: `${topic.sentiment.negative}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Sparkline */}
                  <div className="hidden sm:block w-32 h-12">
                    <svg viewBox="0 0 100 40" className="w-full h-full">
                      <polyline
                        fill="none"
                        stroke="oklch(0.70 0.15 195)"
                        strokeWidth="2"
                        points={topic.trend.map((v, i) => `${i * (100 / (topic.trend.length - 1))},${40 - (v / 100) * 40}`).join(" ")}
                      />
                    </svg>
                  </div>
                  
                  {/* Actions */}
                  <Dialog>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DialogTrigger asChild>
                          <DropdownMenuItem onClick={() => setSelectedTopic(topic)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                        </DialogTrigger>
                        <DropdownMenuItem>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Mentions
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Merge className="h-4 w-4 mr-2" />
                          Merge Topic
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Topic
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    
                    {/* Topic Detail Modal */}
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>{selectedTopic?.name}</DialogTitle>
                        <DialogDescription>{selectedTopic?.description}</DialogDescription>
                      </DialogHeader>
                      
                      {selectedTopic && (
                        <div className="space-y-6 mt-4">
                          {/* Stats Grid */}
                          <div className="grid grid-cols-4 gap-4">
                            <div className="p-4 rounded-lg bg-muted/30">
                              <p className="text-xs text-muted-foreground">Mentions</p>
                              <p className="text-xl font-bold">{selectedTopic.mentions.toLocaleString()}</p>
                            </div>
                            <div className="p-4 rounded-lg bg-muted/30">
                              <p className="text-xs text-muted-foreground">Reach</p>
                              <p className="text-xl font-bold">{selectedTopic.reach}</p>
                            </div>
                            <div className="p-4 rounded-lg bg-muted/30">
                              <p className="text-xs text-muted-foreground">Share of Voice</p>
                              <p className="text-xl font-bold">{selectedTopic.shareOfVoice}%</p>
                            </div>
                            <div className="p-4 rounded-lg bg-muted/30">
                              <p className="text-xs text-muted-foreground">Change</p>
                              <p className={cn("text-xl font-bold", selectedTopic.change >= 0 ? "text-green-500" : "text-red-500")}>
                                {selectedTopic.change >= 0 ? "+" : ""}{selectedTopic.change}%
                              </p>
                            </div>
                          </div>
                          
                          {/* Trend Chart */}
                          <div>
                            <h4 className="font-medium mb-3">Trend (Last 7 days)</h4>
                            <div className="h-32 flex items-end gap-1">
                              {selectedTopic.trend.map((value, i) => (
                                <div
                                  key={i}
                                  className="flex-1 bg-primary/20 hover:bg-primary/40 transition-colors rounded-t"
                                  style={{ height: `${value}%` }}
                                />
                              ))}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-6">
                            {/* Top Mentions */}
                            <div>
                              <h4 className="font-medium mb-3">Top Mentions</h4>
                              <div className="space-y-2">
                                {topMentions.map((mention, i) => (
                                  <div key={i} className="p-2 rounded-lg bg-muted/30 text-sm">
                                    <p className="font-medium truncate">{mention.title}</p>
                                    <p className="text-xs text-muted-foreground">{mention.source}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            {/* Top Sources */}
                            <div>
                              <h4 className="font-medium mb-3">Top Sources</h4>
                              <div className="space-y-2">
                                {topSources.map((source, i) => (
                                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                                    <span className="text-sm">{source.name}</span>
                                    <Badge variant="secondary">{source.mentions}</Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}










