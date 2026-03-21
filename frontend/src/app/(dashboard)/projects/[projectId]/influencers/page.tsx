"use client";

import { use, useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Search,
  Download,
  ExternalLink,
  MoreHorizontal,
  UserMinus,
  UserPlus,
  Eye,
  TrendingUp,
  TrendingDown,
  Twitter,
  Youtube,
  Instagram,
  Loader2,
} from "lucide-react";
import { useInfluencers } from "@/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface InfluencersPageProps {
  params: Promise<{ projectId: string }>;
}

const platformIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  twitter: Twitter,
  youtube: Youtube,
  instagram: Instagram,
};

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
  return String(num);
}

export default function InfluencersPage({ params }: InfluencersPageProps) {
  const { projectId } = use(params);
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const { data: apiInfluencers, isLoading } = useInfluencers(projectId);

  const influencersData = (apiInfluencers || []).map((inf: any) => {
    const sd = inf.sentimentDistribution || inf.sentiment_distribution || {};
    return {
      id: String(inf.id || ""),
      name: inf.displayName || inf.display_name || inf.handle || "",
      handle: inf.handle || "",
      platform: (inf.platform || "twitter").toLowerCase(),
      avatar: inf.avatar || "",
      mentions: inf.mentionsCount || inf.mentions_count || inf.mentions || 0,
      reach: typeof inf.reach === "number" ? formatNumber(inf.reach) : (inf.reach || "0"),
      followers: typeof inf.followers === "number" ? formatNumber(inf.followers) : (inf.followers || "0"),
      shareOfVoice: inf.shareOfVoice || inf.share_of_voice || 0,
      influenceScore: inf.influenceScore || inf.influence_score || 0,
      sentiment: {
        positive: sd.positive || 0,
        neutral: sd.neutral || 0,
        negative: sd.negative || 0,
      },
      recentPosts: inf.recentPosts || inf.recent_posts || [],
    };
  });

  const [selectedInfluencer, setSelectedInfluencer] = useState<typeof influencersData[0] | null>(null);

  const filteredInfluencers = influencersData.filter((inf: any) => {
    const matchesSearch = inf.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          inf.handle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlatform = platformFilter === "all" || inf.platform === platformFilter;
    return matchesSearch && matchesPlatform;
  });
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
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
            <Users className="h-7 w-7 text-primary" />
            Influencers
          </h1>
          <p className="text-muted-foreground mt-1">
            Track and manage influencers mentioning your brand
          </p>
        </div>
        
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>
      
      {/* Filters */}
      <Card className="glass">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search influencers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All platforms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="twitter">Twitter/X</SelectItem>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      {/* Influencers Table */}
      <Card className="glass">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-muted-foreground uppercase border-b border-border/50">
                  <th className="p-4">Influencer</th>
                  <th className="p-4 text-center">Platform</th>
                  <th className="p-4 text-right">Mentions</th>
                  <th className="p-4 text-right">Reach</th>
                  <th className="p-4 text-right">Followers</th>
                  <th className="p-4 text-right">Share of Voice</th>
                  <th className="p-4 text-center">Score</th>
                  <th className="p-4 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {filteredInfluencers.map((influencer, index) => {
                  const PlatformIcon = platformIcons[influencer.platform] || Twitter;
                  return (
                    <motion.tr
                      key={influencer.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-border/30 hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={influencer.avatar} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {influencer.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{influencer.name}</p>
                            <p className="text-sm text-muted-foreground">{influencer.handle}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <PlatformIcon className="h-5 w-5 mx-auto text-muted-foreground" />
                      </td>
                      <td className="p-4 text-right font-medium">{influencer.mentions}</td>
                      <td className="p-4 text-right">{influencer.reach}</td>
                      <td className="p-4 text-right">{influencer.followers}</td>
                      <td className="p-4 text-right">{influencer.shareOfVoice}%</td>
                      <td className="p-4 text-center">
                        <Badge variant="secondary" className="font-semibold">
                          {influencer.influenceScore}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Dialog>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DialogTrigger asChild>
                                <DropdownMenuItem onClick={() => setSelectedInfluencer(influencer)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Profile
                                </DropdownMenuItem>
                              </DialogTrigger>
                              <DropdownMenuItem>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Open Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <UserPlus className="h-4 w-4 mr-2" />
                                Add to Campaign
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive">
                                <UserMinus className="h-4 w-4 mr-2" />
                                Remove from List
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          
                          {/* Influencer Detail Modal */}
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-3">
                                <Avatar className="h-12 w-12">
                                  <AvatarFallback className="bg-primary/10 text-primary text-lg">
                                    {selectedInfluencer?.name.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p>{selectedInfluencer?.name}</p>
                                  <p className="text-sm font-normal text-muted-foreground">{selectedInfluencer?.handle}</p>
                                </div>
                              </DialogTitle>
                            </DialogHeader>
                            
                            {selectedInfluencer && (
                              <div className="space-y-6 mt-4">
                                {/* Stats */}
                                <div className="grid grid-cols-4 gap-4">
                                  <div className="p-4 rounded-lg bg-muted/30 text-center">
                                    <p className="text-2xl font-bold">{selectedInfluencer.mentions}</p>
                                    <p className="text-xs text-muted-foreground">Mentions</p>
                                  </div>
                                  <div className="p-4 rounded-lg bg-muted/30 text-center">
                                    <p className="text-2xl font-bold">{selectedInfluencer.reach}</p>
                                    <p className="text-xs text-muted-foreground">Reach</p>
                                  </div>
                                  <div className="p-4 rounded-lg bg-muted/30 text-center">
                                    <p className="text-2xl font-bold">{selectedInfluencer.followers}</p>
                                    <p className="text-xs text-muted-foreground">Followers</p>
                                  </div>
                                  <div className="p-4 rounded-lg bg-muted/30 text-center">
                                    <p className="text-2xl font-bold text-primary">{selectedInfluencer.influenceScore}</p>
                                    <p className="text-xs text-muted-foreground">Score</p>
                                  </div>
                                </div>
                                
                                {/* Sentiment */}
                                <div>
                                  <h4 className="font-medium mb-3">Sentiment Distribution</h4>
                                  <div className="flex h-4 rounded-full overflow-hidden">
                                    <div className="bg-green-500" style={{ width: `${selectedInfluencer.sentiment.positive}%` }} />
                                    <div className="bg-gray-400" style={{ width: `${selectedInfluencer.sentiment.neutral}%` }} />
                                    <div className="bg-red-500" style={{ width: `${selectedInfluencer.sentiment.negative}%` }} />
                                  </div>
                                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                                    <span>Positive: {selectedInfluencer.sentiment.positive}%</span>
                                    <span>Neutral: {selectedInfluencer.sentiment.neutral}%</span>
                                    <span>Negative: {selectedInfluencer.sentiment.negative}%</span>
                                  </div>
                                </div>
                                
                                {/* Recent Posts */}
                                {selectedInfluencer.recentPosts.length > 0 && (
                                  <div>
                                    <h4 className="font-medium mb-3">Recent Posts</h4>
                                    <div className="space-y-3">
                                      {selectedInfluencer.recentPosts.map((post: any, i: number) => (
                                        <div key={i} className="p-3 rounded-lg bg-muted/30">
                                          <p className="text-sm">{post.content}</p>
                                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                            <span>{post.date}</span>
                                            <span>❤️ {post.engagement}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                <div className="flex gap-2">
                                  <Button className="flex-1">
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    Add to Campaign
                                  </Button>
                                  <Button variant="outline">
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    View Profile
                                  </Button>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}










