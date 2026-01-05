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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
            {t("mentions.title")}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            {t("mentions.subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex-1 sm:flex-initial"
          >
            <Filter className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">{showFilters ? t("common.hideFilters") : t("common.showFilters")}</span>
            <span className="sm:hidden">{t("common.filters")}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex-1 sm:flex-initial"
          >
            <RefreshCw className={cn("h-4 w-4 sm:mr-2", isRefreshing && "animate-spin")} />
            <span className="hidden sm:inline">{t("common.refresh")}</span>
          </Button>
          <Button variant="outline" size="sm" className="hidden sm:flex">
            <Download className="h-4 w-4 mr-2" />
            {t("common.export")}
          </Button>
          <Button size="sm" className="glow-sm flex-1 sm:flex-initial">
            <Sparkles className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t("mentions.aiSummary")}</span>
            <span className="sm:hidden">{t("common.ai")}</span>
          </Button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* Filters Sidebar - Desktop */}
        <AnimatePresence mode="wait">
          {showFilters && (
            <motion.div
              key="filters"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="hidden lg:block flex-shrink-0 overflow-hidden"
            >
              <div className="w-[280px]">
                <MentionsFilters projectId={projectId} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Main Area */}
        <div className="flex-1 min-w-0 space-y-4 sm:space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Main Chart */}
                <Card className="lg:col-span-2 glass">
                  <CardHeader className="pb-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <CardTitle className="text-sm sm:text-base font-medium">
                        {t("mentions.charts.mentionsOverTime")}
                      </CardTitle>
                      <Tabs defaultValue="mentions" className="w-full sm:w-auto">
                        <TabsList className="h-8 w-full sm:w-auto">
                          <TabsTrigger value="mentions" className="text-xs px-2 sm:px-3 flex-1 sm:flex-initial">
                            {t("mentions.charts.mentions")}
                          </TabsTrigger>
                          <TabsTrigger value="reach" className="text-xs px-2 sm:px-3 flex-1 sm:flex-initial">
                            {t("mentions.charts.reach")}
                          </TabsTrigger>
                          <TabsTrigger value="both" className="text-xs px-2 sm:px-3 flex-1 sm:flex-initial">
                            {t("mentions.charts.both")}
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6">
                    <MentionsChart />
                  </CardContent>
                </Card>

                {/* Sentiment Chart */}
                <Card className="glass">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm sm:text-base font-medium">
                      {t("mentions.charts.sentimentDistribution")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6">
                    <SentimentChart />
                  </CardContent>
                </Card>
              </div>

              {/* Mentions Table */}
              <Card className="glass">
                <CardHeader className="pb-3 sm:pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <CardTitle className="text-sm sm:text-base font-medium">
                        {t("mentions.recentMentions")}
                      </CardTitle>
                      <Badge variant="secondary" className="text-xs">
                        {t("mentions.last7days")}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="text-xs sm:text-sm">
                        {t("mentions.selectAll")}
                      </Button>
                      <Button variant="ghost" size="sm" className="text-xs sm:text-sm">
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
      
      {/* Filters Sidebar - Mobile (Sheet) */}
      <Sheet open={showFilters} onOpenChange={setShowFilters}>
        <SheetContent side="left" className="w-[280px] sm:w-[320px] p-0">
          <SheetHeader className="p-4 pb-3 border-b border-border">
            <SheetTitle>{t("common.filters")}</SheetTitle>
          </SheetHeader>
          <div className="p-4 overflow-y-auto h-[calc(100vh-73px)]">
            <MentionsFilters projectId={projectId} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

