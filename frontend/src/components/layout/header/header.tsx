"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/api";
import { useAuthStore, useSidebarStore } from "@/stores";
import {
  useAlertEvents,
  useDeletePreviousProjects,
  useDeleteProject,
  useLogout,
  useMarkAlertRead,
  useProjects,
  useRefreshProject,
  useTranslation,
} from "@/hooks";
import { HeaderSearch } from "./header-search";
import { LanguageSwitch } from "./language-switch";
import { NotificationsDropdown } from "./notifications-dropdown";
import { NotificationsPanel } from "./notifications-panel";
import { ProjectSelector } from "./project-selector";
import { QuickActions } from "./quick-actions";
import { UserMenu } from "./user-menu";
import {
  formatRelativeTime,
  HEADER_PROJECT_COLORS,
  notificationTypeFromAlertType,
  type Notification,
} from "./utils";

interface HeaderProps {
  projectId: string;
}

export function Header({ projectId }: HeaderProps) {
  const router = useRouter();
  const { isCollapsed, toggleMobileOpen } = useSidebarStore();
  const { t } = useTranslation();
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

  // Memoize derived data so the header doesn't re-build the same arrays on
  // every parent rerender (and doesn't reformat dates 5x per second when an
  // alert poll lands).
  const projects = useMemo(
    () =>
      (projectsList || []).map((p, i) => ({
        id: p.id,
        name: p.name,
        color: p.accentColor || HEADER_PROJECT_COLORS[i % HEADER_PROJECT_COLORS.length],
      })),
    [projectsList]
  );

  const currentProject = useMemo(
    () =>
      projects.find((p) => p.id === projectId) ||
      projects[0] || { id: "1", name: "Project", color: "#3B82F6" },
    [projects, projectId]
  );

  const notifications: Notification[] = useMemo(
    () =>
      (alertsQuery.data || []).map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description || "",
        time: formatRelativeTime(item.created_at),
        unread: item.unread,
        type: notificationTypeFromAlertType(item.type),
      })),
    [alertsQuery.data]
  );

  const unreadCount = useMemo(
    () => notifications.filter((n) => n.unread).length,
    [notifications]
  );

  const userInitials = useMemo(
    () =>
      user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "U",
    [user?.name]
  );

  const filteredNotifications = useMemo(() => {
    if (activeTab === "all") return notifications;
    if (activeTab === "unread") return notifications.filter((n) => n.unread);
    return notifications.filter((n) => n.type === activeTab);
  }, [notifications, activeTab]);

  const markAllRead = () => {
    notifications
      .filter((n) => n.unread)
      .forEach((n) => markReadMutation.mutate(n.id));
  };
  const markAsRead = (id: string) => markReadMutation.mutate(id);
  // Backend doesn't have a separate delete endpoint — clearing a notification
  // simply marks it read so it falls out of the unread filter.
  const deleteNotification = (id: string) => markReadMutation.mutate(id);

  const handleRefreshProject = () => {
    if (!currentProject?.id) return;
    refreshProjectMutation.mutate(currentProject.id, {
      onSuccess: () =>
        toast.success(
          t("header.projectRefreshing", {
            defaultValue: "Refreshing project data...",
          })
        ),
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
          t("header.projectDeleted", { defaultValue: "Project deleted" })
        );
        router.push(next ? `/projects/${next.id}/mentions` : "/projects/new");
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
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={toggleMobileOpen}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <ProjectSelector
            projects={projects}
            currentProject={currentProject}
            isRefreshPending={refreshProjectMutation.isPending}
            isDeletePending={deleteProjectMutation.isPending}
            onRefresh={handleRefreshProject}
            onDelete={handleDeleteCurrentProject}
          />

          <HeaderSearch />
        </div>

        <div className="flex items-center gap-2">
          <QuickActions
            onDeletePreviousProjects={handleDeletePreviousProjects}
            isDeletePreviousPending={deletePreviousProjectsMutation.isPending}
            projectsCount={projects.length}
          />

          <Sheet open={notificationsOpen} onOpenChange={setNotificationsOpen}>
            <NotificationsDropdown
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkAllRead={markAllRead}
              onMarkAsRead={markAsRead}
            />
            <NotificationsPanel
              filteredNotifications={filteredNotifications}
              unreadCount={unreadCount}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onMarkAllRead={markAllRead}
              onMarkAsRead={markAsRead}
              onDelete={deleteNotification}
            />
          </Sheet>

          <LanguageSwitch />
          <ThemeToggle />
          <UserMenu
            user={user}
            userInitials={userInitials}
            onLogout={() => logoutMutation.mutate()}
          />
        </div>
      </div>
    </header>
  );
}
