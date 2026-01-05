"use client";

import { use, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  TrendingUp, 
  TrendingDown, 
  MessageSquareText,
  Users,
  Eye,
  ThumbsUp,
  Filter,
  Download,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MentionsFilters } from "@/features/mentions/components/mentions-filters";
import { MentionsChart } from "@/features/mentions/components/mentions-chart";
import { SentimentChart } from "@/features/mentions/components/sentiment-chart";
import { MentionsTable } from "@/features/mentions/components/mentions-table";
import { StatCard } from "@/features/mentions/components/stat-card";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks";

interface MentionsPageProps {
  params: Promise<{ projectId: string }>;
}

export default function MentionsPage({ params }: MentionsPageProps) {
  const { projectId } = use(params);
  const { t } = useTranslation();
  const [showFilters, setShowFilters] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Mock stats data with translations
  const statsData = [
    {
      title: t("mentions.totalMentions"),
      value: 12847,
      change: 12.5,
      changeType: "increase" as const,
      icon: MessageSquareText,
    },
    {
      title: t("mentions.socialReach"),
      value: 2400000,
      change: 8.2,
      changeType: "increase" as const,
      icon: Users,
      format: "compact" as const,
    },
    {
      title: t("mentions.nonSocialReach"),
      value: 890000,
      change: -3.1,
      changeType: "decrease" as const,
      icon: Eye,
      format: "compact" as const,
    },
    {
      title: t("mentions.positiveSentiment"),
      value: 72,
      change: 5.4,
      changeType: "increase" as const,
      icon: ThumbsUp,
      suffix: "%",
    },
  ];
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };
  
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
            {t("mentions.title")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("mentions.subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            {showFilters ? t("common.hideFilters") : t("common.showFilters")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
            {t("common.refresh")}
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            {t("common.export")}
          </Button>
          <Button size="sm" className="glow-sm">
            <Sparkles className="h-4 w-4 mr-2" />
            {t("mentions.aiSummary")}
          </Button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex gap-6">
        {/* Filters Sidebar */}
        <AnimatePresence mode="wait">
          {showFilters && (
            <motion.div
              key="filters"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="flex-shrink-0 overflow-hidden"
            >
              <div className="w-[280px]">
                <MentionsFilters projectId={projectId} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Main Area */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statsData.map((stat, index) => (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <StatCard {...stat} />
              </motion.div>
            ))}
          </div>
          
              {/* Charts */}
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Main Chart */}
                <Card className="lg:col-span-2 glass">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-medium">
                        {t("mentions.charts.mentionsOverTime")}
                      </CardTitle>
                      <Tabs defaultValue="mentions" className="w-auto">
                        <TabsList className="h-8">
                          <TabsTrigger value="mentions" className="text-xs px-3">
                            {t("mentions.charts.mentions")}
                          </TabsTrigger>
                          <TabsTrigger value="reach" className="text-xs px-3">
                            {t("mentions.charts.reach")}
                          </TabsTrigger>
                          <TabsTrigger value="both" className="text-xs px-3">
                            {t("mentions.charts.both")}
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <MentionsChart />
                  </CardContent>
                </Card>

                {/* Sentiment Chart */}
                <Card className="glass">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium">
                      {t("mentions.charts.sentimentDistribution")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SentimentChart />
                  </CardContent>
                </Card>
              </div>

              {/* Mentions Table */}
              <Card className="glass">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-base font-medium">
                        {t("mentions.recentMentions")}
                      </CardTitle>
                      <Badge variant="secondary" className="text-xs">
                        {t("mentions.last7days")}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        {t("mentions.selectAll")}
                      </Button>
                      <Button variant="ghost" size="sm">
                        {t("mentions.bulkActions")}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <MentionsTable projectId={projectId} />
                </CardContent>
              </Card>
        </div>
      </div>
    </div>
  );
}

