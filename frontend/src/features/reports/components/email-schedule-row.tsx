"use client";

import { MoreHorizontal, Send, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";

export interface EmailScheduleRowData {
  id: string;
  recipients: string[];
  frequency: string;
  send_time: string;
  timezone: string;
  active: boolean;
  config?: { sections?: string[] };
  last_sent_at?: string | null;
}

interface EmailScheduleRowProps {
  schedule: EmailScheduleRowData;
  onToggleActive: (id: string, active: boolean) => void;
  onSendNow: (id: string) => void;
  onDelete: (id: string) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}

export function EmailScheduleRow({
  schedule,
  onToggleActive,
  onSendNow,
  onDelete,
  t,
}: EmailScheduleRowProps) {
  return (
    <div className="p-4 hover:bg-muted/30 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold capitalize">
              {t(`reportsPage.email.dialog.frequencies.${schedule.frequency}`, {
                defaultValue: schedule.frequency,
              })}
            </h3>
            <Badge
              variant={schedule.active ? "default" : "secondary"}
              className="text-xs"
            >
              {schedule.active
                ? t("reportsPage.email.row.active", { defaultValue: "Active" })
                : t("reportsPage.email.row.paused", { defaultValue: "Paused" })}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span>
              {t("reportsPage.email.row.sendTime")}: {schedule.send_time}
            </span>
            <span>
              {t("reportsPage.email.row.timezone")}: {schedule.timezone}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {(schedule.recipients || []).length}{" "}
              {t("reportsPage.email.row.recipients", {
                defaultValue: "recipients",
              })}
            </span>
            {schedule.last_sent_at ? (
              <span>
                {t("reportsPage.email.row.lastSent", {
                  defaultValue: "Last sent",
                })}
                : {new Date(schedule.last_sent_at).toLocaleString()}
              </span>
            ) : null}
          </div>
          {(schedule.config?.sections || []).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {(schedule.config?.sections || []).slice(0, 6).map((s) => (
                <Badge key={s} variant="outline" className="text-xs">
                  {s}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Switch
            checked={schedule.active}
            onCheckedChange={(checked) => onToggleActive(schedule.id, checked)}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onSendNow(schedule.id)}>
                <Send className="h-4 w-4 mr-2" />
                {t("reportsPage.email.row.sendNow", { defaultValue: "Send now" })}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(schedule.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t("reportsPage.email.row.delete", { defaultValue: "Delete" })}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
