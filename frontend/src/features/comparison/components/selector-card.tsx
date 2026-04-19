"use client";

import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/hooks";
import { apiClient, getErrorMessage } from "@/lib/api";
import { useState } from "react";
import type { ComparedProject } from "../utils/chart-options";
import type { useComparisonData } from "../hooks/use-comparison-data";

interface SelectorCardProps {
  projectId: string;
  projectsList: ComparedProject[];
  selectedProjects: string[];
  setSelectedProjects: ReturnType<typeof useComparisonData>["setSelectedProjects"];
  comparedProjects: ComparedProject[];
  createProjectMutation: ReturnType<typeof useComparisonData>["createProjectMutation"];
}

export function SelectorCard({
  projectId,
  projectsList,
  selectedProjects,
  setSelectedProjects,
  comparedProjects,
  createProjectMutation,
}: SelectorCardProps) {
  const { t } = useTranslation();
  const [projectToAdd, setProjectToAdd] = useState<string>("");
  const [competitorTopic, setCompetitorTopic] = useState("");

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
          // Best-effort kick-off of ingestion so a new competitor starts
          // collecting mentions immediately. We swallow the error because
          // the project itself has been created successfully.
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

  return (
    <Card className="glass">
      <CardContent className="p-4 space-y-4">
        <div className="grid lg:grid-cols-2 gap-3">
          <div className="flex gap-2">
            <Select value={projectToAdd} onValueChange={setProjectToAdd}>
              <SelectTrigger>
                <SelectValue
                  placeholder={t("comparisonPage.addExistingPlaceholder")}
                />
              </SelectTrigger>
              <SelectContent>
                {projectsList
                  .filter(
                    (p) => p.id !== projectId && !selectedProjects.includes(p.id)
                  )
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
              onKeyDown={(e) => {
                if (e.key === "Enter") addCompetitorTopic();
              }}
            />
            <Button
              onClick={addCompetitorTopic}
              disabled={createProjectMutation.isPending}
            >
              {createProjectMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-1" />
              )}
              {t("common.create")}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Label className="text-sm">{t("comparisonPage.comparingLabel")}</Label>
          {comparedProjects.map((p) => (
            <Badge key={p.id} variant="outline" className="pl-2 pr-1 py-1">
              <span
                className="w-2 h-2 rounded-full mr-2"
                style={{ backgroundColor: p.color }}
              />
              {p.name}
              {p.id !== projectId && (
                <button
                  className="ml-1 p-0.5 hover:bg-muted rounded"
                  onClick={() => removeCompared(p.id)}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
          {comparedProjects.length < 2 && (
            <span className="text-xs text-muted-foreground ml-2">
              {t("comparisonPage.helpAddOne")}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
