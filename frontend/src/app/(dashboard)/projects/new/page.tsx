"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import {
  Loader2,
  Sparkles,
  Search,
  BarChart3,
  Globe,
  Brain,
  ArrowRight,
  CheckCircle2,
  XCircle,
  RotateCw,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateProject,
  useRefreshProject,
  useTranslation,
} from "@/hooks";
import { getErrorMessage, tokenManager } from "@/lib/api";
import { projectsApi, type IngestionJobStatus } from "@/lib/api/services/projects";

const createProjectSchema = z.object({
  topic: z.string().min(2).max(255),
  aliases: z.string().max(1000).optional(),
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

const LANGUAGES = [
  { code: "en", label: "EN" },
  { code: "ru", label: "RU" },
  { code: "kk", label: "KZ" },
];

// After this many milliseconds the optional "Continue in background" button
// appears. The user can keep waiting (default behaviour) or skip into the
// project early if ingestion is taking unusually long.
const SHOW_SKIP_AFTER_MS = 180_000; // 3 minutes

// Polling interval for /ingestion/jobs/{id}. Kept short so the live source
// name and growing counters update frequently — the run is long, so the user
// needs constant visible feedback that it isn't stuck.
const POLL_INTERVAL_MS = 2_500;

export default function NewProjectPage() {
  const router = useRouter();
  const { t, changeLanguage, currentLanguage } = useTranslation();
  const createProjectMutation = useCreateProject();
  const refreshMutation = useRefreshProject();

  const [tracking, setTracking] = useState<{ projectId: string; jobId: string } | null>(null);
  const [jobStatus, setJobStatus] = useState<IngestionJobStatus | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  // Optional escape hatch — user can keep waiting OR skip after 3 min.
  const [showSkip, setShowSkip] = useState(false);
  // Counts consecutive network failures so we can surface a soft warning
  // without breaking the loop.
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  // Seconds since ingestion started — a ticking timer reassures the user the
  // process is alive even while a slow source is being fetched.
  const [elapsedSec, setElapsedSec] = useState(0);

  const features = [
    { icon: Search, label: t("newProjectPage.features.search", { defaultValue: "Search across 1000+ news sources" }) },
    { icon: Brain, label: t("newProjectPage.features.ai", { defaultValue: "AI sentiment & emotion analysis" }) },
    { icon: BarChart3, label: t("newProjectPage.features.realtime", { defaultValue: "Real-time analytics & statistics" }) },
    { icon: Globe, label: t("newProjectPage.features.geo", { defaultValue: "Geo distribution worldwide" }) },
  ];

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateProjectForm>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      topic: "",
      aliases: "",
      description: "",
    },
  });

  useEffect(() => {
    if (!tokenManager.isAuthenticated()) {
      router.push("/login");
    }
  }, [router]);

  // Ticking elapsed-time counter while a job is in progress.
  useEffect(() => {
    if (!tracking) {
      setElapsedSec(0);
      return;
    }
    const startedAt = Date.now();
    const id = window.setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [tracking]);

  // Polling effect — runs while we have a tracked job. NO hard redirect:
  // we wait for the backend to report `completed` or `failed`. If the user
  // wants out earlier they click the optional "Continue in background"
  // button that appears after SHOW_SKIP_AFTER_MS.
  useEffect(() => {
    if (!tracking) return;
    setShowSkip(false);
    setConsecutiveErrors(0);

    let cancelled = false;
    let stopped = false;
    let intervalId: number | null = null;

    const skipTimeoutId = window.setTimeout(() => {
      if (!cancelled && !stopped) setShowSkip(true);
    }, SHOW_SKIP_AFTER_MS);

    const poll = async () => {
      if (stopped) return;
      try {
        const status = await projectsApi.getIngestionJob(
          tracking.projectId,
          tracking.jobId
        );
        if (cancelled) return;
        setJobStatus(status);
        setConsecutiveErrors(0);
        if (status.status === "completed") {
          stopped = true;
          if (intervalId !== null) window.clearInterval(intervalId);
          toast.success(t("newProjectPage.toasts.processingCompleted"));
          setRedirecting(true);
          // Tiny delay so the user sees the 100% bar + checkmark before
          // the page navigates away.
          window.setTimeout(() => {
            router.push(`/projects/${tracking.projectId}/mentions`);
          }, 800);
        } else if (status.status === "failed") {
          stopped = true;
          if (intervalId !== null) window.clearInterval(intervalId);
          // Keep the page on screen so the user can choose Retry or Open
          // anyway. Toast is informational; full error is rendered in UI.
          toast.error(status.error || t("newProjectPage.toasts.processingFailed"));
        }
      } catch (error) {
        if (cancelled) return;
        // Soft failure — keep polling. Backend may be slow restarting,
        // network may flap. Surface a light warning every ~5 errors.
        setConsecutiveErrors((n) => {
          const next = n + 1;
          if (next === 5) {
            toast.error(getErrorMessage(error));
          }
          return next;
        });
      }
    };

    poll();
    intervalId = window.setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      if (intervalId !== null) window.clearInterval(intervalId);
      window.clearTimeout(skipTimeoutId);
    };
  }, [tracking, router, t]);

  const onSubmit = async (data: CreateProjectForm) => {
    const topic = data.topic.trim();

    // User-provided synonyms / variants (e.g. "global warming, climate crisis")
    const aliases = (data.aliases || "")
      .split(/[,\n;|]+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 2 && t.toLowerCase() !== topic.toLowerCase());

    // Build keyword set from topic tokens + aliases (used for tag/topic UI).
    const keywordSet = new Set<string>([topic, ...aliases]);
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
          aliases,
          excludedKeywords: [],
          activeSources: ["news", "blogs", "websites"],
          excludedSites: [],
          notifications: { email: true },
          relevanceThreshold: 0.1,
        },
      },
      {
        onSuccess: async (project) => {
          // No premature "createdAndStarted" toast — user waits on the
          // progress screen and only sees "processingCompleted" at the end.
          if (project.ingestionJobId) {
            setTracking({ projectId: project.id, jobId: project.ingestionJobId });
          } else {
            // Backend didn't enqueue a job (auto_start_ingestion=false?) —
            // nothing to wait for, just open the project.
            router.push(`/projects/${project.id}/mentions`);
          }
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      }
    );
  };

  // Manual escape hatch — user clicked "Continue in background"
  // OR "Open project anyway" after a failure.
  const handleOpenAnyway = () => {
    if (!tracking) return;
    router.push(`/projects/${tracking.projectId}/mentions`);
  };

  // Trigger a fresh ingestion run on the same project after a failure.
  const handleRetry = () => {
    if (!tracking) return;
    refreshMutation.mutate(tracking.projectId, {
      onSuccess: (data) => {
        if (data.ingestionJobId) {
          // Re-arm the polling effect with the new job id.
          setJobStatus(null);
          setTracking({ projectId: tracking.projectId, jobId: data.ingestionJobId });
        }
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  };

  const isLoading = createProjectMutation.isPending || !!tracking;
  const progressValue = jobStatus?.progress_percent ?? 0;
  const processedSources = jobStatus?.processed_sources ?? 0;
  const totalSources = jobStatus?.total_sources ?? 0;
  const itemsFetched = jobStatus?.items_fetched ?? 0;
  const itemsSaved = jobStatus?.items_saved ?? 0;
  const itemsDeduplicated = jobStatus?.items_deduplicated ?? 0;
  const isCompleted = jobStatus?.status === "completed";
  const isFailed = jobStatus?.status === "failed";
  const isRetrying = refreshMutation.isPending;
  const currentStage = jobStatus?.current_stage;

  const elapsedLabel = useMemo(() => {
    const m = Math.floor(elapsedSec / 60);
    const s = elapsedSec % 60;
    return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`;
  }, [elapsedSec]);

  // Stage label: while running, prefer the actual source being scanned right
  // now (from the backend) so it's obvious the run is progressing; otherwise
  // fall back to a phase description.
  const stageLabel = useMemo(() => {
    if (isCompleted) return t("newProjectPage.progress.completed");
    if (isFailed) return t("newProjectPage.progress.failed");
    if (currentStage) {
      return t("newProjectPage.progress.scanning", {
        defaultValue: "Scanning: {{source}}",
        source: currentStage,
      });
    }
    if (progressValue < 15) {
      return t("newProjectPage.progress.stages.discovering", {
        defaultValue: "Discovering relevant sources",
      });
    }
    if (progressValue < 90) {
      return t("newProjectPage.progress.stages.analyzing", {
        defaultValue: "Running sentiment + emotion analysis",
      });
    }
    return t("newProjectPage.progress.stages.finalising", {
      defaultValue: "Finalising",
    });
  }, [isCompleted, isFailed, progressValue, currentStage, t]);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <span className="font-display text-base font-semibold">
            Senti<span className="text-primary">News</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Select value={currentLanguage} onValueChange={changeLanguage}>
            <SelectTrigger className="w-[88px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ThemeToggle />
        </div>
      </div>

      {/* Main content */}
      <div className="relative flex items-center justify-center min-h-screen px-4 sm:px-6">
        <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-8 lg:gap-12 items-center pt-20 pb-10">
          {/* Left side — info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="flex-1 space-y-6 hidden lg:block"
          >
            <div className="space-y-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3 w-3" />
                {t("newProjectPage.tagline", { defaultValue: "AI-powered media monitoring" })}
              </span>
              <h1 className="font-display text-3xl xl:text-4xl font-bold tracking-tight">
                {t("newProjectPage.title")}
              </h1>
              <p className="text-muted-foreground text-base max-w-md">
                {t("newProjectPage.subtitle")}
              </p>
            </div>

            <div className="space-y-3">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.08 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <feature.icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm text-muted-foreground">{feature.label}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right side — form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="flex-1 w-full max-w-lg"
          >
            <Card className="glass border-border/50 shadow-xl">
              <CardContent className="p-6 sm:p-8">
                {/* Mobile heading */}
                <div className="mb-6 lg:hidden space-y-2">
                  <h1 className="font-display text-2xl font-bold tracking-tight">
                    {t("newProjectPage.title")}
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    {t("newProjectPage.subtitle")}
                  </p>
                </div>

                {/* Progress section */}
                {tracking && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mb-6 rounded-xl border p-5 space-y-4 ${
                      isFailed
                        ? "border-destructive/40 bg-destructive/5"
                        : isCompleted
                          ? "border-green-500/40 bg-green-500/5"
                          : "border-border/50 bg-muted/20"
                    }`}
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium flex items-center gap-2">
                        {isCompleted ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : isFailed ? (
                          <XCircle className="h-4 w-4 text-destructive" />
                        ) : (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        )}
                        {isFailed
                          ? t("newProjectPage.progress.errorTitle", {
                              defaultValue: "Ingestion failed",
                            })
                          : t("newProjectPage.progress.title")}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {progressValue}%
                      </span>
                    </div>

                    <Progress value={progressValue} />

                    {/* Stage label + live elapsed timer */}
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium flex items-center gap-2 min-w-0">
                        {!isCompleted && !isFailed && (
                          <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-primary animate-pulse" />
                        )}
                        <span className="truncate">{stageLabel}</span>
                      </p>
                      {!isCompleted && !isFailed && (
                        <span className="text-xs tabular-nums text-muted-foreground shrink-0">
                          {elapsedLabel}
                        </span>
                      )}
                    </div>

                    {/* Detailed stats — only meaningful while running */}
                    {!isFailed && (
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div className="flex items-center justify-between gap-2">
                          <span>
                            {t("newProjectPage.progress.sourcesShort", {
                              defaultValue: "Sources",
                            })}
                          </span>
                          <span className="tabular-nums font-medium text-foreground">
                            {processedSources} / {totalSources || "?"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span>
                            {t("newProjectPage.progress.itemsCollected", {
                              defaultValue: "Items collected",
                            })}
                          </span>
                          <span className="tabular-nums font-medium text-foreground">
                            {itemsFetched.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span>
                            {t("newProjectPage.progress.itemsSaved", {
                              defaultValue: "Saved unique",
                            })}
                          </span>
                          <span className="tabular-nums font-medium text-foreground">
                            {itemsSaved.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span>
                            {t("newProjectPage.progress.itemsDeduplicated", {
                              defaultValue: "Duplicates filtered",
                            })}
                          </span>
                          <span className="tabular-nums font-medium text-foreground">
                            {itemsDeduplicated.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Failed: full error message */}
                    {isFailed && jobStatus?.error && (
                      <p className="text-xs text-destructive/90 break-words">
                        {jobStatus.error}
                      </p>
                    )}

                    {/* Action row */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      {isCompleted && !redirecting && (
                        <Button
                          type="button"
                          onClick={handleOpenAnyway}
                          className="flex-1"
                        >
                          {t("newProjectPage.progress.openProject")}
                        </Button>
                      )}

                      {isFailed && (
                        <>
                          <Button
                            type="button"
                            onClick={handleRetry}
                            disabled={isRetrying}
                            className="flex-1"
                          >
                            <RotateCw
                              className={`h-4 w-4 mr-2 ${isRetrying ? "animate-spin" : ""}`}
                            />
                            {t("newProjectPage.progress.retry", {
                              defaultValue: "Retry ingestion",
                            })}
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={handleOpenAnyway}
                            className="flex-1"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            {t("newProjectPage.progress.openAnyway", {
                              defaultValue: "Open project anyway",
                            })}
                          </Button>
                        </>
                      )}

                      {!isCompleted && !isFailed && showSkip && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleOpenAnyway}
                          className="flex-1"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          {t("newProjectPage.progress.continueInBackground", {
                            defaultValue: "Continue in background",
                          })}
                        </Button>
                      )}
                    </div>

                    {!isCompleted && !isFailed && showSkip && (
                      <p className="text-[11px] text-muted-foreground">
                        {t("newProjectPage.progress.continueHint", {
                          defaultValue:
                            "Ingestion will keep running in the background. New mentions will appear automatically.",
                        })}
                      </p>
                    )}
                  </motion.div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="topic" className="text-sm font-medium">
                      {t("newProjectPage.topicLabel")}
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="topic"
                        placeholder={t("newProjectPage.topicPlaceholder")}
                        disabled={isLoading}
                        className="h-12 pl-10"
                        {...register("topic")}
                      />
                    </div>
                    {errors.topic && (
                      <p className="text-sm text-destructive">{errors.topic.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="aliases" className="text-sm font-medium">
                      {t("newProjectPage.aliasesLabel", { defaultValue: "Additional keywords (optional)" })}
                    </Label>
                    <Textarea
                      id="aliases"
                      placeholder={t("newProjectPage.aliasesPlaceholder", {
                        defaultValue:
                          "Comma-separated synonyms: global warming, climate crisis",
                      })}
                      disabled={isLoading}
                      rows={2}
                      {...register("aliases")}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("newProjectPage.aliasesHelp", {
                        defaultValue:
                          "Add other spellings or translations to find more mentions of the same topic.",
                      })}
                    </p>
                    {errors.aliases && (
                      <p className="text-sm text-destructive">{errors.aliases.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-medium">
                      {t("newProjectPage.descriptionLabel")}
                    </Label>
                    <Textarea
                      id="description"
                      placeholder={t("newProjectPage.descriptionPlaceholder")}
                      disabled={isLoading}
                      rows={3}
                      {...register("description")}
                    />
                    {errors.description && (
                      <p className="text-sm text-destructive">{errors.description.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-base glow-sm"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        {t("newProjectPage.creating")}
                      </>
                    ) : (
                      <>
                        {t("newProjectPage.submit")}
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </form>

                <p className="text-xs text-center text-muted-foreground mt-4">
                  Powered by NewsAPI · SerpAPI · NewsData.io · Event Registry · World News API
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
