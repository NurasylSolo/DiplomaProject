"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  Search, 
  Bell, 
  Plus, 
  ChevronDown,
  FileText,
  FileSpreadsheet,
  Mail,
  LogOut,
  Settings,
  User,
  Menu,
  Check,
  Trash2,
  AlertTriangle,
  MessageSquare,
  Users,
  Clock,
  Globe,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/api";
import { useSidebarStore, useAuthStore } from "@/stores";
import {
  useTranslation,
  useProjects,
  useLogout,
  useAlertEvents,
  useMarkAlertRead,
  useDeleteProject,
  useDeletePreviousProjects,
  useRefreshProject,
} from "@/hooks";
import { toast } from "sonner";
import { supportedLanguages } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface HeaderProps {
  projectId: string;
}

const PROJECT_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444", "#06B6D4"];

interface Notification {
  id: string;
  title: string;
  description: string;
  time: string;
  unread: boolean;
  type: "alert" | "report" | "mention" | "influencer" | "system";
  project?: string;
}

const notificationIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  alert: AlertTriangle,
  report: FileText,
  mention: MessageSquare,
  influencer: Users,
  system: Settings,
};

const notificationColors: Record<string, string> = {
  alert: "text-amber-500 bg-amber-500/10",
  report: "text-blue-500 bg-blue-500/10",
  mention: "text-green-500 bg-green-500/10",
  influencer: "text-purple-500 bg-purple-500/10",
  system: "text-gray-500 bg-gray-500/10",
};

