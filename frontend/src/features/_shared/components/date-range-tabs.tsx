"use client";

import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks";
import { DATE_PRESETS, type DatePresetId } from "../hooks/use-date-preset";

interface DateRangeTabsProps {
  /** Current preset id. */
  value: DatePresetId;
  onChange: (preset: DatePresetId) => void;
  /** i18n key root for labels (defaults to analysis.dateRange). */
  i18nRoot?: string;
}

const LABEL_KEYS: Record<DatePresetId, string> = {
  all: "allTime",
  today: "today",
  "7d": "last7",
  "30d": "last30",
  "90d": "last90",
};

/**
 * Pill-button group for switching date presets. Used by analysis and
 * comparison page headers (was duplicated inline in both).
 */
export function DateRangeTabs({
  value,
  onChange,
  i18nRoot = "analysis.dateRange",
}: DateRangeTabsProps) {
  const { t } = useTranslation();

  return (
    <div className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-border p-1 bg-muted/30">
      {DATE_PRESETS.map((p) => (
        <button
          key={p.id}
          onClick={() => onChange(p.id)}
          className={cn(
            "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
            value === p.id
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {t(`${i18nRoot}.${LABEL_KEYS[p.id]}`)}
        </button>
      ))}
    </div>
  );
}
