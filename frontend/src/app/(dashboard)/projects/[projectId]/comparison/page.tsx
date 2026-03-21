"use client";

import { use, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import ReactECharts from "echarts-for-react";
import { useTheme } from "next-themes";
import { GitCompare, Download, Plus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useComparison, useCreateProject, useProject, useProjects, useTranslation } from "@/hooks";
import { apiClient, getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ComparisonPageProps {
  params: Promise<{ projectId: string }>;
}

const PROJECT_COLORS = ["#00A3E0", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

type ComparisonMetricKey =
  | "total_mentions"
  | "total_reach"
  | "positive_pct"
  | "negative_pct"
  | "avg_influence";

export default function ComparisonPage({ params }: ComparisonPageProps) {
  const { projectId } = use(params);
  const { theme } = useTheme();
  const { t } = useTranslation();
  const isDark = theme === "dark";
  const { isLoading: isLoadingProject } = useProject(projectId);
  const { data: allProjects, isLoading: isLoadingProjects } = useProjects();
  const createProjectMutation = useCreateProject();
  const { mutate: runComparison, data: comparisonData } = useComparison(projectId);

  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [projectToAdd, setProjectToAdd] = useState<string>("");
  const [competitorTopic, setCompetitorTopic] = useState("");

  const projectsList = useMemo(
    () =>
      (allProjects || []).map((project, i: number) => ({
        id: String(project.id),
        name: project.name || `Project ${i + 1}`,
        color: PROJECT_COLORS[i % PROJECT_COLORS.length],
      })),
    [allProjects]
  );

  const comparedProjectIds = useMemo(
    () => [projectId, ...selectedProjects.filter((id) => id !== projectId)],
    [projectId, selectedProjects]
  );
  const comparedKey = comparedProjectIds.join("|");

  useEffect(() => {
    if (comparedProjectIds.length < 2) return;
    runComparison({ type: "projects", item_ids: comparedProjectIds });
  }, [comparedKey, comparedProjectIds, runComparison]);

  const comparison = comparisonData;
  const comparedProjects = projectsList.filter((p) => comparedProjectIds.includes(p.id));

  const getMetricValue = (metric: ComparisonMetricKey, itemId: string): number => {
    const bucket = comparison?.metrics?.find((m) => m.name === metric);
    const v = bucket?.values?.find(
      (item: { itemId?: string; item_id?: string; value: number }) =>
        item.itemId === itemId || item.item_id === itemId
    );
    return Number(v?.value || 0);
  };

  const chartData = comparedProjects.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    mentions: getMetricValue("total_mentions", p.id),
    reach: getMetricValue("total_reach", p.id),
    positive: getMetricValue("positive_pct", p.id),
    negative: getMetricValue("negative_pct", p.id),
  }));

  const lineChartOption = {
    tooltip: { trigger: "axis", backgroundColor: isDark ? "rgba(23,23,23,0.95)" : "rgba(255,255,255,0.95)" },
    legend: { data: chartData.map((p) => p.name), textStyle: { color: isDark ? "#a3a3a3" : "#737373" } },
    grid: { left: "3%", right: "4%", bottom: "3%", top: "15%", containLabel: true },
    xAxis: {
      type: "category",
      data: [
        t("comparisonPage.metrics.totalMentions"),
        t("comparisonPage.metrics.socialReach"),
        t("comparisonPage.metrics.positive"),
        t("comparisonPage.metrics.negative"),
      ],
    },
    yAxis: { type: "value" },
    series: chartData.map((p) => ({
      name: p.name,
      type: "line",
      smooth: true,
      data: [p.mentions, p.reach, p.positive, p.negative],
      itemStyle: { color: p.color },
    })),
  };

  const isLoading = isLoadingProject || isLoadingProjects;

  const addExistingProject = () => {
    if (!projectToAdd || projectToAdd === projectId) return;
    if (selectedProjects.includes(projectToAdd)) return;
    setSelectedProjects((prev) => [...prev, projectToAdd]);
    setProjectToAdd("");
  };

  const removeCompared = (id: string) => {
    if (id === projectId) return;
    setSelectedProjects((prev) => prev.filter((x) => x !== id));
  };

  const addCompetitorTopic = () => {
    const topic = competitorTopic.trim();
    if (!topic) return;
    const tokens = topic.split(/[\s,;|]+/).filter((x) => x.length >= 3);
    createProjectMutation.mutate(
      {
        name: topic,
        settings: {
          keywords: Array.from(new Set([topic, ...tokens])),
          excludedKeywords: [],
          topicQuery: topic,
          activeSources: ["news", "blogs", "websites"],
          excludedSites: [],
          notifications: { email: true },
        },
      },
      {
        onSuccess: async (project) => {
          setSelectedProjects((prev) => [...prev, project.id]);
          setCompetitorTopic("");
          toast.success(t("comparisonPage.toasts.added"));
          try {
            await apiClient.post(`/projects/${project.id}/ingestion/run`, {
              limit_sources: 3,
              per_source_limit: 15,
            });
          } catch {
            // optional background start
          }
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <GitCompare className="h-7 w-7 text-primary" />
            {t("comparisonPage.title")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("comparisonPage.subtitle")}
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          {t("comparisonPage.exportCsv")}
        </Button>
      </div>

      <Card className="glass">
        <CardContent className="p-4 space-y-4">
          <div className="grid lg:grid-cols-2 gap-3">
            <div className="flex gap-2">
              <Select value={projectToAdd} onValueChange={setProjectToAdd}>
                <SelectTrigger>
                  <SelectValue placeholder={t("comparisonPage.addExistingPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {projectsList
                    .filter((p) => p.id !== projectId && !selectedProjects.includes(p.id))
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={addExistingProject}>
                <Plus className="h-4 w-4 mr-1" />
                {t("common.add")}
              </Button>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder={t("comparisonPage.newCompetitorPlaceholder")}
                value={competitorTopic}
                onChange={(e) => setCompetitorTopic(e.target.value)}
              />
              <Button onClick={addCompetitorTopic} disabled={createProjectMutation.isPending}>
                <Plus className="h-4 w-4 mr-1" />
                {t("common.create")}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Label className="text-sm">{t("comparisonPage.comparingLabel")}</Label>
            {comparedProjects.map((p) => (
              <Badge key={p.id} variant="outline" className="pl-2 pr-1 py-1">
                <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: p.color }} />
                {p.name}
                {p.id !== projectId && (
                  <button className="ml-1 p-0.5 hover:bg-muted rounded" onClick={() => removeCompared(p.id)}>
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">{t("comparisonPage.metricsTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-muted-foreground uppercase border-b border-border/50">
                  <th className="p-3">{t("comparisonPage.metricColumn")}</th>
                  {comparedProjects.map((p) => (
                    <th key={p.id} className="p-3 text-center">
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: t("comparisonPage.metrics.totalMentions"), key: "total_mentions" as ComparisonMetricKey },
                  { label: t("comparisonPage.metrics.socialReach"), key: "total_reach" as ComparisonMetricKey },
                  { label: t("comparisonPage.metrics.positive"), key: "positive_pct" as ComparisonMetricKey },
                  { label: t("comparisonPage.metrics.negative"), key: "negative_pct" as ComparisonMetricKey },
                  { label: t("comparisonPage.metrics.avgInfluence"), key: "avg_influence" as ComparisonMetricKey },
                ].map((row) => (
                  <tr key={row.key} className="border-b border-border/30">
                    <td className="p-3 font-medium">{row.label}</td>
                    {comparedProjects.map((p) => (
                      <td key={p.id} className="p-3 text-center">
                        {getMetricValue(row.key, p.id).toLocaleString()}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">{t("comparisonPage.chartTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ReactECharts option={lineChartOption} style={{ height: "320px" }} opts={{ renderer: "svg" }} />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
