"use client";

import { motion } from "framer-motion";
import { Bell, Check, Clock, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks";
import {
  NOTIFICATION_COLORS,
  NOTIFICATION_ICONS,
  type Notification,
} from "./utils";

interface NotificationsPanelProps {
  filteredNotifications: Notification[];
  unreadCount: number;
  activeTab: string;
  setActiveTab: (v: string) => void;
  onMarkAllRead: () => void;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

export function NotificationsPanel({
  filteredNotifications,
  unreadCount,
  activeTab,
  setActiveTab,
  onMarkAllRead,
  onMarkAsRead,
  onDelete,
}: NotificationsPanelProps) {
  const { t } = useTranslation();

  return (
    <SheetContent className="w-full sm:max-w-lg p-0">
      <SheetHeader className="p-6 pb-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <SheetTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              {t("header.notifications")}
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {unreadCount} {t("common.new", { defaultValue: "new" })}
                </Badge>
              )}
            </SheetTitle>
            <SheetDescription>
              {t("header.stayUpdated", {
                defaultValue: "Stay updated with your media monitoring alerts",
              })}
            </SheetDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onMarkAllRead}
            disabled={unreadCount === 0}
          >
            <Check className="h-4 w-4 mr-2" />
            {t("header.markAllRead")}
          </Button>
        </div>
      </SheetHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="px-6 py-3 border-b border-border">
          <TabsList className="w-full grid grid-cols-5 h-9">
            <TabsTrigger value="all" className="text-xs">
              {t("header.all")}
            </TabsTrigger>
            <TabsTrigger value="unread" className="text-xs">
              {t("header.unread")}
              {unreadCount > 0 && <span className="ml-1">({unreadCount})</span>}
            </TabsTrigger>
            <TabsTrigger value="alert" className="text-xs">
              {t("header.alerts")}
            </TabsTrigger>
            <TabsTrigger value="mention" className="text-xs">
              {t("header.mentions")}
            </TabsTrigger>
            <TabsTrigger value="report" className="text-xs">
              {t("header.reports")}
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="h-[calc(100vh-220px)]">
          <div className="p-4 space-y-2">
            {filteredNotifications.length === 0 ? (
              <EmptyNotificationsState activeTab={activeTab} />
            ) : (
              filteredNotifications.map((notification, index) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  index={index}
                  onMarkAsRead={onMarkAsRead}
                  onDelete={onDelete}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </Tabs>
    </SheetContent>
  );
}

function EmptyNotificationsState({ activeTab }: { activeTab: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Bell className="h-12 w-12 text-muted-foreground/30 mb-4" />
      <p className="text-muted-foreground">{t("header.noNotifications")}</p>
      <p className="text-sm text-muted-foreground/70">
        {activeTab === "unread"
          ? t("header.allCaughtUp")
          : t("header.nothingToShow")}
      </p>
    </div>
  );
}

function NotificationRow({
  notification,
  index,
  onMarkAsRead,
  onDelete,
}: {
  notification: Notification;
  index: number;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const Icon = NOTIFICATION_ICONS[notification.type];
  return (
    <motion.div
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
      <div
        className={cn(
          "p-2 rounded-lg shrink-0",
          NOTIFICATION_COLORS[notification.type]
        )}
      >
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
            <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
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

      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
        {notification.unread && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onMarkAsRead(notification.id)}
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(notification.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}
