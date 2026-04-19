/**
 * Catalogue of toggleable sections used by the PDF & Excel pages.
 *
 * `id` matches the keys the backend expects in `report.config.sections`.
 * `i18nKey` points at `reportsPage.{kind}.sections.{i18nKey}` so the same
 * preset can be displayed in every supported language.
 */

export interface SectionPreset {
  id: string;
  i18nKey: string;
  defaultChecked: boolean;
}

export const PDF_SECTION_PRESETS: SectionPreset[] = [
  { id: "summary", i18nKey: "summary", defaultChecked: true },
  { id: "social_reach", i18nKey: "socialReach", defaultChecked: true },
  { id: "volume_chart", i18nKey: "volumeChart", defaultChecked: true },
  { id: "geo", i18nKey: "geo", defaultChecked: true },
  { id: "emotions", i18nKey: "emotions", defaultChecked: true },
  { id: "hot_hours", i18nKey: "hotHours", defaultChecked: true },
  { id: "languages", i18nKey: "languages", defaultChecked: true },
  { id: "topics", i18nKey: "topics", defaultChecked: true },
  { id: "influential_sites", i18nKey: "topSources", defaultChecked: true },
  { id: "top_profiles", i18nKey: "topProfiles", defaultChecked: true },
  { id: "trending_hashtags", i18nKey: "keywords", defaultChecked: true },
  { id: "recent_mentions", i18nKey: "recentMentions", defaultChecked: true },
  { id: "popular_mentions", i18nKey: "popularMentions", defaultChecked: false },
  { id: "context", i18nKey: "context", defaultChecked: false },
  { id: "numeric_summary", i18nKey: "numericSummary", defaultChecked: false },
  { id: "active_profiles", i18nKey: "activeProfiles", defaultChecked: false },
];

export const EXCEL_SHEET_PRESETS: SectionPreset[] = [
  { id: "mentions", i18nKey: "mentions", defaultChecked: true },
  { id: "sources", i18nKey: "sources", defaultChecked: true },
  { id: "sentiment", i18nKey: "sentiment", defaultChecked: true },
  { id: "influencers", i18nKey: "influencers", defaultChecked: false },
  { id: "trends", i18nKey: "trends", defaultChecked: false },
  { id: "daily_stats", i18nKey: "dailyStats", defaultChecked: true },
  { id: "geo", i18nKey: "geo", defaultChecked: false },
  { id: "emotions", i18nKey: "emotions", defaultChecked: false },
  { id: "hot_hours", i18nKey: "hotHours", defaultChecked: false },
  { id: "languages", i18nKey: "languages", defaultChecked: false },
];

export const ACCENT_COLORS = [
  { name: "Cyan", value: "#0d9488" },
  { name: "Emerald", value: "#10B981" },
  { name: "Amber", value: "#F59E0B" },
  { name: "Rose", value: "#F43F5E" },
  { name: "Violet", value: "#8B5CF6" },
  { name: "Blue", value: "#3B82F6" },
] as const;

export const REPORT_LANGUAGES = [
  { code: "en", flag: "🇬🇧", label: "English" },
  { code: "ru", flag: "🇷🇺", label: "Русский" },
  { code: "kz", flag: "🇰🇿", label: "Қазақша" },
] as const;
