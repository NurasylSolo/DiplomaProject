import { useMemo, useState } from "react";

export type DatePresetId = "all" | "today" | "7d" | "30d" | "90d";

export interface DatePreset {
  id: DatePresetId;
  days?: number;
}

export const DATE_PRESETS: DatePreset[] = [
  { id: "all" },
  { id: "today", days: 1 },
  { id: "7d", days: 7 },
  { id: "30d", days: 30 },
  { id: "90d", days: 90 },
];

/**
 * Local-state date preset used by analysis / comparison header buttons.
 * Returns the preset id, a setter, and the API-shaped { date_from, date_to }
 * derived from it. "all" returns an empty object so callers can spread it
 * into request params without conditional logic.
 */
export function useDatePreset(initial: DatePresetId = "all") {
  const [preset, setPreset] = useState<DatePresetId>(initial);

  const range = useMemo(() => {
    if (preset === "all") return {} as { date_from?: string; date_to?: string };
    const days = DATE_PRESETS.find((p) => p.id === preset)?.days ?? 7;
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days + 1);
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);
    const fmt = (d: Date) => d.toISOString().slice(0, 19);
    return { date_from: fmt(from), date_to: fmt(to) };
  }, [preset]);

  return { preset, setPreset, range };
}