export function Header({ projectId }: HeaderProps) {
  const router = useRouter();
  const { isCollapsed, toggleMobileOpen } = useSidebarStore();
  const { t, changeLanguage, currentLanguage } = useTranslation();
  const [searchFocused, setSearchFocused] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  
  const { user } = useAuthStore();
  const { data: projectsList } = useProjects();
  const alertsQuery = useAlertEvents(projectId, 100);
  const markReadMutation = useMarkAlertRead(projectId);
  const logoutMutation = useLogout();
  const deleteProjectMutation = useDeleteProject();
  const deletePreviousProjectsMutation = useDeletePreviousProjects();
  const refreshProjectMutation = useRefreshProject();
  
  const projects = (projectsList || []).map((p, i) => ({
    id: p.id,
    name: p.name,
    color: p.accentColor || PROJECT_COLORS[i % PROJECT_COLORS.length],
  }));
  
  const currentProject = projects.find(p => p.id === projectId) || projects[0] || { id: "1", name: "Project", color: "#3B82F6" };
  const notifications: Notification[] = (alertsQuery.data || []).map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description || "",
    time: formatRelativeTime(item.created_at),
    unread: item.unread,
    type:
      item.type === "negative_spike" || item.type === "mention_spike"
        ? "alert"
        : item.type.includes("report")
          ? "report"
          : "system",
  }));
  const unreadCount = notifications.filter((n) => n.unread).length;
  
  const userInitials = user?.name?.split(" ").map(n => n[0]).join("").toUpperCase() || "U";
  
  const markAllRead = () => {
    notifications
      .filter((n) => n.unread)
      .forEach((n) => markReadMutation.mutate(n.id));
  };
  
  const markAsRead = (id: string) => {
    markReadMutation.mutate(id);
  };
  
  const deleteNotification = (id: string) => {
    markReadMutation.mutate(id);
  };

  const handleRefreshProject = () => {
    if (!currentProject?.id) return;
    refreshProjectMutation.mutate(currentProject.id, {
      onSuccess: () => {
        toast.success(
          t("header.projectRefreshing", {
            defaultValue: "Refreshing project data...",
          })
        );
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  };

  const handleDeleteCurrentProject = () => {
    const ok = window.confirm(
      t("header.confirmDeleteCurrentProject", {
        defaultValue: "Delete current project?",
      })
    );
    if (!ok) return;
    deleteProjectMutation.mutate(currentProject.id, {
      onSuccess: () => {
        const next = projects.find((p) => p.id !== currentProject.id);
        toast.success(
          t("header.projectDeleted", {
            defaultValue: "Project deleted",
          })
        );
        if (next) {
          router.push(`/projects/${next.id}/mentions`);
          return;
        }
        router.push("/projects/new");
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  };

  const handleDeletePreviousProjects = () => {
    const ok = window.confirm(
      t("header.confirmDeletePreviousProjects", {
        defaultValue: "Delete all previous projects and keep only current one?",
      })
    );
    if (!ok) return;
    deletePreviousProjectsMutation.mutate(currentProject.id, {
      onSuccess: () =>
        toast.success(
          t("header.previousProjectsDeleted", {
            defaultValue: "Previous projects deleted",
          })
        ),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  };
  
  const filteredNotifications = activeTab === "all" 
    ? notifications 
    : activeTab === "unread" 
      ? notifications.filter(n => n.unread)
      : notifications.filter(n => n.type === activeTab);
  
  return (
    <header 
      className={cn(
        "fixed top-0 right-0 z-30 h-16",
        "bg-background/80 backdrop-blur-xl border-b border-border/50",
        "transition-all duration-300",
        isCollapsed ? "left-[72px]" : "left-[260px]"
      )}
    >
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        {/* Left side */}
        <div className="flex items-center gap-4">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={toggleMobileOpen}
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          {/* Project Selector */}
          <Select 
            value={currentProject.id} 
            onValueChange={(value) => router.push(`/projects/${value}/mentions`)}
          >
            <SelectTrigger className="w-[200px] h-9 border-0 bg-muted/50 hover:bg-muted">
              <div className="flex items-center gap-2">
                <div 
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: currentProject.color }}
                />
                <SelectValue>{currentProject.name}</SelectValue>
              </div>
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                    {project.name}
                  </div>
                </SelectItem>
              ))}
              <DropdownMenuSeparator />
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-start"
                onClick={() => router.push("/projects/new")}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("header.newProject")}
              </Button>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            title={t("header.refreshProject", { defaultValue: "Refresh project data" })}
            onClick={handleRefreshProject}
            disabled={refreshProjectMutation.isPending || projects.length === 0}
          >
            <RefreshCw
              className={cn(
                "h-4 w-4",
                refreshProjectMutation.isPending && "animate-spin"
              )}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title={t("header.deleteCurrentProject", { defaultValue: "Delete current project" })}
            onClick={handleDeleteCurrentProject}
            disabled={deleteProjectMutation.isPending || projects.length === 0}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
          
          {/* Search */}
          <div className="hidden sm:block relative">
            <motion.div
              animate={{ width: searchFocused ? 320 : 240 }}
              className="relative"
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("header.search")}
                className="pl-9 h-9 bg-muted/50 border-0 focus-visible:ring-1"
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                ⌘K
              </kbd>
            </motion.div>
          </div>
        </div>
        
        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Quick Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">{t("header.quickActions")}</span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>
                <FileText className="h-4 w-4 mr-2" />
                {t("header.generatePDF")}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                {t("header.exportExcel")}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Mail className="h-4 w-4 mr-2" />
                {t("header.scheduleReport")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={handleDeletePreviousProjects}
                disabled={deletePreviousProjectsMutation.isPending || projects.length <= 1}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t("header.deleteOldProjects", { defaultValue: "Delete old projects" })}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Notifications with Sheet */}
          <Sheet open={notificationsOpen} onOpenChange={setNotificationsOpen}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                  {t("header.notifications")}
                  <Button variant="ghost" size="sm" className="h-auto py-1 px-2 text-xs" onClick={markAllRead}>
                    {t("header.markAllRead")}
                  </Button>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.slice(0, 3).map((notification) => {
                  const Icon = notificationIcons[notification.type];
                  return (
                    <DropdownMenuItem key={notification.id} className="flex items-start gap-3 py-3" onClick={() => markAsRead(notification.id)}>
                      <div className={cn("p-1.5 rounded-lg", notificationColors[notification.type])}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {notification.unread && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                          <span className={cn("text-sm truncate", notification.unread && "font-medium")}>
                            {notification.title}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">{notification.time}</span>
                      </div>
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator />
                <SheetTrigger asChild>
                  <DropdownMenuItem className="justify-center cursor-pointer">
                    <span className="text-primary text-sm">{t("header.viewAll")}</span>
                  </DropdownMenuItem>
                </SheetTrigger>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Full Notifications Panel */}
            <SheetContent className="w-full sm:max-w-lg p-0">
              <SheetHeader className="p-6 pb-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <SheetTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      {t("header.notifications")}
                      {unreadCount > 0 && (
                        <Badge variant="secondary" className="ml-2">{unreadCount} {t("common.new", { defaultValue: "new" })}</Badge>
                      )}
                    </SheetTitle>
                    <SheetDescription>
                      {t("header.stayUpdated", { defaultValue: "Stay updated with your media monitoring alerts" })}
                    </SheetDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={markAllRead} disabled={unreadCount === 0}>
                    <Check className="h-4 w-4 mr-2" />
                    {t("header.markAllRead")}
                  </Button>
                </div>
              </SheetHeader>
              
              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="px-6 py-3 border-b border-border">
                  <TabsList className="w-full grid grid-cols-5 h-9">
                    <TabsTrigger value="all" className="text-xs">{t("header.all")}</TabsTrigger>
                    <TabsTrigger value="unread" className="text-xs">
                      {t("header.unread")}
                      {unreadCount > 0 && <span className="ml-1">({unreadCount})</span>}
                    </TabsTrigger>
                    <TabsTrigger value="alert" className="text-xs">{t("header.alerts")}</TabsTrigger>
                    <TabsTrigger value="mention" className="text-xs">{t("header.mentions")}</TabsTrigger>
                    <TabsTrigger value="report" className="text-xs">{t("header.reports")}</TabsTrigger>
                  </TabsList>
                </div>
                
                <ScrollArea className="h-[calc(100vh-220px)]">
                  <div className="p-4 space-y-2">
                    {filteredNotifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Bell className="h-12 w-12 text-muted-foreground/30 mb-4" />
                        <p className="text-muted-foreground">{t("header.noNotifications")}</p>
                        <p className="text-sm text-muted-foreground/70">
                          {activeTab === "unread" ? t("header.allCaughtUp") : t("header.nothingToShow")}
                        </p>
                      </div>
                    ) : (
                      filteredNotifications.map((notification, index) => {
                        const Icon = notificationIcons[notification.type];
                        return (
                          <motion.div
                            key={notification.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className={cn(
                              "group relative flex items-start gap-3 p-4 rounded-xl transition-colors",
                              notification.unread 
                                ? "bg-primary/5 hover:bg-primary/10" 
                                : "hover:bg-muted/50"
                            )}
                          >
                            <div className={cn("p-2 rounded-lg shrink-0", notificationColors[notification.type])}>
                              <Icon className="h-4 w-4" />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className={cn("text-sm", notification.unread && "font-medium")}>
                                    {notification.title}
                                  </p>
                                  <p className="text-sm text-muted-foreground mt-0.5">
                                    {notification.description}
                                  </p>
                                </div>
                                
                                {notification.unread && (
                                  <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                                )}
                              </div>
                              
                              <div className="flex items-center gap-3 mt-2">
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {notification.time}
                                </span>
                                {notification.project && (
                                  <Badge variant="outline" className="text-[10px] h-5">
                                    {notification.project}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            {/* Actions */}
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                              {notification.unread && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => markAsRead(notification.id)}
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => deleteNotification(notification.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </Tabs>
            </SheetContent>
          </Sheet>
          
          {/* Language Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Globe className="h-5 w-5" />
                <span className="sr-only">{t("header.language")}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>{t("header.language")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {supportedLanguages.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  className={cn(
                    "flex items-center gap-2",
                    currentLanguage === lang.code && "bg-accent"
                  )}
                >
                  <span className="text-lg">{lang.flag}</span>
                  <span>{lang.name}</span>
                  {currentLanguage === lang.code && (
                    <Check className="h-4 w-4 ml-auto" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme Toggle */}
          <ThemeToggle />
          
          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 pl-2">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={user?.avatar || ""} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:flex flex-col items-start">
                  <span className="text-sm font-medium">{user?.name || "User"}</span>
                </div>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{user?.name || "User"}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {user?.email || ""}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <User className="h-4 w-4 mr-2" />
                  {t("header.profile")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/profile/settings">
                  <Settings className="h-4 w-4 mr-2" />
                  {t("header.settings")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => logoutMutation.mutate()}>
                <LogOut className="h-4 w-4 mr-2" />
                {t("header.logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

function formatRelativeTime(value: string): string {
  const date = new Date(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
