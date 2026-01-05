"use client";

import { useState, useMemo } from "react";
import { 
  ExternalLink, 
  MoreHorizontal, 
  Tag, 
  FileText, 
  VolumeX, 
  Trash2,
  Bookmark,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { formatDistanceToNow, isWithinInterval } from "date-fns";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { useMentionsFilterStore } from "@/stores";

interface MentionsTableProps {
  projectId: string;
}

// Extended mock data
const mockMentions = [
  {
    id: "1",
    title: "Tech Company Announces Revolutionary AI Product Launch",
    snippet: "In a groundbreaking announcement today, the company revealed its new AI-powered platform that promises to transform the industry...",
    source: { name: "TechCrunch", type: "news", icon: "TC" },
    publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    sentiment: "positive" as const,
    sentimentScore: 0.85,
    influenceScore: 8.5,
    reach: 125000,
    country: "US",
    language: "en",
    visited: false,
    saved: true,
    author: "@techcrunch",
  },
  {
    id: "2",
    title: "Market Analysis: Shifting Consumer Preferences",
    snippet: "Recent market research indicates a significant shift in consumer behavior, with more users adopting digital-first solutions...",
    source: { name: "Bloomberg", type: "news", icon: "BB" },
    publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    sentiment: "neutral" as const,
    sentimentScore: 0.12,
    influenceScore: 9.2,
    reach: 450000,
    country: "US",
    language: "en",
    visited: true,
    saved: false,
    author: "@bloomberg",
  },
  {
    id: "3",
    title: "Пользователи жалуются на новое обновление",
    snippet: "Многие пользователи выразили недовольство последним обновлением приложения, отмечая проблемы с производительностью...",
    source: { name: "Twitter", type: "twitter", icon: "X" },
    publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
    sentiment: "negative" as const,
    sentimentScore: -0.72,
    influenceScore: 6.1,
    reach: 28000,
    country: "RU",
    language: "ru",
    visited: false,
    saved: false,
    author: "@user_ru",
  },
  {
    id: "4",
    title: "Industry Expert Reviews New Features",
    snippet: "Our in-depth analysis of the latest feature release shows promising improvements in user experience and performance metrics...",
    source: { name: "Medium", type: "blogs", icon: "M" },
    publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    sentiment: "positive" as const,
    sentimentScore: 0.68,
    influenceScore: 7.3,
    reach: 15000,
    country: "UK",
    language: "en",
    visited: true,
    saved: true,
    author: "@tech_writer",
  },
  {
    id: "5",
    title: "Competitor Comparison Video Goes Viral",
    snippet: "A YouTube creator's comparison video has gained significant traction, highlighting key differences between market leaders...",
    source: { name: "YouTube", type: "youtube", icon: "YT" },
    publishedAt: new Date(Date.now() - 18 * 60 * 60 * 1000),
    sentiment: "neutral" as const,
    sentimentScore: 0.05,
    influenceScore: 8.8,
    reach: 890000,
    country: "US",
    language: "en",
    visited: false,
    saved: false,
    author: "@techreviewer",
  },
  {
    id: "6",
    title: "CEO Interview: Future of AI in Business",
    snippet: "In an exclusive interview, the CEO shared insights on how AI is reshaping business operations and customer experiences...",
    source: { name: "Forbes", type: "news", icon: "FB" },
    publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    sentiment: "positive" as const,
    sentimentScore: 0.78,
    influenceScore: 9.5,
    reach: 320000,
    country: "US",
    language: "en",
    visited: false,
    saved: false,
    author: "@forbes",
  },
  {
    id: "7",
    title: "Community Discussion on New Pricing",
    snippet: "Users on Reddit are actively discussing the recent pricing changes, with mixed reactions from the community...",
    source: { name: "Reddit", type: "websites", icon: "RD" },
    publishedAt: new Date(Date.now() - 36 * 60 * 60 * 1000),
    sentiment: "negative" as const,
    sentimentScore: -0.45,
    influenceScore: 5.8,
    reach: 45000,
    country: "US",
    language: "en",
    visited: true,
    saved: false,
    author: "@reddit_user",
  },
  {
    id: "8",
    title: "Instagram Influencer Promotes Product",
    snippet: "A popular lifestyle influencer shared a positive review of the product, reaching millions of followers...",
    source: { name: "Instagram", type: "instagram", icon: "IG" },
    publishedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
    sentiment: "positive" as const,
    sentimentScore: 0.92,
    influenceScore: 8.9,
    reach: 1200000,
    country: "UK",
    language: "en",
    visited: false,
    saved: true,
    author: "@lifestyle_guru",
  },
  {
    id: "9",
    title: "LinkedIn Post About Industry Trends",
    snippet: "A thought leader shared analysis of current market trends and predictions for the upcoming quarter...",
    source: { name: "LinkedIn", type: "linkedin", icon: "LI" },
    publishedAt: new Date(Date.now() - 60 * 60 * 60 * 1000),
    sentiment: "neutral" as const,
    sentimentScore: 0.15,
    influenceScore: 7.1,
    reach: 85000,
    country: "DE",
    language: "en",
    visited: true,
    saved: false,
    author: "@industry_expert",
  },
  {
    id: "10",
    title: "TikTok Video Review Gets Millions of Views",
    snippet: "A viral TikTok review of the latest product features has garnered attention from younger demographics...",
    source: { name: "TikTok", type: "tiktok", icon: "TT" },
    publishedAt: new Date(Date.now() - 72 * 60 * 60 * 1000),
    sentiment: "positive" as const,
    sentimentScore: 0.81,
    influenceScore: 8.2,
    reach: 2500000,
    country: "US",
    language: "en",
    visited: false,
    saved: false,
    author: "@tiktok_star",
  },
];

const sentimentColors = {
  positive: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  neutral: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
  negative: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
};

const countryFlags: Record<string, string> = {
  US: "🇺🇸",
  UK: "🇬🇧",
  RU: "🇷🇺",
  KZ: "🇰🇿",
  DE: "🇩🇪",
};

export function MentionsTable({ projectId }: MentionsTableProps) {
  const { filters } = useMentionsFilterStore();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  
  // Apply filters with safe defaults
  const filteredMentions = useMemo(() => {
    if (!filters) return mockMentions;
    
    return mockMentions.filter((mention) => {
      // Date range filter
      if (filters.dateRange?.from && filters.dateRange?.to) {
        try {
          if (!isWithinInterval(mention.publishedAt, {
            start: filters.dateRange.from,
            end: filters.dateRange.to,
          })) {
            return false;
          }
        } catch {
          // Invalid date range, skip filter
        }
      }
      
      // Source filter
      if (filters.sources?.length > 0) {
        if (!filters.sources.includes(mention.source.type)) {
          return false;
        }
      }
      
      // Sentiment filter
      if (filters.sentiments?.length > 0) {
        if (!filters.sentiments.includes(mention.sentiment)) {
          return false;
        }
      }
      
      // Influence score filter
      if (filters.influenceRange) {
        if (mention.influenceScore < filters.influenceRange[0] || 
            mention.influenceScore > filters.influenceRange[1]) {
          return false;
        }
      }
      
      // Author filter
      if (filters.author) {
        if (!mention.author.toLowerCase().includes(filters.author.toLowerCase())) {
          return false;
        }
      }
      
      // Visited filter
      if (filters.visited === "visited" && !mention.visited) return false;
      if (filters.visited === "unvisited" && mention.visited) return false;
      
      // Saved filter
      if (filters.saved === "saved" && !mention.saved) return false;
      if (filters.saved === "unsaved" && mention.saved) return false;
      
      return true;
    });
  }, [filters]);
  
  // Pagination
  const totalPages = Math.ceil(filteredMentions.length / perPage);
  const paginatedMentions = filteredMentions.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );
  
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };
  
  const toggleAll = () => {
    if (selectedIds.length === paginatedMentions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedMentions.map((m) => m.id));
    }
  };
  
  const formatReach = (reach: number) => {
    if (reach >= 1000000) return `${(reach / 1000000).toFixed(1)}M`;
    if (reach >= 1000) return `${(reach / 1000).toFixed(1)}K`;
    return reach.toString();
  };
  
  return (
    <div className="overflow-x-auto">
      {/* Results info */}
      {filteredMentions.length !== mockMentions.length && (
        <div className="px-4 py-2 bg-muted/30 border-b border-border/50">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{filteredMentions.length}</span> of {mockMentions.length} mentions based on filters
          </p>
        </div>
      )}
      
      <table className="w-full">
        <thead>
          <tr className="border-b border-border/50 text-left">
            <th className="p-4 w-12">
              <Checkbox
                checked={selectedIds.length === paginatedMentions.length && paginatedMentions.length > 0}
                onCheckedChange={toggleAll}
              />
            </th>
            <th className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Mention
            </th>
            <th className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wide w-24">
              Sentiment
            </th>
            <th className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wide w-20 text-center">
              Score
            </th>
            <th className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wide w-24 text-right">
              Reach
            </th>
            <th className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wide w-20 text-center">
              Location
            </th>
            <th className="p-4 w-12"></th>
          </tr>
        </thead>
        <tbody>
          {paginatedMentions.length === 0 ? (
            <tr>
              <td colSpan={7} className="p-8 text-center">
                <div className="flex flex-col items-center gap-2">
                  <p className="text-muted-foreground">No mentions match your filters</p>
                  <p className="text-sm text-muted-foreground/70">Try adjusting your filter criteria</p>
                </div>
              </td>
            </tr>
          ) : (
            paginatedMentions.map((mention) => (
              <tr
                key={mention.id}
                className={cn(
                  "border-b border-border/30 hover:bg-muted/30 transition-colors cursor-pointer",
                  mention.visited && "opacity-70"
                )}
              >
                <td className="p-4" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.includes(mention.id)}
                    onCheckedChange={() => toggleSelection(mention.id)}
                  />
                </td>
                <td className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-9 w-9 rounded-lg flex-shrink-0">
                      <AvatarFallback className="rounded-lg text-xs font-medium bg-primary/10">
                        {mention.source.icon}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-muted-foreground">
                          {mention.source.name}
                        </span>
                        <span className="text-xs text-muted-foreground/50">•</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(mention.publishedAt, { addSuffix: true })}
                        </span>
                        {mention.saved && (
                          <Bookmark className="h-3 w-3 text-primary fill-primary" />
                        )}
                      </div>
                      <h4 className="font-medium text-sm line-clamp-1 mb-1">
                        {mention.title}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {mention.snippet}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <Badge
                    variant="outline"
                    className={cn(
                      "capitalize text-xs font-medium",
                      sentimentColors[mention.sentiment]
                    )}
                  >
                    {mention.sentiment}
                  </Badge>
                </td>
                <td className="p-4 text-center">
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-semibold">
                      {mention.influenceScore.toFixed(1)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      influence
                    </span>
                  </div>
                </td>
                <td className="p-4 text-right">
                  <span className="text-sm font-medium">
                    {formatReach(mention.reach)}
                  </span>
                </td>
                <td className="p-4 text-center">
                  <span className="text-lg" title={mention.country}>
                    {countryFlags[mention.country] || "🌍"}
                  </span>
                </td>
                <td className="p-4" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Go to source
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Eye className="h-4 w-4 mr-2" />
                        View details
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Tag className="h-4 w-4 mr-2" />
                        Add tag
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <FileText className="h-4 w-4 mr-2" />
                        Add to report
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Bookmark className="h-4 w-4 mr-2" />
                        {mention.saved ? "Unsave" : "Save"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <VolumeX className="h-4 w-4 mr-2" />
                        Mute source
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      
      {/* Pagination */}
      <div className="flex items-center justify-between p-4 border-t border-border/50">
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium">{(currentPage - 1) * perPage + 1}-{Math.min(currentPage * perPage, filteredMentions.length)}</span> of <span className="font-medium">{filteredMentions.length}</span> mentions
          </p>
          <Select value={String(perPage)} onValueChange={(v) => { setPerPage(Number(v)); setCurrentPage(1); }}>
            <SelectTrigger className="w-[100px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 / page</SelectItem>
              <SelectItem value="25">25 / page</SelectItem>
              <SelectItem value="50">50 / page</SelectItem>
              <SelectItem value="100">100 / page</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          
          {/* Page numbers */}
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  className="w-8 p-0"
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          
          <Button 
            variant="outline" 
            size="sm"
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={() => setCurrentPage(p => p + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
