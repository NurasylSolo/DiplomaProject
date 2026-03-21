"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useCreateProject } from "@/hooks";
import { getErrorMessage, tokenManager } from "@/lib/api";
import { projectsApi, type IngestionJobStatus } from "@/lib/api/services/projects";
import { useTranslation } from "@/hooks";

const createProjectSchema = z.object({
  topic: z.string().min(2).max(255),
  description: z.string().max(1000).optional(),
});

type CreateProjectForm = z.infer<typeof createProjectSchema>;

const genericTokens = new Set([
  "bank",
  "banks",
  "банк",
  "банки",
  "company",
  "brand",
  "group",
  "news",
  "inc",
  "llc",
  "corp",
  "ltd",
]);

export default function NewProjectPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const createProjectMutation = useCreateProject();
  const [tracking, setTracking] = useState<{ projectId: string; jobId: string } | null>(null);
  const [jobStatus, setJobStatus] = useState<IngestionJobStatus | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateProjectForm>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      topic: "",
      description: "",
    },
  });

  useEffect(() => {
    if (!tokenManager.isAuthenticated()) {
      router.push("/login");
    }
  }, [router]);

  useEffect(() => {
    if (!tracking) return;
    let cancelled = false;
    let stopped = false;
    let intervalId: number | null = null;
    let hardRedirectTimeoutId: number | null = null;

    const poll = async () => {
      if (stopped) return;
      try {
        const status = await projectsApi.getIngestionJob(tracking.projectId, tracking.jobId);
        if (cancelled) return;
        setJobStatus(status);
        if (status.status === "completed") {
          stopped = true;
          if (intervalId !== null) {
            window.clearInterval(intervalId);
          }
          toast.success(t("newProjectPage.toasts.processingCompleted"));
          setRedirecting(true);
          setTimeout(() => {
            router.push(`/projects/${tracking.projectId}/mentions`);
          }, 600);
        } else if (status.status === "failed") {
          stopped = true;
          if (intervalId !== null) {
            window.clearInterval(intervalId);
          }
          toast.error(status.error || t("newProjectPage.toasts.processingFailed"));
          setRedirecting(false);
        }
      } catch (error) {
        if (cancelled) return;
        toast.error(getErrorMessage(error));
      }
    };

    poll();
    intervalId = window.setInterval(poll, 5000);
    // Do not block user on this screen for too long.
    hardRedirectTimeoutId = window.setTimeout(() => {
      if (stopped || cancelled) return;
      stopped = true;
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
      toast.success(t("newProjectPage.toasts.createdAndStarted"));
      router.push(`/projects/${tracking.projectId}/mentions`);
    }, 45_000);
    return () => {
      cancelled = true;
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
      if (hardRedirectTimeoutId !== null) {
        window.clearTimeout(hardRedirectTimeoutId);
      }
    };
  }, [tracking, router, t]);

  const onSubmit = async (data: CreateProjectForm) => {
    const topic = data.topic.trim();
    const keywordSet = new Set<string>([topic]);
    topic.split(/[\s,;|]+/).forEach((token) => {
      const clean = token.trim();
      if (clean.length < 3) return;
      if (genericTokens.has(clean.toLowerCase())) return;
      keywordSet.add(clean);
    });

    createProjectMutation.mutate(
      {
        name: topic,
        description: data.description?.trim() || undefined,
        settings: {
          keywords: Array.from(keywordSet),
          topicQuery: topic,
          excludedKeywords: [],
          activeSources: ["news", "blogs", "websites"],
          excludedSites: [],
          notifications: { email: true },
          relevanceThreshold: 0.1,
        },
      },
      {
        onSuccess: async (project) => {
          toast.success(t("newProjectPage.toasts.createdAndStarted"));
          if (project.ingestionJobId) {
            setTracking({ projectId: project.id, jobId: project.ingestionJobId });
          } else {
            router.push(`/projects/${project.id}/mentions`);
          }
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      }
    );
  };

  const isLoading = createProjectMutation.isPending || !!tracking;
  const progressValue = jobStatus?.progress_percent ?? 0;
  const processedSources = jobStatus?.processed_sources ?? 0;
  const totalSources = jobStatus?.total_sources ?? 0;
  const isCompleted = jobStatus?.status === "completed";
  const isFailed = jobStatus?.status === "failed";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t("newProjectPage.title")}
          </CardTitle>
          <CardDescription>
            {t("newProjectPage.subtitle")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tracking && (
            <div className="mb-6 rounded-lg border p-4 space-y-3 bg-muted/20">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{t("newProjectPage.progress.title")}</span>
                <span>{progressValue}%</span>
              </div>
              <Progress value={progressValue} />
              <p className="text-sm text-muted-foreground">
                {t("newProjectPage.progress.sources", {
                  processed: processedSources,
                  total: totalSources,
                })}
              </p>
              <p className="text-xs text-muted-foreground">
                {isCompleted
                  ? t("newProjectPage.progress.completed")
                  : isFailed
                    ? t("newProjectPage.progress.failed")
                    : t("newProjectPage.progress.running")}
              </p>
              {(isCompleted || isFailed) && !redirecting && (
                <Button
                  type="button"
                  variant={isFailed ? "secondary" : "default"}
                  onClick={() => router.push(`/projects/${tracking.projectId}/mentions`)}
                  className="w-full"
                >
                  {t("newProjectPage.progress.openProject")}
                </Button>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="topic">{t("newProjectPage.topicLabel")}</Label>
              <Input
                id="topic"
                placeholder={t("newProjectPage.topicPlaceholder")}
                disabled={isLoading}
                {...register("topic")}
              />
              {errors.topic && <p className="text-sm text-destructive">{errors.topic.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t("newProjectPage.descriptionLabel")}</Label>
              <Textarea
                id="description"
                placeholder={t("newProjectPage.descriptionPlaceholder")}
                disabled={isLoading}
                {...register("description")}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("newProjectPage.creating")}
                </>
              ) : (
                t("newProjectPage.submit")
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
