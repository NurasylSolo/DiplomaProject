"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Save,
  Plus,
  X,
  Trash2,
  Globe,
  Bell,
  Key,
  User as UserIcon,
  FileText,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/api";
import {
  useDeleteProject,
  useProject,
  useRefreshProject,
  useTranslation,
  useUpdateProject,
  useUser,
} from "@/hooks";

interface SettingsPageProps {
  params: Promise<{ projectId: string }>;
}

const ACCENT_COLORS = [
  { name: "Cyan", value: "#00A3E0" },
  { name: "Emerald", value: "#10B981" },
  { name: "Amber", value: "#F59E0B" },
  { name: "Rose", value: "#F43F5E" },
  { name: "Violet", value: "#8B5CF6" },
  { name: "Blue", value: "#3B82F6" },
];

// Source category ids stored in `project.settings.activeSources`. Names &
// descriptions are pulled from i18n in render.
const SOURCE_CATEGORIES = [
  "news_sites",
  "social_media",
  "blogs",
  "video_platforms",
  "podcasts",
  "review_sites",
] as const;

type SourceCategory = (typeof SOURCE_CATEGORIES)[number];

const ALERT_LEVELS = ["low", "medium", "high"] as const;

interface Draft {
  projectName: string;
  projectDescription: string;
  selectedColor: string;
  keywords: string[];
  aliases: string[];
  excludedKeywords: string[];
  activeSources: string[];
  emailNotifications: boolean;
  alertThreshold: string;
  webhookUrl: string;
}

