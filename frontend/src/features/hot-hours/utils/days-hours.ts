/**
 * Day-of-week + hour helpers shared between heatmap, KPI cards and the
 * "best time to post" panel.
 *
 * Day numbering follows Postgres `extract('dow', ...)`:
 *
 *   0 = Sunday
 *   1 = Monday
 *   ...
 *   6 = Saturday
 *
 * The display row order on the heatmap is Mon → Sun (more natural for
 * EN/RU/KZ users). `DAY_DISPLAY_ORDER` maps a row index in that visual
 * order to the API day number.
 */

type Translator = (key: string, options?: Record<string, unknown>) => string;

/** API day number → short i18n key (matches existing locale block). */
export const DAY_KEYS: Record<number, string> = {
  0: "sun",
  1: "mon",
  2: "tue",
  3: "wed",
  4: "thu",
  5: "fri",
  6: "sat",
};

/** Visual row order on the heatmap (0 = Mon row, 6 = Sun row). */
export const DAY_DISPLAY_ORDER: number[] = [1, 2, 3, 4, 5, 6, 0];

/** All 24 hours, useful for axis ticks. */
export const HOUR_RANGE: number[] = Array.from({ length: 24 }, (_, i) => i);

export function dayLabel(day: number, t: Translator): string {
  const key = DAY_KEYS[day] || "sun";
  return t(`hotHoursPage.days.${key}`, { defaultValue: key.toUpperCase() });
}

export function dayLabelLong(day: number, t: Translator): string {
  const key = DAY_KEYS[day] || "sun";
  return t(`hotHoursPage.daysLong.${key}`, {
    defaultValue: dayLabel(day, t),
  });
}

/** "5 PM", "12 AM", etc. Stable across locales — meant for compact axes. */
export function formatHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}

/** "14:00" 24-hour format for tooltips and CSV. */
export function formatHour24(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

/** A short curated list of timezones for the picker. We always prepend
 *  the browser's detected zone if it isn't already in the list. */
export const COMMON_TIMEZONES: { value: string; label: string }[] = [
  { value: "UTC", label: "UTC" },
  { value: "Asia/Almaty", label: "Asia/Almaty (GMT+5)" },
  { value: "Europe/Moscow", label: "Europe/Moscow (GMT+3)" },
  { value: "Europe/London", label: "Europe/London" },
  { value: "America/New_York", label: "America/New_York" },
];
