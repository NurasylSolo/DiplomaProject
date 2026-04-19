"use client";

import { use, useMemo, useState } from "react";
import { Loader2, Mail, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  EmailCreateDialog,
  EmailScheduleRow,
  EmailStatsCards,
  ReportsHeader,
  type EmailScheduleRowData,
} from "@/features/reports";
import {
  useCreateEmailSchedule,
  useDeleteEmailSchedule,
  useEmailSchedules,
  useSendEmailScheduleNow,
  useTranslation,
  useUpdateEmailSchedule,
} from "@/hooks";

interface EmailReportsPageProps {
  params: Promise<{ projectId: string }>;
}

export default function EmailReportsPage({ params }: EmailReportsPageProps) {
  const { projectId } = use(params);
  const { t } = useTranslation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const schedulesQuery = useEmailSchedules(projectId);
  const createSchedule = useCreateEmailSchedule(projectId);
  const updateSchedule = useUpdateEmailSchedule(projectId);
  const deleteSchedule = useDeleteEmailSchedule(projectId);
  const sendNow = useSendEmailScheduleNow(projectId);

  const schedules = useMemo<EmailScheduleRowData[]>(
    () => ((schedulesQuery.data || []) as EmailScheduleRowData[]),
    [schedulesQuery.data]
  );

  const stats = useMemo(
    () => ({
      total: schedules.length,
      active: schedules.filter((s) => s.active).length,
      uniqueRecipients: new Set(schedules.flatMap((s) => s.recipients || [])).size,
    }),
    [schedules]
  );

  const toggleActive = (id: string, active: boolean) => {
    updateSchedule.mutate(
      { scheduleId: id, data: { active } },
      {
        onError: () =>
          toast.error(
            t("reportsPage.email.toasts.updateFailed", {
              defaultValue: "Failed to update schedule",
            })
          ),
      }
    );
  };

  const handleSendNow = (scheduleId: string) => {
    sendNow.mutate(scheduleId, {
      onSuccess: (result) => {
        if (result?.success) {
          toast.success(
            t("reportsPage.email.toasts.sent", {
              defaultValue: "Report sent to {{count}} recipient(s)",
              count: result.recipients_count ?? 0,
            })
          );
        } else if (result?.error === "smtp_not_configured") {
          toast.error(
            t("reportsPage.email.toasts.smtpNotConfigured", {
              defaultValue: "SMTP server not configured on the backend",
            })
          );
        } else if (result?.error === "no_valid_recipients") {
          toast.error(
            t("reportsPage.email.toasts.noRecipients", {
              defaultValue: "No valid recipients to send to",
            })
          );
        } else {
          toast.error(
            t("reportsPage.email.toasts.sendFailed", {
              defaultValue: "Failed to send report",
            })
          );
        }
      },
      onError: () =>
        toast.error(
          t("reportsPage.email.toasts.sendFailed", {
            defaultValue: "Failed to send report",
          })
        ),
    });
  };

  const handleDelete = (scheduleId: string) => {
    if (
      !confirm(
        t("reportsPage.email.confirm.delete", {
          defaultValue: "Delete this scheduled report?",
        })
      )
    ) {
      return;
    }
    deleteSchedule.mutate(scheduleId, {
      onSuccess: () =>
        toast.success(
          t("reportsPage.email.toasts.deleted", {
            defaultValue: "Schedule deleted",
          })
        ),
      onError: () =>
        toast.error(
          t("reportsPage.email.toasts.deleteFailed", {
            defaultValue: "Failed to delete schedule",
          })
        ),
    });
  };

  return (
    <div className="space-y-6">
      <ReportsHeader
        icon={Mail}
        title={t("reportsPage.email.title")}
        subtitle={t("reportsPage.email.subtitle")}
        actions={
          <Button className="glow-sm" onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t("reportsPage.email.actions.createSchedule", {
              defaultValue: "Create schedule",
            })}
          </Button>
        }
      />

      <EmailStatsCards
        totalSchedules={stats.total}
        activeSchedules={stats.active}
        uniqueRecipients={stats.uniqueRecipients}
        t={t}
      />

      <Card className="glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">
            {t("reportsPage.email.list.title", {
              defaultValue: "Scheduled reports",
            })}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {schedulesQuery.isLoading ? (
            <div className="p-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("reportsPage.email.list.loading", {
                defaultValue: "Loading schedules…",
              })}
            </div>
          ) : schedules.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground space-y-2">
              <Mail className="h-10 w-10 mx-auto opacity-40" />
              <p>
                {t("reportsPage.email.list.empty", {
                  defaultValue:
                    "No scheduled reports yet. Click 'Create schedule' to set one up.",
                })}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {schedules.map((schedule) => (
                <EmailScheduleRow
                  key={schedule.id}
                  schedule={schedule}
                  onToggleActive={toggleActive}
                  onSendNow={handleSendNow}
                  onDelete={handleDelete}
                  t={t}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <EmailCreateDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        isSubmitting={createSchedule.isPending}
        onSubmit={(payload) => {
          createSchedule.mutate(payload, {
            onSuccess: () => {
              toast.success(
                t("reportsPage.email.toasts.created", {
                  defaultValue: "Schedule created",
                })
              );
              setIsCreateOpen(false);
            },
            onError: () =>
              toast.error(
                t("reportsPage.email.toasts.createFailed", {
                  defaultValue: "Failed to create schedule",
                })
              ),
          });
        }}
        t={t}
      />
    </div>
  );
}
