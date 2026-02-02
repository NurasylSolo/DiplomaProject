"use client";

import { use, useState } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  Filter,
  Download,
  ExternalLink,
  MoreHorizontal,
  Globe,
  Shield,
  ShieldOff,
  Ban,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
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
import { useTranslation } from "@/hooks";

interface SourcesPageProps {
  params: Promise<{ projectId: string }>;
}

// Mock sources data
const mockSources = [
  {
    id: "1",
    name: "TechCrunch",
    type: "news",
    baseUrl: "https://techcrunch.com",
    mentions: 1247,
    visits: 892,
    influenceScore: 9.2,
    active: true,
    trusted: true,
    country: "US",
    language: "en",
    lastCrawled: new Date(Date.now() - 30 * 60 * 1000),
  },
  {
    id: "2",
    name: "Bloomberg",
    type: "news",
    baseUrl: "https://bloomberg.com",
    mentions: 892,
    visits: 654,
    influenceScore: 9.5,
    active: true,
    trusted: true,
    country: "US",
    language: "en",
    lastCrawled: new Date(Date.now() - 45 * 60 * 1000),
  },
  {
    id: "3",
    name: "Twitter/X",
    type: "social",
    baseUrl: "https://twitter.com",
    mentions: 5632,
    visits: 2341,
    influenceScore: 8.8,
    active: true,
    trusted: false,
    country: "US",
    language: "en",
    lastCrawled: new Date(Date.now() - 5 * 60 * 1000),
  },
  {
    id: "4",
    name: "Tengrinews.kz",
    type: "news",
    baseUrl: "https://tengrinews.kz",
    mentions: 423,
    visits: 312,
    influenceScore: 7.8,
    active: true,
    trusted: true,
    country: "KZ",
    language: "ru",
    lastCrawled: new Date(Date.now() - 60 * 60 * 1000),
  },
  {
    id: "5",
    name: "YouTube",
    type: "video",
    baseUrl: "https://youtube.com",
    mentions: 1856,
    visits: 987,
    influenceScore: 9.0,
    active: true,
    trusted: false,
    country: "US",
    language: "en",
    lastCrawled: new Date(Date.now() - 15 * 60 * 1000),
  },
  {
    id: "6",
    name: "Medium",
    type: "blog",
    baseUrl: "https://medium.com",
    mentions: 634,
    visits: 445,
    influenceScore: 7.2,
    active: false,
    trusted: false,
    country: "US",
    language: "en",
    lastCrawled: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
];

const typeColors: Record<string, string> = {
  news: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  social: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  video: "bg-red-500/10 text-red-600 dark:text-red-400",
  blog: "bg-green-500/10 text-green-600 dark:text-green-400",
};

const countryFlags: Record<string, string> = {
  US: "🇺🇸",
  UK: "🇬🇧",
  RU: "🇷🇺",
  KZ: "🇰🇿",
  DE: "🇩🇪",
};

export default function SourcesPage({ params }: SourcesPageProps) {
  const { projectId } = use(params);
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sources, setSources] = useState(mockSources);
  
  const filteredSources = sources.filter((source) => {
    const matchesSearch = source.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || source.type === typeFilter;
    return matchesSearch && matchesType;
  });
  
  const toggleActive = (id: string) => {
    setSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s))
    );
  };
  
  const stats = {
    total: sources.length,
    active: sources.filter((s) => s.active).length,
    trusted: sources.filter((s) => s.trusted).length,
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
            {t("sources.title")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("sources.subtitle")}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            {t("common.export")}
          </Button>
          <Button size="sm" className="glow-sm">
            <Plus className="h-4 w-4 mr-2" />
            {t("sources.addSource")}
          </Button>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Globe className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">{t("sources.totalSources")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.active}</p>
                  <p className="text-xs text-muted-foreground">{t("sources.active")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Shield className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.trusted}</p>
                  <p className="text-xs text-muted-foreground">{t("sources.trusted")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      
      {/* Filters */}
      <Card className="glass">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("common.search") + "..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t("sources.table.type")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all") || "All types"}</SelectItem>
                <SelectItem value="news">{t("sources.types.news")}</SelectItem>
                <SelectItem value="social">{t("sources.types.social")}</SelectItem>
                <SelectItem value="video">{t("sources.types.video")}</SelectItem>
                <SelectItem value="blog">{t("sources.types.blog")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      {/* Sources Table */}
      <Card className="glass">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50 text-left">
                  <th className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {t("sources.table.source")}
                  </th>
                  <th className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wide w-24">
                    {t("sources.table.type")}
                  </th>
                  <th className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wide w-24 text-right">
                    {t("sources.table.mentions")}
                  </th>
                  <th className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wide w-24 text-right">
                    {t("sources.table.visits")}
                  </th>
                  <th className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wide w-24 text-center">
                    {t("sources.table.score")}
                  </th>
                  <th className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wide w-20 text-center">
                    {t("sources.table.status")}
                  </th>
                  <th className="p-4 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {filteredSources.map((source, index) => (
                  <motion.tr
                    key={source.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      "border-b border-border/30 hover:bg-muted/30 transition-colors",
                      !source.active && "opacity-50"
                    )}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 rounded-lg">
                          <AvatarFallback className="rounded-lg text-xs font-medium bg-primary/10">
                            {source.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{source.name}</span>
                            {source.trusted && (
                              <Shield className="h-3.5 w-3.5 text-blue-500" />
                            )}
                            <span>{countryFlags[source.country]}</span>
                          </div>
                          <a
                            href={source.baseUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:text-primary transition-colors"
                          >
                            {source.baseUrl}
                          </a>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge
                        variant="outline"
                        className={cn("capitalize text-xs", typeColors[source.type])}
                      >
                        {source.type}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <span className="font-medium">{source.mentions.toLocaleString()}</span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-muted-foreground">{source.visits.toLocaleString()}</span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-semibold">
                          {source.influenceScore.toFixed(1)}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <Switch
                        checked={source.active}
                        onCheckedChange={() => toggleActive(source.id)}
                      />
                    </td>
                    <td className="p-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            {t("sources.actions.goToSite")}
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            {source.trusted ? (
                              <>
                                <ShieldOff className="h-4 w-4 mr-2" />
                                {t("sources.actions.removeTrust")}
                              </>
                            ) : (
                              <>
                                <Shield className="h-4 w-4 mr-2" />
                                {t("sources.actions.markTrusted")}
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
                            <Ban className="h-4 w-4 mr-2" />
                            {t("sources.actions.block")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

