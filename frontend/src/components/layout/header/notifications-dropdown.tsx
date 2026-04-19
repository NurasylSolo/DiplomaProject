"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks";
import {
  NOTIFICATION_COLORS,
  NOTIFICATION_ICONS,
  type Notification,
} from "./utils";

interface NotificationsDropdownProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkAllRead: () => void;
  onMarkAsRead: (id: string) => void;
}

/**
 * Compact dropdown for the bell button — shows the 3 most recent
 * notifications and a "View all" item that opens the full sheet panel.
 */
export function NotificationsDropdown({
  notifications,
  unreadCount,
  onMarkAllRead,
  onMarkAsRead,
}: NotificationsDropdownProps) {
  const { t } = useTranslation();

  return (
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
          <Button
            variant="ghost"
            size="sm"
            className="h-auto py-1 px-2 text-xs"
            onClick={onMarkAllRead}
          >
            {t("header.markAllRead")}
          </Button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.slice(0, 3).map((notification) => {
          const Icon = NOTIFICATION_ICONS[notification.type];
          return (
            <DropdownMenuItem
              key={notification.id}
              className="flex items-start gap-3 py-3"
              onClick={() => onMarkAsRead(notification.id)}
            >
              <div
                className={cn(
                  "p-1.5 rounded-lg",
                  NOTIFICATION_COLORS[notification.type]
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {notification.unread && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                  <span
                    className={cn(
                      "text-sm truncate",
                      notification.unread && "font-medium"
                    )}
                  >
                    {notification.title}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {notification.time}
                </span>
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
  );
}
