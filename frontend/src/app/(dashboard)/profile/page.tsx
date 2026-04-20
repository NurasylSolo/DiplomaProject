"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Briefcase,
  Calendar,
  Copy,
  FileText,
  Loader2,
  LogOut,
  Mail,
  MessageSquareText,
  Settings,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { enUS, ru } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useLogout,
  useTranslation,
  useUser,
  useUserActivity,
  useUserStats,
} from "@/hooks";
import { fmtCompact } from "@/features/_shared";
import { AvatarUploader } from "@/features/profile";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/api";
import type { UserActivityItem } from "@/lib/api/services/auth";

const ACTIVITY_ICON_MAP = {
  project: Briefcase,
  report: FileText,
  analyze: MessageSquareText,
  alert: AlertTriangle,
  running: Loader2,
} as const;

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
  if (lang.startsWith("kz") || lang.startsWith("kk")) return ru; // closest available
  return enUS;
}

export default function ProfilePage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { data: user, isLoading: isUserLoading } = useUser();
  const { data: stats, isLoading: isStatsLoading } = useUserStats();
  const { data: activity, isLoading: isActivityLoading } = useUserActivity(10);
  const logoutMutation = useLogout();

  const activitySectionRef = useRef<HTMLDivElement | null>(null);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleCopyEmail = async () => {
    if (!user?.email) return;
    try {
      await navigator.clipboard.writeText(user.email);
      toast.success(
        t("profile.toasts.emailCopied", { defaultValue: "Email copied" })
      );
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleScrollToActivity = () => {
    activitySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSignOut = () => {
    logoutMutation.mutate();
  };

  if (isUserLoading || !user) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const userInitials = pickInitials(user.name, user.email);

  // ---- Stats grid (live data, fallback to skeleton)
  const statsGrid = [
    {
      labelKey: "profile.stats.projects",
      value: stats?.projects,
      icon: Briefcase,
      tone: "from-cyan-500/15 to-cyan-500/5",
      iconColor: "text-cyan-500",
    },
    {
      labelKey: "profile.stats.reportsGenerated",
      value: stats?.reports_generated,
      icon: FileText,
      tone: "from-violet-500/15 to-violet-500/5",
      iconColor: "text-violet-500",
    },
    {
      labelKey: "profile.stats.mentionsAnalyzed",
      value: stats?.mentions_analyzed,
      icon: MessageSquareText,
      tone: "from-emerald-500/15 to-emerald-500/5",
      iconColor: "text-emerald-500",
    },
    {
      labelKey: "profile.stats.insightsCreated",
      value: stats?.insights_created,
      icon: TrendingUp,
      tone: "from-amber-500/15 to-amber-500/5",
      iconColor: "text-amber-500",
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Profile Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="glass overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20" />

          <CardContent className="relative pt-0 pb-6">
            {/* Avatar — overlap into the cover gradient */}
            <div className="absolute -top-16 left-6">
              <AvatarUploader
                currentAvatar={user.avatar}
                userInitials={userInitials}
                size="lg"
                // Hide the side text panel here — we already show the
                // user's name & email in the header below.
                className="[&>div:last-child]:hidden"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 mb-8 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                disabled={logoutMutation.isPending}
              >
                <LogOut className="h-4 w-4 mr-2" />
                {t("profile.signOut", { defaultValue: "Sign out" })}
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/profile/settings">
                  <Settings className="h-4 w-4 mr-2" />
                  {t("profile.settings", { defaultValue: "Settings" })}
                </Link>
              </Button>
            </div>

            {/* User info */}
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="font-display text-2xl font-bold">{user.name}</h1>
                <Badge variant="secondary" className="font-medium capitalize">
                  {user.role}
                </Badge>
                {user.emailVerified === false && (
                  <Badge
                    variant="outline"
                    className="border-amber-500/40 text-amber-600 dark:text-amber-400"
                  >
                    {t("profile.unverified", { defaultValue: "Unverified" })}
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Mail className="h-4 w-4" />
                  <span>{user.email}</span>
                  <button
                    type="button"
                    onClick={handleCopyEmail}
                    className="ml-1 p-1 rounded hover:bg-muted transition-colors"
                    aria-label={t("profile.copyEmail", { defaultValue: "Copy email" })}
                    title={t("profile.copyEmail", { defaultValue: "Copy email" })}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {t("profile.joined", {
                    date: formatDate(user.createdAt),
                    defaultValue: "Joined {{date}}",
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsGrid.map((stat, index) => (
          <motion.div
            key={stat.labelKey}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
          >
            <Card className={cn("glass overflow-hidden bg-gradient-to-br", stat.tone)}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-background/60 backdrop-blur">
                    <stat.icon className={cn("h-5 w-5", stat.iconColor)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    {isStatsLoading ? (
                      <Skeleton className="h-7 w-16" />
                    ) : (
                      <p className="text-2xl font-bold tabular-nums">
                        {fmtCompact(stat.value ?? 0)}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground truncate">
                      {t(stat.labelKey)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Recent Activity */}
      <div ref={activitySectionRef} id="recent-activity" className="grid gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  {t("profile.recentActivity", { defaultValue: "Recent Activity" })}
                </CardTitle>
              </div>
              <CardDescription>
                {t("profile.recentActivityDescription", {
                  defaultValue: "Your latest projects, reports and ingestion runs",
                })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isActivityLoading ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : (activity ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {t("profile.activity.empty", {
                    defaultValue: "No recent activity yet",
                  })}
                </p>
              ) : (
                <div className="space-y-2">
                  {(activity ?? []).map((item, index) => (
                    <ActivityRow
                      key={item.id}
                      item={item}
                      index={index}
                      onOpen={() => router.push(item.link)}
                      lang={i18n.language}
                      t={t}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base font-medium">
              {t("profile.quickActions.title", { defaultValue: "Quick Actions" })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-4">
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                <Link href="/dashboard">
                  <BarChart3 className="h-5 w-5" />
                  <span>
                    {t("profile.quickActions.dashboard", { defaultValue: "Go to Dashboard" })}
                  </span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                <Link href="/profile/settings">
                  <Settings className="h-5 w-5" />
                  <span>
                    {t("profile.quickActions.accountSettings", {
                      defaultValue: "Account Settings",
                    })}
                  </span>
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-auto py-4 flex-col gap-2"
                onClick={handleScrollToActivity}
              >
                <Activity className="h-5 w-5" />
                <span>
                  {t("profile.quickActions.activityLog", {
                    defaultValue: "Activity Log",
                  })}
                </span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

interface ActivityRowProps {
  item: UserActivityItem;
  index: number;
  lang: string;
  onOpen: () => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}

function ActivityRow({ item, index, lang, onOpen, t }: ActivityRowProps) {
  const Icon = ACTIVITY_ICON_MAP[item.icon_hint as keyof typeof ACTIVITY_ICON_MAP] || FileText;
  const isAlert = item.icon_hint === "alert";
  const isRunning = item.icon_hint === "running";

  // Localised relative time, falls back gracefully if the timestamp is bad.
  let relative = "";
  try {
    if (item.timestamp) {
      relative = formatDistanceToNow(new Date(item.timestamp), {
        addSuffix: true,
        locale: dateFnsLocale(lang),
      });
    }
  } catch {
    relative = item.timestamp;
  }

  const titleParams = item.title_params || {};
  const title = t(item.title_key, {
    ...titleParams,
    defaultValue: titleParams.name || titleParams.type || item.description || item.type,
  });

  return (
    <motion.button
      type="button"
      onClick={onOpen}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.05 * index }}
      className="w-full flex items-start gap-4 p-3 rounded-lg hover:bg-muted/40 transition-colors text-left group"
    >
      <div
        className={cn(
          "p-2 rounded-lg flex-shrink-0",
          isAlert
            ? "bg-destructive/10 text-destructive"
            : isRunning
              ? "bg-amber-500/10 text-amber-500"
              : "bg-primary/10 text-primary"
        )}
      >
        <Icon className={cn("h-4 w-4", isRunning && "animate-spin")} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm group-hover:text-primary transition-colors">
          {title}
        </p>
        {item.description && (
          <p className="text-xs text-muted-foreground truncate">
            {item.description}
          </p>
        )}
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap pt-1">
        {relative}
      </span>
    </motion.button>
  );
}
