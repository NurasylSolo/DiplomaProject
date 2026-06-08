"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Save,
  User,
  Lock,
  Trash2,
  Eye,
  EyeOff,
  Check,
  X,
  Smartphone,
  LogOut,
  Loader2,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { enUS, ru } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { tokenManager, getErrorMessage } from "@/lib/api";
import { authApi } from "@/lib/api/services";
import { useLogout, useTranslation, useUser } from "@/hooks";
import { AvatarUploader } from "@/features/profile";

function pickInitials(name?: string, email?: string): string {
  const base = (name || email || "?").trim();
  return base
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function dateFnsLocale(lang: string) {
  if (lang.startsWith("ru")) return ru;
  if (lang.startsWith("kz") || lang.startsWith("kk")) return ru;
  return enUS;
}

function formatRelative(iso: string, lang: string): string {
  if (!iso) return "";
  try {
    return formatDistanceToNow(new Date(iso), {
      addSuffix: true,
      locale: dateFnsLocale(lang),
    });
  } catch {
    return iso;
  }
}

export default function ProfileSettingsPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const languages = [
    { value: "en", label: t("languages.en") },
    { value: "ru", label: t("languages.ru") },
    { value: "kz", label: t("languages.kz") },
  ];

  const timezones = [
    { value: "Asia/Almaty", label: t("accountSettingsPage.timezones.almaty") },
    { value: "Asia/Astana", label: t("accountSettingsPage.timezones.astana") },
    { value: "Europe/Moscow", label: t("accountSettingsPage.timezones.moscow") },
    { value: "Europe/London", label: t("accountSettingsPage.timezones.london") },
    { value: "America/New_York", label: t("accountSettingsPage.timezones.newYork") },
  ];

  const queryClient = useQueryClient();
  const logoutMutation = useLogout();
  const { data: apiUser, isLoading: isUserLoading } = useUser();
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [localeDraft, setLocaleDraft] = useState<string | null>(null);
  const [timezoneDraft, setTimezoneDraft] = useState<string | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");

  const currentRefreshToken = tokenManager.getRefreshToken() || "";

  const sessionsQuery = useQuery({
    queryKey: ["user", "sessions"],
    queryFn: () => authApi.getSessions(currentRefreshToken),
    enabled: !!apiUser,
  });

  const profileDraft = {
    name: nameDraft ?? apiUser?.name ?? "",
    locale: localeDraft ?? apiUser?.locale ?? "ru",
    timezone: timezoneDraft ?? apiUser?.timezone ?? "Asia/Almaty",
  };

  const updateProfileMutation = useMutation({
    mutationFn: () => authApi.updateSettings(profileDraft),
    onSuccess: async () => {
      toast.success(t("accountSettingsPage.toasts.profileUpdated"));
      await queryClient.invalidateQueries({ queryKey: ["user"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const changePasswordMutation = useMutation({
    mutationFn: () => authApi.changePassword(currentPassword, newPassword),
    onSuccess: async () => {
      toast.success(t("accountSettingsPage.toasts.passwordUpdated"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      await queryClient.invalidateQueries({ queryKey: ["user", "sessions"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const revokeSessionMutation = useMutation({
    mutationFn: (sessionId: string) => authApi.revokeSession(sessionId),
    onSuccess: async () => {
      toast.success(t("accountSettingsPage.toasts.sessionRevoked"));
      await queryClient.invalidateQueries({ queryKey: ["user", "sessions"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const revokeOthersMutation = useMutation({
    mutationFn: () => authApi.revokeOtherSessions(currentRefreshToken),
    onSuccess: async () => {
      toast.success(t("accountSettingsPage.toasts.otherSessionsRevoked"));
      await queryClient.invalidateQueries({ queryKey: ["user", "sessions"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const deleteAccountMutation = useMutation({
    mutationFn: () => authApi.deleteAccount(deletePassword),
    onSuccess: async () => {
      toast.success(t("accountSettingsPage.toasts.accountDeleted"));
      await logoutMutation.mutateAsync();
      router.push("/login");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const passwordStrength = useMemo(() => {
    if (!newPassword) return { score: 0, label: "" };
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[a-z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;
    const labels = [
      "",
      t("accountSettingsPage.passwordStrength.weak"),
      t("accountSettingsPage.passwordStrength.fair"),
      t("accountSettingsPage.passwordStrength.good"),
      t("accountSettingsPage.passwordStrength.strong"),
      t("accountSettingsPage.passwordStrength.excellent"),
    ];
    return { score, label: labels[score] };
  }, [newPassword, t]);

  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/profile">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">{t("accountSettingsPage.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("accountSettingsPage.subtitle")}</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="glass max-w-full overflow-x-auto justify-start">
          <TabsTrigger value="profile" className="gap-2"><User className="h-4 w-4" />{t("accountSettingsPage.tabs.profile")}</TabsTrigger>
          <TabsTrigger value="security" className="gap-2"><Lock className="h-4 w-4" />{t("accountSettingsPage.tabs.security")}</TabsTrigger>
          <TabsTrigger value="sessions" className="gap-2"><Smartphone className="h-4 w-4" />{t("accountSettingsPage.tabs.sessions")}</TabsTrigger>
          <TabsTrigger value="danger" className="gap-2"><AlertTriangle className="h-4 w-4" />{t("accountSettingsPage.tabs.danger")}</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="glass">
            <CardHeader>
              <CardTitle>{t("accountSettingsPage.profile.title")}</CardTitle>
              <CardDescription>{t("accountSettingsPage.profile.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar uploader (shared with /profile) */}
              <AvatarUploader
                currentAvatar={apiUser?.avatar}
                userInitials={pickInitials(apiUser?.name, apiUser?.email)}
                size="md"
              />
              <div className="border-t border-border/50" />
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("accountSettingsPage.profile.fullName")}</Label>
                  <Input value={profileDraft.name} onChange={(e) => setNameDraft(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("accountSettingsPage.profile.email")}</Label>
                  <Input value={apiUser?.email || ""} disabled />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("accountSettingsPage.profile.language")}</Label>
                  <Select value={profileDraft.locale} onValueChange={setLocaleDraft}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {languages.map((lang) => <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("accountSettingsPage.profile.timezone")}</Label>
                  <Select value={profileDraft.timezone} onValueChange={setTimezoneDraft}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {timezones.map((tz) => <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={() => updateProfileMutation.mutate()} disabled={updateProfileMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {updateProfileMutation.isPending ? t("accountSettingsPage.actions.saving") : t("accountSettingsPage.actions.saveChanges")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="glass">
            <CardHeader>
              <CardTitle>{t("accountSettingsPage.security.title")}</CardTitle>
              <CardDescription>{t("accountSettingsPage.security.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t("accountSettingsPage.security.currentPassword")}</Label>
                <div className="relative">
                  <Input type={showCurrentPassword ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="pr-10" />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShowCurrentPassword((v) => !v)}>
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("accountSettingsPage.security.newPassword")}</Label>
                <div className="relative">
                  <Input type={showNewPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="pr-10" />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShowNewPassword((v) => !v)}>
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {newPassword && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className={cn("h-full transition-all", passwordStrength.score <= 1 && "w-1/5 bg-red-500", passwordStrength.score === 2 && "w-2/5 bg-orange-500", passwordStrength.score === 3 && "w-3/5 bg-yellow-500", passwordStrength.score === 4 && "w-4/5 bg-green-500", passwordStrength.score === 5 && "w-full bg-green-600")} />
                    </div>
                    <span className="text-xs font-medium">{passwordStrength.label}</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>{t("accountSettingsPage.security.confirmPassword")}</Label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-destructive flex items-center gap-1"><X className="h-3 w-3" />{t("accountSettingsPage.security.passwordsNotMatch")}</p>
                )}
                {confirmPassword && newPassword === confirmPassword && (
                  <p className="text-xs text-green-500 flex items-center gap-1"><Check className="h-3 w-3" />{t("accountSettingsPage.security.passwordsMatch")}</p>
                )}
              </div>
              {newPassword && newPassword.length < 8 && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <X className="h-3 w-3" />
                  {t("accountSettingsPage.security.minLength", {
                    defaultValue: "Password must be at least 8 characters",
                  })}
                </p>
              )}
              {newPassword && currentPassword && newPassword === currentPassword && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <X className="h-3 w-3" />
                  {t("accountSettingsPage.security.sameAsCurrent", {
                    defaultValue: "New password must differ from the current one",
                  })}
                </p>
              )}
              <Button
                onClick={() => changePasswordMutation.mutate()}
                disabled={
                  !currentPassword ||
                  !newPassword ||
                  newPassword.length < 8 ||
                  newPassword === currentPassword ||
                  newPassword !== confirmPassword ||
                  changePasswordMutation.isPending
                }
              >
                {changePasswordMutation.isPending
                  ? t("accountSettingsPage.actions.updating")
                  : t("accountSettingsPage.actions.updatePassword")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions">
          <Card className="glass">
            <CardHeader>
              <CardTitle>{t("accountSettingsPage.sessions.title")}</CardTitle>
              <CardDescription>{t("accountSettingsPage.sessions.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {sessionsQuery.isLoading && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
              {(sessionsQuery.data || []).length === 0 && !sessionsQuery.isLoading && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t("accountSettingsPage.sessions.empty", {
                    defaultValue: "No active sessions",
                  })}
                </p>
              )}
              {(sessionsQuery.data || []).map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/30 gap-3"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="p-2 rounded-lg bg-background flex-shrink-0">
                      <Smartphone className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">{session.device}</p>
                        {session.current && (
                          <Badge variant="secondary" className="text-xs">
                            {t("accountSettingsPage.sessions.current")}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {session.ip}
                        {session.location && session.location !== "Unknown location"
                          ? ` · ${session.location}`
                          : ""}
                        {session.last_active
                          ? ` · ${formatRelative(session.last_active, i18n.language)}`
                          : ""}
                      </p>
                    </div>
                  </div>
                  {!session.current && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive flex-shrink-0"
                      onClick={() => revokeSessionMutation.mutate(session.id)}
                      disabled={revokeSessionMutation.isPending}
                      aria-label={t("accountSettingsPage.actions.signOutSession", {
                        defaultValue: "Sign out this session",
                      })}
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" className="w-full" onClick={() => revokeOthersMutation.mutate()} disabled={revokeOthersMutation.isPending}>
                {revokeOthersMutation.isPending ? t("accountSettingsPage.actions.signingOut") : t("accountSettingsPage.sessions.signOutOthers")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="danger">
          <Card className="glass border-destructive/20">
            <CardHeader>
              <CardTitle className="text-destructive">{t("accountSettingsPage.danger.title")}</CardTitle>
              <CardDescription>{t("accountSettingsPage.danger.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Label>{t("accountSettingsPage.danger.enterPassword")}</Label>
              <Input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={!deletePassword || deleteAccountMutation.isPending}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t("accountSettingsPage.danger.deleteButton")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("accountSettingsPage.danger.dialogTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("accountSettingsPage.danger.dialogDescription")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={(e) => {
                        e.preventDefault();
                        deleteAccountMutation.mutate();
                      }}
                    >
                      {t("accountSettingsPage.danger.confirmDelete")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}









