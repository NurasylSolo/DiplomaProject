import {
  AlertTriangle,
  FileText,
  MessageSquare,
  Settings,
  Users,
} from "lucide-react";

export const HEADER_PROJECT_COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
  "#EF4444",
  "#06B6D4",
];

export type NotificationType =
  | "alert"
  | "report"
  | "mention"
  | "influencer"
  | "system";

export interface Notification {
  id: string;
  title: string;
  description: string;
  time: string;
  unread: boolean;
  type: NotificationType;
  project?: string;
}

export const NOTIFICATION_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  alert: AlertTriangle,
  report: FileText,
  mention: MessageSquare,
  influencer: Users,
  system: Settings,
};

export const NOTIFICATION_COLORS: Record<string, string> = {
  alert: "text-amber-500 bg-amber-500/10",
  report: "text-blue-500 bg-blue-500/10",
  mention: "text-green-500 bg-green-500/10",
  influencer: "text-purple-500 bg-purple-500/10",
  system: "text-gray-500 bg-gray-500/10",
};

/** Map an alert payload type into one of the UI notification buckets. */
export function notificationTypeFromAlertType(t: string): NotificationType {
  if (t === "negative_spike" || t === "mention_spike") return "alert";
  if (t.includes("report")) return "report";
  return "system";
}

export function formatRelativeTime(value: string): string {
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
