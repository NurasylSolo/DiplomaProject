"use client";

import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Save,
  Upload,
  Plus,
  X,
  Trash2,
  Globe,
  Bell,
  Key,
  Users,
  FileText,
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
import { useDeleteProject, useProject, useUpdateProject, useTranslation } from "@/hooks";

interface SettingsPageProps {
  params: Promise<{ projectId: string }>;
}

const accentColors = [
  { name: "Cyan", value: "#00A3E0" },
  { name: "Emerald", value: "#10B981" },
  { name: "Amber", value: "#F59E0B" },
  { name: "Rose", value: "#F43F5E" },
  { name: "Violet", value: "#8B5CF6" },
  { name: "Blue", value: "#3B82F6" },
];

export default function SettingsPage({ params }: SettingsPageProps) {
  const { projectId } = use(params);
  const { t } = useTranslation();
  const router = useRouter();
  const { data: project, isLoading } = useProject(projectId);
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();

  const initialDraft = useMemo(
    () => ({
      projectName: project?.name || "",
      projectDescription: project?.description || "",
      selectedColor: project?.accentColor || "#00A3E0",
      keywords: Array.isArray(project?.settings?.keywords) ? project.settings.keywords : [],
      aliases: Array.isArray(project?.settings?.aliases) ? project.settings.aliases : [],
      excludedKeywords: Array.isArray(project?.settings?.excludedKeywords)
        ? project.settings.excludedKeywords
        : [],
      emailNotifications: Boolean(project?.settings?.notifications?.email ?? true),
      alertThreshold: String(project?.settings?.notifications?.alertThreshold || "high"),
    }),
    [project]
  );
  const [draft, setDraft] = useState(initialDraft);
  const [newKeyword, setNewKeyword] = useState("");
  const values = draft.projectName || draft.keywords.length > 0 ? draft : initialDraft;
  
  const addKeyword = (type: "required" | "excluded" | "alias") => {
    if (!newKeyword.trim()) return;
    const value = newKeyword.trim();

    if (type === "required") {
      setDraft((prev) => ({ ...prev, keywords: [...values.keywords, value] }));
    } else if (type === "alias") {
      setDraft((prev) => ({ ...prev, aliases: [...values.aliases, value] }));
    } else {
      setDraft((prev) => ({
        ...prev,
        excludedKeywords: [...values.excludedKeywords, value],
      }));
    }
    setNewKeyword("");
  };

  const removeKeyword = (keyword: string, type: "required" | "excluded" | "alias") => {
    if (type === "required") {
      setDraft((prev) => ({
        ...prev,
        keywords: values.keywords.filter((k) => k !== keyword),
      }));
    } else if (type === "alias") {
      setDraft((prev) => ({
        ...prev,
        aliases: values.aliases.filter((k) => k !== keyword),
      }));
    } else {
      setDraft((prev) => ({
        ...prev,
        excludedKeywords: values.excludedKeywords.filter((k) => k !== keyword),
      }));
    }
  };

  const handleSave = () => {
    updateProjectMutation.mutate(
      {
        id: projectId,
        data: {
          name: values.projectName.trim(),
          description: values.projectDescription.trim() || undefined,
          accent_color: values.selectedColor,
          settings: {
            ...(project?.settings || {}),
            keywords: values.keywords,
            aliases: values.aliases,
            excludedKeywords: values.excludedKeywords,
            topicQuery: values.projectName.trim(),
            notifications: {
              ...(project?.settings?.notifications || {}),
              email: values.emailNotifications,
              alertThreshold: values.alertThreshold,
            },
          },
        },
      },
      {
        onSuccess: () => toast.success(t("projectSettingsPage.toasts.updated")),
        onError: (error) => toast.error(getErrorMessage(error)),
      }
    );
  };

  const handleDelete = () => {
    const ok = window.confirm(
      t("projectSettingsPage.confirmDelete")
    );
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
  
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
            {t("projectSettingsPage.title")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("projectSettingsPage.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading || isSaving || isDeleting}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t("projectSettingsPage.deleteTopic")}
          </Button>
          <Button className="glow-sm" onClick={handleSave} disabled={isLoading || isSaving || isDeleting}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? t("projectSettingsPage.saving") : t("projectSettingsPage.saveChanges")}
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="glass">
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
          <TabsTrigger value="team" className="gap-2">
            <Users className="h-4 w-4" />
            {t("projectSettingsPage.tabs.team")}
          </TabsTrigger>
        </TabsList>
        
        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="glass">
              <CardHeader>
                <CardTitle>{t("projectSettingsPage.general.title")}</CardTitle>
                <CardDescription>
                  {t("projectSettingsPage.general.description")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("projectSettingsPage.general.projectName")}</Label>
                  <Input
                    id="name"
                    value={values.projectName}
                    onChange={(e) => setDraft((prev) => ({ ...prev, projectName: e.target.value }))}
                    className="max-w-md"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">{t("projectSettingsPage.general.descriptionLabel")}</Label>
                  <Textarea
                    id="description"
                    value={values.projectDescription}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, projectDescription: e.target.value }))
                    }
                    className="max-w-md resize-none"
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>{t("projectSettingsPage.general.projectLogo")}</Label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-xl bg-primary/10 flex items-center justify-center border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>{t("projectSettingsPage.general.uploadLogo")}</p>
                      <p className="text-xs">{t("projectSettingsPage.general.logoFormat")}</p>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-3">
                  <Label>{t("projectSettingsPage.general.accentColor")}</Label>
                  <div className="flex items-center gap-3">
                    {accentColors.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setDraft((prev) => ({ ...prev, selectedColor: color.value }))}
                        className={cn(
                          "w-8 h-8 rounded-full transition-all",
                          values.selectedColor === color.value &&
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="glass">
              <CardHeader>
                <CardTitle>{t("projectSettingsPage.keywords.requiredTitle")}</CardTitle>
                <CardDescription>
                  {t("projectSettingsPage.keywords.requiredDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {values.keywords.map((keyword) => (
                    <Badge
                      key={keyword}
                      variant="secondary"
                      className="pl-3 pr-1 py-1.5 gap-1"
                    >
                      {keyword}
                      <button
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
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addKeyword("required")}
                  />
                  <Button onClick={() => addKeyword("required")}>
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
                  {values.aliases.length === 0 && (
                    <span className="text-sm text-muted-foreground">
                      {t("projectSettingsPage.keywords.noAliases", { defaultValue: "No aliases yet" })}
                    </span>
                  )}
                  {values.aliases.map((alias) => (
                    <Badge
                      key={alias}
                      variant="secondary"
                      className="pl-3 pr-1 py-1.5 gap-1 border-primary/30 bg-primary/10"
                    >
                      {alias}
                      <button
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
                      defaultValue: "Add an alias (e.g. Arman Tsarukyan)",
                    })}
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addKeyword("alias")}
                  />
                  <Button onClick={() => addKeyword("alias")}>
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
                  {values.excludedKeywords.map((keyword) => (
                    <Badge
                      key={keyword}
                      variant="outline"
                      className="pl-3 pr-1 py-1.5 gap-1 border-destructive/30 text-destructive"
                    >
                      {keyword}
                      <button
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
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addKeyword("excluded")}
                  />
                  <Button variant="outline" onClick={() => addKeyword("excluded")}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
        
        {/* Sources Settings */}
        <TabsContent value="sources" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="glass">
              <CardHeader>
                <CardTitle>{t("projectSettingsPage.sources.title")}</CardTitle>
                <CardDescription>
                  {t("projectSettingsPage.sources.description")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { name: t("projectSettingsPage.sources.newsSites"), description: t("projectSettingsPage.sources.newsSitesDesc"), enabled: true },
                  { name: t("projectSettingsPage.sources.socialMedia"), description: t("projectSettingsPage.sources.socialMediaDesc"), enabled: true },
                  { name: t("projectSettingsPage.sources.blogs"), description: t("projectSettingsPage.sources.blogsDesc"), enabled: true },
                  { name: t("projectSettingsPage.sources.videoPlatforms"), description: t("projectSettingsPage.sources.videoPlatformsDesc"), enabled: false },
                  { name: t("projectSettingsPage.sources.podcasts"), description: t("projectSettingsPage.sources.podcastsDesc"), enabled: false },
                  { name: t("projectSettingsPage.sources.reviewSites"), description: t("projectSettingsPage.sources.reviewSitesDesc"), enabled: false },
                ].map((source) => (
                  <div
                    key={source.name}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/30"
                  >
                    <div>
                      <p className="font-medium">{source.name}</p>
                      <p className="text-sm text-muted-foreground">{source.description}</p>
                    </div>
                    <Switch defaultChecked={source.enabled} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
        
        {/* Notifications Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
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
                    <p className="font-medium">{t("projectSettingsPage.notifications.emailTitle")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("projectSettingsPage.notifications.emailAlerts")}
                    </p>
                  </div>
                  <Switch
                    checked={values.emailNotifications}
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
                    {["low", "medium", "high"].map((level) => (
                      <Button
                        key={level}
                        variant={values.alertThreshold === level ? "default" : "outline"}
                        size="sm"
                        onClick={() => setDraft((prev) => ({ ...prev, alertThreshold: level }))}
                        className="capitalize"
                      >
                        {t(`projectSettingsPage.levels.${level}`)}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <Label htmlFor="webhook">{t("projectSettingsPage.notifications.webhookUrl")}</Label>
                  <Input
                    id="webhook"
                    placeholder={t("projectSettingsPage.notifications.webhookPlaceholder")}
                    className="max-w-md"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("projectSettingsPage.notifications.webhookHelp")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
        
        {/* Team Settings */}
        <TabsContent value="team" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="glass">
              <CardHeader>
                <CardTitle>{t("projectSettingsPage.team.title")}</CardTitle>
                <CardDescription>
                  {t("projectSettingsPage.team.description")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { name: "John Doe", email: "john@company.com", role: "Owner" },
                  { name: "Jane Smith", email: "jane@company.com", role: "Manager" },
                  { name: "Bob Wilson", email: "bob@company.com", role: "Analyst" },
                ].map((member) => (
                  <div
                    key={member.email}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-medium">
                        {member.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    <Badge variant="outline">{member.role}</Badge>
                  </div>
                ))}
                
                <Button variant="outline" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  {t("projectSettingsPage.team.invite")}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

