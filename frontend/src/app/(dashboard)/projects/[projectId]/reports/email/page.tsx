"use client";

import { use, useMemo, useState } from "react";
import {
  Mail,
  Plus,
  Users,
  Play,
  Trash2,
  MoreHorizontal,
  Send,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  useCreateEmailSchedule,
  useDeleteEmailSchedule,
  useEmailSchedules,
  useSendEmailScheduleNow,
  useUpdateEmailSchedule,
  useTranslation,
} from "@/hooks";

interface EmailReportsPageProps {
  params: Promise<{ projectId: string }>;
}

interface EmailScheduleUi {
  id: string;
  recipients: string[];
  frequency: string;
  config?: { sections?: string[] };
  send_time: string;
  timezone: string;
  active: boolean;
}

const contentOptions = [
  { id: "summary", label: "Executive Summary" },
  { id: "mentions", label: "Recent Mentions" },
  { id: "sentiment", label: "Sentiment Analysis" },
  { id: "trends", label: "Trending Topics" },
  { id: "influencers", label: "Top Influencers" },
  { id: "alerts", label: "Important Alerts" },
];

export default function EmailReportsPage({ params }: EmailReportsPageProps) {
  const { projectId } = use(params);
  const { t } = useTranslation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const schedulesQuery = useEmailSchedules(projectId);
  const createSchedule = useCreateEmailSchedule(projectId);
  const updateSchedule = useUpdateEmailSchedule(projectId);
  const deleteSchedule = useDeleteEmailSchedule(projectId);
  const sendNow = useSendEmailScheduleNow(projectId);

  const reports = useMemo<EmailScheduleUi[]>(
    () => ((schedulesQuery.data || []) as EmailScheduleUi[]),
    [schedulesQuery.data]
  );

  const toggleActive = (id: string, active: boolean) => {
    updateSchedule.mutate(
      { scheduleId: id, data: { active } },
      {
        onError: () => toast.error("Failed to update schedule"),
      }
    );
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Mail className="h-7 w-7 text-primary" />
            {t("reports.email.title")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("reports.email.subtitle")}
          </p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="glow-sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Scheduled Report</DialogTitle>
            </DialogHeader>
            <CreateReportForm
              onCreate={(payload) => {
                createSchedule.mutate(payload, {
                  onSuccess: () => {
                    toast.success("Schedule created");
                    setIsCreateOpen(false);
                  },
                  onError: () => toast.error("Failed to create schedule"),
                });
              }}
              isSubmitting={createSchedule.isPending}
              onClose={() => setIsCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="glass">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{reports.length}</p>
              <p className="text-xs text-muted-foreground">Scheduled Reports</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Play className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{reports.filter((r) => r?.active).length}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{new Set(reports.flatMap((r) => r?.recipients || [])).size}</p>
              <p className="text-xs text-muted-foreground">Recipients</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Scheduled Reports */}
      <Card className="glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Scheduled Reports</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {schedulesQuery.isLoading && (
            <div className="p-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading schedules...
            </div>
          )}
          <div className="divide-y divide-border/30">
            {reports.map((report: EmailScheduleUi) => (
              <div key={report.id} className="p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{report.frequency} report</h3>
                      <Badge variant={report.active ? "default" : "secondary"} className="text-xs">
                        {report.active ? "Active" : "Paused"}
                      </Badge>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <div>{report.frequency}</div>
                      <div>Send time: {report.send_time}</div>
                      <div>Timezone: {report.timezone}</div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {(report.recipients || []).length} recipients
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(report.config?.sections || []).map((content: string) => (
                        <Badge key={content} variant="outline" className="text-xs">
                          {content}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={report.active}
                      onCheckedChange={(checked) => toggleActive(report.id, checked)}
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            sendNow.mutate(report.id, {
                              onSuccess: () => toast.success("Report generated"),
                              onError: () => toast.error("Failed to generate report"),
                            })
                          }
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Send Now
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() =>
                            deleteSchedule.mutate(report.id, {
                              onSuccess: () => toast.success("Schedule deleted"),
                              onError: () => toast.error("Failed to delete schedule"),
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CreateReportForm({
  onCreate,
  isSubmitting,
  onClose,
}: {
  onCreate: (payload: {
    recipients: string[];
    frequency: string;
    send_time: string;
    timezone: string;
    config: { sections: string[]; language: string };
    active: boolean;
  }) => void;
  isSubmitting: boolean;
  onClose: () => void;
}) {
  const [recipients, setRecipients] = useState<string[]>([]);
  const [newRecipient, setNewRecipient] = useState("");
  const [selectedContents, setSelectedContents] = useState<string[]>(["summary", "mentions"]);
  const [frequency, setFrequency] = useState("weekly");
  const [sendTime, setSendTime] = useState("09:00");
  const [language, setLanguage] = useState("en");
  
  const addRecipient = () => {
    if (newRecipient && !recipients.includes(newRecipient)) {
      setRecipients([...recipients, newRecipient]);
      setNewRecipient("");
    }
  };

  const submit = () => {
    if (!recipients.length) return;
    onCreate({
      recipients,
      frequency,
      send_time: sendTime,
      timezone: "Asia/Almaty",
      config: { sections: selectedContents, language },
      active: true,
    });
  };
  
  return (
    <div className="space-y-6 mt-4">
      {/* Recipients */}
      <div className="space-y-2">
        <Label>Recipients</Label>
        <div className="flex gap-2">
          <Input
            placeholder="email@example.com"
            value={newRecipient}
            onChange={(e) => setNewRecipient(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addRecipient()}
          />
          <Button type="button" onClick={addRecipient}>Add</Button>
        </div>
        {recipients.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {recipients.map((email) => (
              <Badge key={email} variant="secondary" className="pr-1">
                {email}
                <button
                  onClick={() => setRecipients(recipients.filter(r => r !== email))}
                  className="ml-1 hover:text-destructive"
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
      
      {/* Frequency */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Frequency</Label>
          <Select value={frequency} onValueChange={setFrequency}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="on_event">On Event</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Send Time</Label>
          <Select value={sendTime} onValueChange={setSendTime}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="06:00">6:00 AM</SelectItem>
              <SelectItem value="09:00">9:00 AM</SelectItem>
              <SelectItem value="12:00">12:00 PM</SelectItem>
              <SelectItem value="18:00">6:00 PM</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Contents */}
      <div className="space-y-2">
        <Label>Report Contents</Label>
        <div className="grid grid-cols-2 gap-3">
          {contentOptions.map((option) => (
            <label
              key={option.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer transition-colors"
            >
              <Checkbox
                checked={selectedContents.includes(option.id)}
                onCheckedChange={(checked: boolean | "indeterminate") => {
                  if (checked) {
                    setSelectedContents([...selectedContents, option.id]);
                  } else {
                    setSelectedContents(selectedContents.filter(c => c !== option.id));
                  }
                }}
              />
              <span className="text-sm">{option.label}</span>
            </label>
          ))}
        </div>
      </div>
      
      {/* Language */}
      <div className="space-y-2">
        <Label>Report Language</Label>
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">🇬🇧 English</SelectItem>
            <SelectItem value="ru">🇷🇺 Русский</SelectItem>
            <SelectItem value="kz">🇰🇿 Қазақша</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button className="glow-sm" onClick={submit} disabled={isSubmitting || recipients.length === 0}>
          {isSubmitting ? "Creating..." : "Create Schedule"}
        </Button>
      </div>
    </div>
  );
}










