"use client";

import { use, useState } from "react";
import { motion } from "framer-motion";
import {
  Mail,
  Plus,
  Calendar,
  Clock,
  Users,
  Edit,
  Trash2,
  Play,
  Pause,
  MoreHorizontal,
  Send,
  FileText,
  BarChart3,
  MessageSquare,
} from "lucide-react";
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
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks";

interface EmailReportsPageProps {
  params: Promise<{ projectId: string }>;
}

const scheduledReports = [
  {
    id: "1",
    name: "Weekly Summary",
    recipients: ["team@company.com", "marketing@company.com"],
    frequency: "Weekly",
    nextSend: "Monday, 9:00 AM",
    active: true,
    lastSent: "Dec 18, 2024",
    contents: ["summary", "mentions", "sentiment"],
  },
  {
    id: "2",
    name: "Daily Alerts",
    recipients: ["alerts@company.com"],
    frequency: "Daily",
    nextSend: "Tomorrow, 8:00 AM",
    active: true,
    lastSent: "Dec 24, 2024",
    contents: ["alerts", "mentions"],
  },
  {
    id: "3",
    name: "Monthly Report",
    recipients: ["executives@company.com", "pr@company.com"],
    frequency: "Monthly",
    nextSend: "Jan 1, 2025",
    active: false,
    lastSent: "Dec 1, 2024",
    contents: ["summary", "mentions", "sentiment", "trends", "influencers"],
  },
];

const contentOptions = [
  { id: "summary", label: "Executive Summary", icon: FileText },
  { id: "mentions", label: "Recent Mentions", icon: MessageSquare },
  { id: "sentiment", label: "Sentiment Analysis", icon: BarChart3 },
  { id: "trends", label: "Trending Topics", icon: BarChart3 },
  { id: "influencers", label: "Top Influencers", icon: Users },
  { id: "alerts", label: "Important Alerts", icon: Mail },
];

export default function EmailReportsPage({ params }: EmailReportsPageProps) {
  const { projectId } = use(params);
  const { t } = useTranslation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [reports, setReports] = useState(scheduledReports);
  
  const toggleActive = (id: string) => {
    setReports(reports.map(r => r.id === id ? { ...r, active: !r.active } : r));
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
              {t("reports.email.create")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t("reports.email.createScheduledReport")}</DialogTitle>
            </DialogHeader>
            <CreateReportForm onClose={() => setIsCreateOpen(false)} />
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
              <p className="text-xs text-muted-foreground">{t("reports.email.scheduledReports")}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Play className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{reports.filter(r => r.active).length}</p>
              <p className="text-xs text-muted-foreground">{t("reports.email.active")}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{new Set(reports.flatMap(r => r.recipients)).size}</p>
              <p className="text-xs text-muted-foreground">{t("reports.email.recipients")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Scheduled Reports */}
      <Card className="glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">{t("reports.email.scheduledReports")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/30">
            {reports.map((report, index) => (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{report.name}</h3>
                      <Badge variant={report.active ? "default" : "secondary"} className="text-xs">
                        {report.active ? "Active" : "Paused"}
                      </Badge>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {report.frequency}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        Next: {report.nextSend}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {report.recipients.length} recipients
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mt-2">
                      {report.contents.map((content) => (
                        <Badge key={content} variant="outline" className="text-xs">
                          {content}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={report.active}
                      onCheckedChange={() => toggleActive(report.id)}
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Send className="h-4 w-4 mr-2" />
                          Send Now
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CreateReportForm({ onClose }: { onClose: () => void }) {
  const [recipients, setRecipients] = useState<string[]>([]);
  const [newRecipient, setNewRecipient] = useState("");
  const [selectedContents, setSelectedContents] = useState<string[]>(["summary", "mentions"]);
  
  const addRecipient = () => {
    if (newRecipient && !recipients.includes(newRecipient)) {
      setRecipients([...recipients, newRecipient]);
      setNewRecipient("");
    }
  };
  
  return (
    <div className="space-y-6 mt-4">
      {/* Name */}
      <div className="space-y-2">
        <Label>Report Name</Label>
        <Input placeholder="e.g., Weekly Summary" />
      </div>
      
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
          <Select defaultValue="weekly">
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
          <Select defaultValue="9am">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6am">6:00 AM</SelectItem>
              <SelectItem value="9am">9:00 AM</SelectItem>
              <SelectItem value="12pm">12:00 PM</SelectItem>
              <SelectItem value="6pm">6:00 PM</SelectItem>
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
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedContents([...selectedContents, option.id]);
                  } else {
                    setSelectedContents(selectedContents.filter(c => c !== option.id));
                  }
                }}
              />
              <option.icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{option.label}</span>
            </label>
          ))}
        </div>
      </div>
      
      {/* Language */}
      <div className="space-y-2">
        <Label>Report Language</Label>
        <Select defaultValue="en">
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
        <Button className="glow-sm" onClick={onClose}>Create Schedule</Button>
      </div>
    </div>
  );
}










