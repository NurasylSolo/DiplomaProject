"use client";

import { use, useState } from "react";
import { motion } from "framer-motion";
import {
  Save,
  Upload,
  Plus,
  X,
  Globe,
  Bell,
  Key,
  Users,
  Palette,
  FileText,
} from "lucide-react";
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
import { useTranslation } from "@/hooks";

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
  const [projectName, setProjectName] = useState("Tech Brand Monitor");
  const [projectDescription, setProjectDescription] = useState(
    "Monitoring technology brand mentions across news, social media, and web sources."
  );
  const [selectedColor, setSelectedColor] = useState("#00A3E0");
  const [keywords, setKeywords] = useState(["technology", "AI", "startup", "innovation"]);
  const [excludedKeywords, setExcludedKeywords] = useState(["spam", "advertisement"]);
  const [newKeyword, setNewKeyword] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [alertThreshold, setAlertThreshold] = useState("high");
  
  const addKeyword = (type: "required" | "excluded") => {
    if (!newKeyword.trim()) return;
    
    if (type === "required") {
      setKeywords((prev) => [...prev, newKeyword.trim()]);
    } else {
      setExcludedKeywords((prev) => [...prev, newKeyword.trim()]);
    }
    setNewKeyword("");
  };
  
  const removeKeyword = (keyword: string, type: "required" | "excluded") => {
    if (type === "required") {
      setKeywords((prev) => prev.filter((k) => k !== keyword));
    } else {
      setExcludedKeywords((prev) => prev.filter((k) => k !== keyword));
    }
  };
  
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
            {t("settings.title")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("settings.subtitle")}
          </p>
        </div>
        <Button className="glow-sm">
          <Save className="h-4 w-4 mr-2" />
          {t("settings.save")}
        </Button>
      </div>
      
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="glass">
          <TabsTrigger value="general" className="gap-2">
            <FileText className="h-4 w-4" />
            {t("settings.tabs.general")}
          </TabsTrigger>
          <TabsTrigger value="keywords" className="gap-2">
            <Key className="h-4 w-4" />
            {t("settings.tabs.keywords")}
          </TabsTrigger>
          <TabsTrigger value="sources" className="gap-2">
            <Globe className="h-4 w-4" />
            {t("settings.tabs.sources")}
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            {t("settings.tabs.notifications")}
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <Users className="h-4 w-4" />
            {t("settings.tabs.team")}
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
                <CardTitle>{t("settings.general.title")}</CardTitle>
                <CardDescription>
                  {t("settings.general.subtitle")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("settings.general.name")}</Label>
                  <Input
                    id="name"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="max-w-md"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">{t("settings.general.description")}</Label>
                  <Textarea
                    id="description"
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    className="max-w-md resize-none"
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>{t("settings.general.logo")}</Label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-xl bg-primary/10 flex items-center justify-center border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>{t("settings.general.logoHint")}</p>
                      <p className="text-xs">PNG, JPG up to 2MB</p>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-3">
                  <Label>{t("settings.general.accentColor")}</Label>
                  <div className="flex items-center gap-3">
                    {accentColors.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setSelectedColor(color.value)}
                        className={cn(
                          "w-8 h-8 rounded-full transition-all",
                          selectedColor === color.value &&
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
                <CardTitle>{t("settings.keywords.required.title")}</CardTitle>
                <CardDescription>
                  {t("settings.keywords.required.subtitle")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {keywords.map((keyword) => (
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
                    placeholder={t("settings.keywords.addPlaceholder")}
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
            transition={{ delay: 0.1 }}
          >
            <Card className="glass">
              <CardHeader>
                <CardTitle>{t("settings.keywords.excluded.title")}</CardTitle>
                <CardDescription>
                  {t("settings.keywords.excluded.subtitle")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {excludedKeywords.map((keyword) => (
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
                    placeholder={t("settings.keywords.addPlaceholder")}
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
                <CardTitle>Data Sources</CardTitle>
                <CardDescription>
                  Configure which sources to monitor
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { name: "News Sites", description: "Major news outlets and publications", enabled: true },
                  { name: "Social Media", description: "Twitter, Facebook, LinkedIn", enabled: true },
                  { name: "Blogs", description: "Medium, personal blogs, forums", enabled: true },
                  { name: "Video Platforms", description: "YouTube, TikTok, Vimeo", enabled: false },
                  { name: "Podcasts", description: "Podcast transcripts and mentions", enabled: false },
                  { name: "Review Sites", description: "TripAdvisor, Yelp, App Store", enabled: false },
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
                <CardTitle>{t("settings.notifications.title")}</CardTitle>
                <CardDescription>
                  {t("settings.notifications.subtitle")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{t("settings.notifications.email")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("settings.notifications.emailDesc")}
                    </p>
                  </div>
                  <Switch
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>
                
                <Separator />
                
                <div className="space-y-3">
                  <Label>{t("settings.notifications.threshold")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.notifications.thresholdDesc")}
                  </p>
                  <div className="flex gap-2">
                    {["low", "medium", "high"].map((level) => (
                      <Button
                        key={level}
                        variant={alertThreshold === level ? "default" : "outline"}
                        size="sm"
                        onClick={() => setAlertThreshold(level)}
                        className="capitalize"
                      >
                        {t(`insights.severity.${level}`)}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <Label htmlFor="webhook">{t("settings.notifications.webhook")}</Label>
                  <Input
                    id="webhook"
                    placeholder="https://your-webhook-url.com/endpoint"
                    className="max-w-md"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("settings.notifications.webhookDesc")}
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
                <CardTitle>{t("settings.team.title")}</CardTitle>
                <CardDescription>
                  {t("settings.team.subtitle")}
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
                  {t("settings.team.invite")}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

