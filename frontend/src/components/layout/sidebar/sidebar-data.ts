import {
  MessageSquareText,
  Sparkles,
  BarChart3,
  Bot,
  Tags,
  GitCompare,
  Globe,
  Users,
  Mail,
  FileText,
  FileSpreadsheet,
  Image,
  MapPin,
  UserCircle,
  Clock,
  Heart,
  Settings,
} from "lucide-react";

export interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: string | number;
  children?: SidebarItem[];
}

export interface SidebarSection {
  title?: string;
  items: SidebarItem[];
}

export const getSidebarData = (projectId: string, t: (key: string) => string): SidebarSection[] => [
  {
    items: [
      {
        id: "mentions",
        label: t("nav.mentions"),
        icon: MessageSquareText,
        href: `/projects/${projectId}/mentions`,
        badge: t("common.new", { defaultValue: "New" }),
      },
      {
        id: "insights",
        label: t("nav.insights"),
        icon: Sparkles,
        href: `/projects/${projectId}/insights`,
      },
      {
        id: "analysis",
        label: t("nav.analysis"),
        icon: BarChart3,
        href: `/projects/${projectId}/analysis`,
      },
    ],
  },
  {
    title: t("nav.sections.aiTools"),
    items: [
      {
        id: "assistant",
        label: t("nav.assistant"),
        icon: Bot,
        href: `/projects/${projectId}/assistant`,
      },
      {
        id: "topics",
        label: t("nav.topics"),
        icon: Tags,
        href: `/projects/${projectId}/topics`,
      },
    ],
  },
  {
    title: t("nav.sections.research"),
    items: [
      {
        id: "comparison",
        label: t("nav.comparison"),
        icon: GitCompare,
        href: `/projects/${projectId}/comparison`,
      },
      {
        id: "sources",
        label: t("nav.sources"),
        icon: Globe,
        href: `/projects/${projectId}/sources`,
      },
      {
        id: "influencers",
        label: t("nav.influencers"),
        icon: Users,
        href: `/projects/${projectId}/influencers`,
      },
    ],
  },
  {
    title: t("nav.sections.reports"),
    items: [
      {
        id: "email-reports",
        label: t("nav.reports.email"),
        icon: Mail,
        href: `/projects/${projectId}/reports/email`,
      },
      {
        id: "pdf-report",
        label: t("nav.reports.pdf"),
        icon: FileText,
        href: `/projects/${projectId}/reports/pdf`,
      },
      {
        id: "excel-export",
        label: t("nav.reports.excel"),
        icon: FileSpreadsheet,
        href: `/projects/${projectId}/reports/excel`,
      },
      {
        id: "infographic",
        label: t("nav.reports.infographic"),
        icon: Image,
        href: `/projects/${projectId}/reports/infographic`,
      },
    ],
  },
  {
    title: t("nav.sections.deepAnalysis"),
    items: [
      {
        id: "geo",
        label: t("nav.geo"),
        icon: MapPin,
        href: `/projects/${projectId}/geo`,
      },
      {
        id: "influencer-analysis",
        label: t("nav.influencerAnalysis"),
        icon: UserCircle,
        href: `/projects/${projectId}/influencer-analysis`,
      },
      {
        id: "hot-hours",
        label: t("nav.hotHours"),
        icon: Clock,
        href: `/projects/${projectId}/hot-hours`,
      },
      {
        id: "emotions",
        label: t("nav.emotions"),
        icon: Heart,
        href: `/projects/${projectId}/emotions`,
      },
    ],
  },
  {
    items: [
      {
        id: "settings",
        label: t("nav.settings"),
        icon: Settings,
        href: `/projects/${projectId}/settings`,
      },
    ],
  },
];

