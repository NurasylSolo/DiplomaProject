"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useHotHours } from "@/hooks";
import { useDatePreset, type DatePresetId } from "@/features/_shared";
import { COMMON_TIMEZONES } from "../utils/days-hours";

function detectBrowserTimezone(): string {
  // SSR-safe: window/Intl might not exist when this module is first
  // imported during static analysis. We fall back to UTC, which the
  // backend also accepts.
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * State + data for the Hot Hours page.
 *
 * - Detects the browser's IANA timezone on first render and uses it as
 *   the default — matches what the user sees on their wall clock.
 * - Exposes a stable `tzOptions` list that always includes the browser
 *   tz at the top so users can switch to UTC / Almaty / etc. for
 *   cross-team consistency.
 */
export function useHotHoursPage(projectId: string) {
  const [tz, setTz] = useState<string>(detectBrowserTimezone);
  const { preset, setPreset, range } = useDatePreset("all");

  const params = useMemo(
    () => ({ timezone: tz, ...range }),
    [tz, range]
  );

  const query = useHotHours(projectId, params);

  // Build the dropdown list — prepend the browser tz unless it's already
  // in COMMON_TIMEZONES.
  const tzOptions = useMemo(() => {
    const browser = detectBrowserTimezone();
    const inCommon = COMMON_TIMEZONES.some((o) => o.value === browser);
    if (inCommon) return COMMON_TIMEZONES;
    return [
      { value: browser, label: `Browser (${browser})` },
      ...COMMON_TIMEZONES,
    ];
  }, []);

  const queryClient = useQueryClient();
  const refresh = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["analytics", "hot-hours", projectId],
    });
  };

  return {
    tz,
    setTz,
    tzOptions,
    preset: preset as DatePresetId,
    setPreset,
    data: query.data,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    refresh,
  };
}