export default function SettingsPage({ params }: SettingsPageProps) {
  const { projectId } = use(params);
  const { t } = useTranslation();
  const router = useRouter();
  const { data: project, isLoading } = useProject(projectId);
  const { data: currentUser } = useUser();
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();
  const refreshMutation = useRefreshProject();

  const initialDraft = useMemo<Draft>(
    () => ({
      projectName: project?.name || "",
      projectDescription: project?.description || "",
      selectedColor: project?.accentColor || "#00A3E0",
      keywords: Array.isArray(project?.settings?.keywords) ? project.settings.keywords : [],
      aliases: Array.isArray(project?.settings?.aliases) ? project.settings.aliases : [],
      excludedKeywords: Array.isArray(project?.settings?.excludedKeywords)
        ? project.settings.excludedKeywords
        : [],
      activeSources: Array.isArray(project?.settings?.activeSources)
        ? project.settings.activeSources
        : ([...SOURCE_CATEGORIES.slice(0, 3)] as string[]),
      emailNotifications: Boolean(project?.settings?.notifications?.email ?? true),
      alertThreshold: String(project?.settings?.notifications?.alertThreshold || "high"),
      webhookUrl: project?.settings?.notifications?.webhookUrl || "",
    }),
    [project]
  );

  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [keywordInput, setKeywordInput] = useState("");
  const [aliasInput, setAliasInput] = useState("");
  const [excludedInput, setExcludedInput] = useState("");

  // Re-seed draft when the project finishes loading or refetches with a
  // different revision. Simple ref-equality on `project` is fine because
  // useProject returns a fresh object on refetch only.
  useEffect(() => {
    setDraft(initialDraft);
  }, [initialDraft]);

  const addKeyword = (type: "required" | "excluded" | "alias") => {
    const value =
      type === "required"
        ? keywordInput.trim()
        : type === "alias"
          ? aliasInput.trim()
          : excludedInput.trim();
    if (!value) return;

    setDraft((prev) => {
      if (type === "required") {
        if (prev.keywords.includes(value)) return prev;
        return { ...prev, keywords: [...prev.keywords, value] };
      }
      if (type === "alias") {
        if (prev.aliases.includes(value)) return prev;
        return { ...prev, aliases: [...prev.aliases, value] };
      }
      if (prev.excludedKeywords.includes(value)) return prev;
      return { ...prev, excludedKeywords: [...prev.excludedKeywords, value] };
    });

    if (type === "required") setKeywordInput("");
    else if (type === "alias") setAliasInput("");
    else setExcludedInput("");
  };

  const removeKeyword = (keyword: string, type: "required" | "excluded" | "alias") => {
    setDraft((prev) => {
      if (type === "required") {
        return { ...prev, keywords: prev.keywords.filter((k) => k !== keyword) };
      }
      if (type === "alias") {
        return { ...prev, aliases: prev.aliases.filter((k) => k !== keyword) };
      }
      return { ...prev, excludedKeywords: prev.excludedKeywords.filter((k) => k !== keyword) };
    });
  };

  const toggleSource = (category: SourceCategory, enabled: boolean) => {
    setDraft((prev) => {
      const set = new Set(prev.activeSources);
      if (enabled) set.add(category);
      else set.delete(category);
      return { ...prev, activeSources: Array.from(set) };
    });
  };

  // Triggers a fresh ingestion run on the backend. The backend creates a
  // `refresh_project_mentions` crawl job and the user can watch new mentions
  // arrive on the dashboard / mentions page.
  const triggerRefresh = (reason: "name-changed" | "manual") => {
    refreshMutation.mutate(projectId, {
      onSuccess: () => {
        toast.success(
          reason === "name-changed"
            ? t("projectSettingsPage.toasts.refetchTriggered", {
                defaultValue: "Topic renamed — fetching fresh mentions in background",
              })
            : t("projectSettingsPage.toasts.refreshStarted", {
                defaultValue: "Refreshing mentions in background",
              })
        );
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  };

  const handleSave = () => {
    const trimmedName = draft.projectName.trim();
    if (!trimmedName) {
      toast.error(
        t("projectSettingsPage.errors.nameRequired", {
          defaultValue: "Project name cannot be empty",
        })
      );
      return;
    }

    const previousName = (project?.name || "").trim();
    const nameChanged = trimmedName !== previousName;

    updateProjectMutation.mutate(
      {
        id: projectId,
        data: {
          name: trimmedName,
          description: draft.projectDescription.trim() || undefined,
          accent_color: draft.selectedColor,
          settings: {
            ...(project?.settings || {}),
            keywords: draft.keywords,
            aliases: draft.aliases,
            excludedKeywords: draft.excludedKeywords,
            activeSources: draft.activeSources,
            // Re-seed the topic query so the ingestion pipeline picks up the
            // renamed brand on its next refresh.
            topicQuery: trimmedName,
            notifications: {
              ...(project?.settings?.notifications || {}),
              email: draft.emailNotifications,
              alertThreshold: draft.alertThreshold,
              webhookUrl: draft.webhookUrl.trim() || undefined,
            },
          },
        },
      },
      {
        onSuccess: () => {
          toast.success(t("projectSettingsPage.toasts.updated"));
          // Auto-trigger refetch when the topic name changed — new name
          // means new search query against news APIs.
          if (nameChanged) triggerRefresh("name-changed");
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      }
    );
  };

  const handleDelete = () => {
    const ok = window.confirm(t("projectSettingsPage.confirmDelete"));
    if (!ok) return;
    deleteProjectMutation.mutate(projectId, {
      onSuccess: () => {
        toast.success(t("projectSettingsPage.toasts.deleted"));
        router.push("/dashboard");
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  };

  const isSaving = updateProjectMutation.isPending;
  const isDeleting = deleteProjectMutation.isPending;
  const isRefreshing = refreshMutation.isPending;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
            {t("projectSettingsPage.title")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("projectSettingsPage.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => triggerRefresh("manual")}
            disabled={isLoading || isRefreshing || isSaving || isDeleting}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
            {isRefreshing
              ? t("projectSettingsPage.refreshing", { defaultValue: "Refreshing..." })
              : t("projectSettingsPage.refreshNow", { defaultValue: "Refresh mentions" })}
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading || isSaving || isDeleting}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t("projectSettingsPage.deleteTopic")}
          </Button>
          <Button
            className="glow-sm"
            onClick={handleSave}
            disabled={isLoading || isSaving || isDeleting}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? t("projectSettingsPage.saving") : t("projectSettingsPage.saveChanges")}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="glass max-w-full overflow-x-auto justify-start">
          <TabsTrigger value="general" className="gap-2">
            <FileText className="h-4 w-4" />
            {t("projectSettingsPage.tabs.general")}
          </TabsTrigger>
          <TabsTrigger value="keywords" className="gap-2">
            <Key className="h-4 w-4" />
            {t("projectSettingsPage.tabs.keywords")}
          </TabsTrigger>
          <TabsTrigger value="sources" className="gap-2">
            <Globe className="h-4 w-4" />
            {t("projectSettingsPage.tabs.sources")}
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            {t("projectSettingsPage.tabs.notifications")}
          </TabsTrigger>
          <TabsTrigger value="owner" className="gap-2">
            <UserIcon className="h-4 w-4" />
            {t("projectSettingsPage.tabs.owner", { defaultValue: "Owner" })}
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="glass">
              <CardHeader>
                <CardTitle>{t("projectSettingsPage.general.title")}</CardTitle>
                <CardDescription>{t("projectSettingsPage.general.description")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("projectSettingsPage.general.projectName")}</Label>
                  <Input
                    id="name"
                    value={draft.projectName}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, projectName: e.target.value }))
                    }
                    className="max-w-md"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("projectSettingsPage.general.nameRefetchHint", {
                      defaultValue:
                        "Renaming the topic triggers a fresh news search after saving.",
                    })}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">
                    {t("projectSettingsPage.general.descriptionLabel")}
                  </Label>
                  <Textarea
                    id="description"
                    value={draft.projectDescription}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, projectDescription: e.target.value }))
                    }
                    className="max-w-md resize-none"
                    rows={3}
                  />
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label>{t("projectSettingsPage.general.accentColor")}</Label>
                  <div className="flex items-center gap-3 flex-wrap">
                    {ACCENT_COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({ ...prev, selectedColor: color.value }))
                        }
                        className={cn(
                          "w-8 h-8 rounded-full transition-all",
                          draft.selectedColor === color.value &&
                            "ring-2 ring-offset-2 ring-offset-background ring-primary"
                        )}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Keywords Settings */}
        <TabsContent value="keywords" className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="glass">
              <CardHeader>
                <CardTitle>{t("projectSettingsPage.keywords.requiredTitle")}</CardTitle>
                <CardDescription>
                  {t("projectSettingsPage.keywords.requiredDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {draft.keywords.length === 0 && (
                    <span className="text-sm text-muted-foreground">
                      {t("projectSettingsPage.keywords.noKeywords", {
                        defaultValue: "No keywords yet",
                      })}
                    </span>
                  )}
                  {draft.keywords.map((keyword) => (
                    <Badge
                      key={keyword}
                      variant="secondary"
                      className="pl-3 pr-1 py-1.5 gap-1"
                    >
                      {keyword}
                      <button
                        type="button"
                        onClick={() => removeKeyword(keyword, "required")}
                        className="ml-1 hover:bg-destructive/20 rounded p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>

                <div className="flex gap-2 max-w-md">
                  <Input
                    placeholder={t("projectSettingsPage.keywords.addKeyword")}
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addKeyword("required")}
                  />
                  <Button onClick={() => addKeyword("required")} type="button">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <Card className="glass">
              <CardHeader>
                <CardTitle>
                  {t("projectSettingsPage.keywords.aliasesTitle", {
                    defaultValue: "Aliases & alternative spellings",
                  })}
                </CardTitle>
                <CardDescription>
                  {t("projectSettingsPage.keywords.aliasesDescription", {
                    defaultValue:
                      "Add other ways the topic is mentioned (transliterations, short forms, translations) to find more relevant articles.",
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {draft.aliases.length === 0 && (
                    <span className="text-sm text-muted-foreground">
                      {t("projectSettingsPage.keywords.noAliases", { defaultValue: "No aliases yet" })}
                    </span>
                  )}
                  {draft.aliases.map((alias) => (
                    <Badge
                      key={alias}
                      variant="secondary"
                      className="pl-3 pr-1 py-1.5 gap-1 border-primary/30 bg-primary/10"
                    >
                      {alias}
                      <button
                        type="button"
                        onClick={() => removeKeyword(alias, "alias")}
                        className="ml-1 hover:bg-destructive/20 rounded p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>

                <div className="flex gap-2 max-w-md">
                  <Input
                    placeholder={t("projectSettingsPage.keywords.addAlias", {
                      defaultValue: "Add an alias (e.g. global warming)",
                    })}
                    value={aliasInput}
                    onChange={(e) => setAliasInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addKeyword("alias")}
                  />
                  <Button onClick={() => addKeyword("alias")} type="button">
                    <Plus className="h-4 w-4" />
                  </Button>
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
              <CardHeader>
                <CardTitle>{t("projectSettingsPage.keywords.excludedTitle")}</CardTitle>
                <CardDescription>
                  {t("projectSettingsPage.keywords.excludedDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {draft.excludedKeywords.length === 0 && (
                    <span className="text-sm text-muted-foreground">
                      {t("projectSettingsPage.keywords.noExcluded", {
                        defaultValue: "No excluded keywords yet",
                      })}
                    </span>
                  )}
                  {draft.excludedKeywords.map((keyword) => (
                    <Badge
                      key={keyword}
                      variant="outline"
                      className="pl-3 pr-1 py-1.5 gap-1 border-destructive/30 text-destructive"
                    >
                      {keyword}
                      <button
                        type="button"
                        onClick={() => removeKeyword(keyword, "excluded")}
                        className="ml-1 hover:bg-destructive/20 rounded p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>

                <div className="flex gap-2 max-w-md">
                  <Input
                    placeholder={t("projectSettingsPage.keywords.addExcludedKeyword")}
                    value={excludedInput}
                    onChange={(e) => setExcludedInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addKeyword("excluded")}
                  />
                  <Button variant="outline" onClick={() => addKeyword("excluded")} type="button">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Sources Settings */}
        <TabsContent value="sources" className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="glass">
              <CardHeader>
                <CardTitle>{t("projectSettingsPage.sources.title")}</CardTitle>
                <CardDescription>{t("projectSettingsPage.sources.description")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {SOURCE_CATEGORIES.map((category) => {
                  const labelKey = sourceLabelKey(category);
                  const descKey = sourceDescKey(category);
                  const enabled = draft.activeSources.includes(category);
                  return (
                    <div
                      key={category}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/30"
                    >
                      <div>
                        <p className="font-medium">{t(labelKey)}</p>
                        <p className="text-sm text-muted-foreground">{t(descKey)}</p>
                      </div>
                      <Switch
                        checked={enabled}
                        onCheckedChange={(checked) => toggleSource(category, checked)}
                      />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="glass">
              <CardHeader>
                <CardTitle>{t("projectSettingsPage.notifications.title")}</CardTitle>
                <CardDescription>
                  {t("projectSettingsPage.notifications.description")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {t("projectSettingsPage.notifications.emailTitle")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t("projectSettingsPage.notifications.emailAlerts")}
                    </p>
                  </div>
                  <Switch
                    checked={draft.emailNotifications}
                    onCheckedChange={(checked) =>
                      setDraft((prev) => ({ ...prev, emailNotifications: checked }))
                    }
                  />
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label>{t("projectSettingsPage.notifications.alertThreshold")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("projectSettingsPage.notifications.alertThresholdHelp")}
                  </p>
                  <div className="flex gap-2">
                    {ALERT_LEVELS.map((level) => (
                      <Button
                        key={level}
                        type="button"
                        variant={draft.alertThreshold === level ? "default" : "outline"}
                        size="sm"
                        onClick={() =>
                          setDraft((prev) => ({ ...prev, alertThreshold: level }))
                        }
                        className="capitalize"
                      >
                        {t(`projectSettingsPage.levels.${level}`)}
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="webhook">
                    {t("projectSettingsPage.notifications.webhookUrl")}
                  </Label>
                  <Input
                    id="webhook"
                    type="url"
                    placeholder={t("projectSettingsPage.notifications.webhookPlaceholder")}
                    className="max-w-md"
                    value={draft.webhookUrl}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, webhookUrl: e.target.value }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("projectSettingsPage.notifications.webhookHelp")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Owner Info (replaces hardcoded "Team" tab — multi-user is not
            wired in the backend yet, so we just show the actual project
            owner from the current user's identity). */}
        <TabsContent value="owner" className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="glass">
              <CardHeader>
                <CardTitle>
                  {t("projectSettingsPage.ownerCard.title", {
                    defaultValue: "Project owner",
                  })}
                </CardTitle>
                <CardDescription>
                  {t("projectSettingsPage.ownerCard.description", {
                    defaultValue:
                      "You are the sole owner of this project. Multi-user collaboration is coming soon.",
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-medium text-lg">
                    {(currentUser?.name || currentUser?.email || "?")
                      .split(" ")
                      .map((s) => s[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {currentUser?.name ||
                        t("projectSettingsPage.ownerCard.unnamed", {
                          defaultValue: "Unnamed user",
                        })}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {currentUser?.email || "—"}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {t("projectSettingsPage.ownerCard.ownerBadge", {
                      defaultValue: "Owner",
                    })}
                  </Badge>
                </div>

                {project?.createdAt && (
                  <p className="text-xs text-muted-foreground">
                    {t("projectSettingsPage.ownerCard.createdOn", {
                      defaultValue: "Project created on {{date}}",
                      date: new Date(project.createdAt).toLocaleDateString(),
                    })}
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function sourceLabelKey(category: SourceCategory): string {
  switch (category) {
    case "news_sites":
      return "projectSettingsPage.sources.newsSites";
    case "social_media":
      return "projectSettingsPage.sources.socialMedia";
    case "blogs":
      return "projectSettingsPage.sources.blogs";
    case "video_platforms":
      return "projectSettingsPage.sources.videoPlatforms";
    case "podcasts":
      return "projectSettingsPage.sources.podcasts";
    case "review_sites":
      return "projectSettingsPage.sources.reviewSites";
  }
}

function sourceDescKey(category: SourceCategory): string {
  switch (category) {
    case "news_sites":
      return "projectSettingsPage.sources.newsSitesDesc";
    case "social_media":
      return "projectSettingsPage.sources.socialMediaDesc";
    case "blogs":
      return "projectSettingsPage.sources.blogsDesc";
    case "video_platforms":
      return "projectSettingsPage.sources.videoPlatformsDesc";
    case "podcasts":
      return "projectSettingsPage.sources.podcastsDesc";
    case "review_sites":
      return "projectSettingsPage.sources.reviewSitesDesc";
  }
}
