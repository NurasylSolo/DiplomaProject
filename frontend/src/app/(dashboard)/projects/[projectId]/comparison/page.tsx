"use client";

import { use, useState } from "react";
import { motion } from "framer-motion";
import ReactECharts from "echarts-for-react";
import { useTheme } from "next-themes";
import {
  GitCompare,
  Download,
  Plus,
  X,
  TrendingUp,
  TrendingDown,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks";

interface ComparisonPageProps {
  params: Promise<{ projectId: string }>;
}

const projects = [
  { id: "1", name: "Your Brand", color: "#00A3E0" },
  { id: "2", name: "Competitor A", color: "#10B981" },
  { id: "3", name: "Competitor B", color: "#F59E0B" },
  { id: "4", name: "Competitor C", color: "#EF4444" },
];

const comparisonData = {
  projects: [
    {
      name: "Your Brand",
      color: "#00A3E0",
      totalMentions: 12847,
      socialMentions: 8234,
      nonSocialMentions: 4613,
      positiveMentions: 9250,
      socialReach: "2.4M",
      nonSocialReach: "890K",
      presenceScore: 7.8,
      ave: "$125,000",
      ugc: 3421,
    },
    {
      name: "Competitor A",
      color: "#10B981",
      totalMentions: 9823,
      socialMentions: 6521,
      nonSocialMentions: 3302,
      positiveMentions: 6421,
      socialReach: "1.8M",
      nonSocialReach: "650K",
      presenceScore: 6.9,
      ave: "$98,000",
      ugc: 2156,
    },
    {
      name: "Competitor B",
      color: "#F59E0B",
      totalMentions: 8234,
      socialMentions: 5123,
      nonSocialMentions: 3111,
      positiveMentions: 5892,
      socialReach: "1.5M",
      nonSocialReach: "520K",
      presenceScore: 6.2,
      ave: "$78,000",
      ugc: 1834,
    },
  ],
  periods: {
    current: { from: "Nov 1", to: "Nov 30", label: "This Month" },
    previous: { from: "Oct 1", to: "Oct 31", label: "Last Month" },
    data: [
      { metric: "Total Mentions", current: 12847, previous: 11423, delta: 12.5 },
      { metric: "Social Reach", current: 2400000, previous: 2100000, delta: 14.3 },
      { metric: "Non-social Reach", current: 890000, previous: 950000, delta: -6.3 },
      { metric: "Positive Sentiment", current: 72, previous: 68, delta: 5.9 },
      { metric: "Presence Score", current: 7.8, previous: 7.2, delta: 8.3 },
      { metric: "Share of Voice", current: 34, previous: 31, delta: 9.7 },
    ],
  },
};

const chartData = [
  { date: "Week 1", brand: 2800, compA: 2100, compB: 1800 },
  { date: "Week 2", brand: 3200, compA: 2400, compB: 1900 },
  { date: "Week 3", brand: 2900, compA: 2600, compB: 2100 },
  { date: "Week 4", brand: 3500, compA: 2300, compB: 2400 },
];

export default function ComparisonPage({ params }: ComparisonPageProps) {
  const { projectId } = use(params);
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [selectedProjects, setSelectedProjects] = useState(["1", "2", "3"]);
  
  const lineChartOption = {
    tooltip: { trigger: "axis", backgroundColor: isDark ? "rgba(23,23,23,0.95)" : "rgba(255,255,255,0.95)" },
    legend: { data: ["Your Brand", "Competitor A", "Competitor B"], textStyle: { color: isDark ? "#a3a3a3" : "#737373" } },
    grid: { left: "3%", right: "4%", bottom: "3%", top: "15%", containLabel: true },
    xAxis: { type: "category", data: chartData.map(d => d.date), axisLabel: { color: isDark ? "#737373" : "#a3a3a3" } },
    yAxis: { type: "value", axisLabel: { color: isDark ? "#737373" : "#a3a3a3" }, splitLine: { lineStyle: { color: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" } } },
    series: [
      { name: "Your Brand", type: "line", smooth: true, data: chartData.map(d => d.brand), itemStyle: { color: "#00A3E0" } },
      { name: "Competitor A", type: "line", smooth: true, data: chartData.map(d => d.compA), itemStyle: { color: "#10B981" } },
      { name: "Competitor B", type: "line", smooth: true, data: chartData.map(d => d.compB), itemStyle: { color: "#F59E0B" } },
    ],
  };
  
  const barChartOption = {
    tooltip: { trigger: "axis" },
    legend: { data: ["Your Brand", "Competitor A", "Competitor B"], textStyle: { color: isDark ? "#a3a3a3" : "#737373" } },
    grid: { left: "3%", right: "4%", bottom: "3%", top: "15%", containLabel: true },
    xAxis: { type: "category", data: ["Mentions", "Reach (K)", "Positive %", "Score"], axisLabel: { color: isDark ? "#737373" : "#a3a3a3" } },
    yAxis: { type: "value", axisLabel: { color: isDark ? "#737373" : "#a3a3a3" } },
    series: [
      { name: "Your Brand", type: "bar", data: [12847, 2400, 72, 78], itemStyle: { color: "#00A3E0" } },
      { name: "Competitor A", type: "bar", data: [9823, 1800, 65, 69], itemStyle: { color: "#10B981" } },
      { name: "Competitor B", type: "bar", data: [8234, 1500, 71, 62], itemStyle: { color: "#F59E0B" } },
    ],
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <GitCompare className="h-7 w-7 text-primary" />
            {t("comparison.title")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("comparison.subtitle")}
          </p>
        </div>
        
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>
      
      <Tabs defaultValue="projects" className="space-y-6">
        <TabsList className="glass">
          <TabsTrigger value="projects">Compare Projects</TabsTrigger>
          <TabsTrigger value="periods">Compare Periods</TabsTrigger>
        </TabsList>
        
        {/* Compare Projects */}
        <TabsContent value="projects" className="space-y-6">
          {/* Project Selection */}
          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium">Comparing:</span>
                {comparisonData.projects.map((project) => (
                  <Badge
                    key={project.name}
                    variant="outline"
                    className="pl-2 pr-1 py-1"
                    style={{ borderColor: project.color }}
                  >
                    <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: project.color }} />
                    {project.name}
                    <button className="ml-1 p-0.5 hover:bg-muted rounded">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Overview Grid */}
          <Card className="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Overview Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground uppercase border-b border-border/50">
                      <th className="p-3">Metric</th>
                      {comparisonData.projects.map((p) => (
                        <th key={p.name} className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                            {p.name}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "Total Mentions", key: "totalMentions", format: "number" },
                      { label: "Social Mentions", key: "socialMentions", format: "number" },
                      { label: "Non-social Mentions", key: "nonSocialMentions", format: "number" },
                      { label: "Positive Mentions", key: "positiveMentions", format: "number" },
                      { label: "Social Reach", key: "socialReach", format: "string" },
                      { label: "Non-social Reach", key: "nonSocialReach", format: "string" },
                      { label: "Presence Score", key: "presenceScore", format: "score" },
                      { label: "AVE", key: "ave", format: "string" },
                      { label: "UGC", key: "ugc", format: "number" },
                    ].map((row) => (
                      <tr key={row.key} className="border-b border-border/30">
                        <td className="p-3 font-medium">{row.label}</td>
                        {comparisonData.projects.map((p, i) => {
                          const value = p[row.key as keyof typeof p];
                          const isHighest = comparisonData.projects.every((other) => 
                            typeof value === "number" 
                              ? value >= (other[row.key as keyof typeof other] as number)
                              : true
                          );
                          return (
                            <td key={p.name} className={cn("p-3 text-center", i === 0 && isHighest && "text-primary font-semibold")}>
                              {row.format === "number" ? (value as number).toLocaleString() : value}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          
          {/* Charts */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Mentions Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ReactECharts option={lineChartOption} style={{ height: "300px" }} opts={{ renderer: "svg" }} />
              </CardContent>
            </Card>
            
            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Metrics Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <ReactECharts option={barChartOption} style={{ height: "300px" }} opts={{ renderer: "svg" }} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Compare Periods */}
        <TabsContent value="periods" className="space-y-6">
          {/* Period Selection */}
          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Period A:</span>
                  <Select defaultValue="this-month">
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="this-month">This Month</SelectItem>
                      <SelectItem value="last-month">Last Month</SelectItem>
                      <SelectItem value="this-quarter">This Quarter</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <span className="text-muted-foreground">vs</span>
                
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Period B:</span>
                  <Select defaultValue="last-month">
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="this-month">This Month</SelectItem>
                      <SelectItem value="last-month">Last Month</SelectItem>
                      <SelectItem value="this-quarter">This Quarter</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Period Comparison Table */}
          <Card className="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Period Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground uppercase border-b border-border/50">
                      <th className="p-3">Metric</th>
                      <th className="p-3 text-center">{comparisonData.periods.current.label}</th>
                      <th className="p-3 text-center">{comparisonData.periods.previous.label}</th>
                      <th className="p-3 text-center">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonData.periods.data.map((row) => (
                      <tr key={row.metric} className="border-b border-border/30">
                        <td className="p-3 font-medium">{row.metric}</td>
                        <td className="p-3 text-center font-semibold">
                          {row.current.toLocaleString()}{row.metric.includes("%") || row.metric.includes("Score") ? "" : ""}
                        </td>
                        <td className="p-3 text-center text-muted-foreground">
                          {row.previous.toLocaleString()}
                        </td>
                        <td className="p-3 text-center">
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-xs",
                              row.delta >= 0 
                                ? "border-green-500/30 text-green-500" 
                                : "border-red-500/30 text-red-500"
                            )}
                          >
                            {row.delta >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                            {row.delta >= 0 ? "+" : ""}{row.delta.toFixed(1)}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}










