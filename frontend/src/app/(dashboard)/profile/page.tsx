"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  User,
  Mail,
  Calendar,
  Edit,
  Settings,
  Activity,
  BarChart3,
  MessageSquareText,
  TrendingUp,
  FileText,
  Loader2,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser, useTranslation } from "@/hooks";

const recentActivityConfig = [
  {
    id: "1",
    type: "project_created",
    titleKey: "profile.activity.projectCreated.title",
    descriptionKey: "profile.activity.projectCreated.description",
    time: "2 hours ago",
    timeKey: "profile.activity.time.hoursAgo",
    timeValue: 2,
    icon: FileText,
  },
  {
    id: "2",
    type: "report_generated",
    titleKey: "profile.activity.reportGenerated.title",
    descriptionKey: "profile.activity.reportGenerated.description",
    time: "5 hours ago",
    timeKey: "profile.activity.time.hoursAgo",
    timeValue: 5,
    icon: FileText,
  },
  {
    id: "3",
    type: "mention_analyzed",
    titleKey: "profile.activity.mentionsAnalyzed.title",
    descriptionKey: "profile.activity.mentionsAnalyzed.description",
    time: "1 day ago",
    timeKey: "profile.activity.time.daysAgo",
    timeValue: 1,
    icon: MessageSquareText,
  },
  {
    id: "4",
    type: "alert_triggered",
    titleKey: "profile.activity.alertTriggered.title",
    descriptionKey: "profile.activity.alertTriggered.description",
    time: "2 days ago",
    timeKey: "profile.activity.time.daysAgo",
    timeValue: 2,
    icon: TrendingUp,
  },
];

const userStatsConfig = [
  { labelKey: "profile.stats.projects", value: "—", icon: Briefcase },
  { labelKey: "profile.stats.reportsGenerated", value: "—", icon: FileText },
  { labelKey: "profile.stats.mentionsAnalyzed", value: "—", icon: MessageSquareText },
  { labelKey: "profile.stats.insightsCreated", value: "—", icon: TrendingUp },
];

export default function ProfilePage() {
  const { data: user, isLoading } = useUser();
  const { t } = useTranslation();

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="glass overflow-hidden">
          {/* Cover gradient */}
          <div className="h-32 bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20" />
          
          <CardContent className="relative pt-0 pb-6">
            {/* Avatar */}
            <div className="absolute -top-16 left-6">
              <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
                <AvatarImage src={user.avatar || undefined} />
                <AvatarFallback className="text-3xl font-bold bg-primary/10">
                  {user.name.split(" ").map((n) => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
            </div>
            
            {/* Actions */}
            <div className="flex justify-end gap-2 mb-8">
              <Button variant="outline" size="sm" asChild>
                <Link href="/profile/settings">
                  <Settings className="h-4 w-4 mr-2" />
                  {t("profile.settings", { defaultValue: "Settings" })}
                </Link>
              </Button>
              <Button size="sm" className="glow-sm" asChild>
                <Link href="/profile/settings">
                  <Edit className="h-4 w-4 mr-2" />
                  {t("profile.editProfile", { defaultValue: "Edit Profile" })}
                </Link>
              </Button>
            </div>
            
            {/* User Info */}
            <div className="mt-4 space-y-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="font-display text-2xl font-bold">{user.name}</h1>
                  <Badge variant="secondary" className="font-medium capitalize">
                    {user.role}
                  </Badge>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Mail className="h-4 w-4" />
                  {user.email}
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
        {userStatsConfig.map((stat, index) => (
          <motion.div
            key={stat.labelKey}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="glass">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <stat.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{t(stat.labelKey)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
      
      <div className="grid gap-6">
        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium">
                  {t("profile.recentActivity", { defaultValue: "Recent Activity" })}
                </CardTitle>
                <Button variant="ghost" size="sm">
                  {t("profile.viewAll", { defaultValue: "View All" })}
                </Button>
              </div>
              <CardDescription>
                {t("profile.recentActivityDescription", {
                  defaultValue: "Your latest actions and events",
                })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivityConfig.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                      <activity.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{t(activity.titleKey)}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {t(activity.descriptionKey)}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {t(activity.timeKey, {
                        count: activity.timeValue,
                        defaultValue: activity.time,
                      })}
                    </span>
                  </motion.div>
                ))}
              </div>
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
                  <span>{t("profile.quickActions.dashboard", { defaultValue: "Go to Dashboard" })}</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                <Link href="/profile/settings">
                  <Settings className="h-5 w-5" />
                  <span>{t("profile.quickActions.accountSettings", { defaultValue: "Account Settings" })}</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                <Activity className="h-5 w-5" />
                <span>{t("profile.quickActions.activityLog", { defaultValue: "Activity Log" })}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

