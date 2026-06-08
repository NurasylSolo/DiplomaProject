"use client";

import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SafeECharts } from "@/components/ui/safe-echarts";
import { useReportPreview, useTranslation } from "@/hooks";
import { fmtCompact, num, str } from "@/features/_shared";
import { SENTIMENT_COLORS, donutItemStyle } from "@/features/_shared";

interface PdfPreviewCardProps {
  projectId: string;
  accentColor: string;
  /** Section ids the user toggled on. Used to render the bullet list of
   *  what's going to be included in the PDF. */
  enabledSections: string[];
  /** i18n base — `reportsPage.pdf.sections.*`. */
  sectionI18nBase: string;
  /** Resolves a section id to its human-readable label. */
  sectionLabel: (id: string) => string;
}

/**
 * Real-data preview shown next to the section toggles. Calls
 * `/reports/preview` once and renders KPI + a small sentiment donut so
 * the user knows roughly what they're about to download.
 */
export function PdfPreviewCard({
  projectId,
  accentColor,
  enabledSections,
  sectionLabel,
}: PdfPreviewCardProps) {
  const { t } = useTranslation();
  const { data, isLoading } = useReportPreview(projectId);

  const donutOption = useMemo(() => {
    const s = data?.sentiment;
    return {
      tooltip: { trigger: "item" as const },
      series: [
        {
          type: "pie" as const,
          radius: ["55%", "78%"],
          itemStyle: donutItemStyle(false),
          label: { show: false },
          data: [
            {
              value: num(s?.positive_count),
              name: t("mentions.sentiments.positive"),
              itemStyle: { color: SENTIMENT_COLORS.positive },
            },
            {
              value: num(s?.neutral_count),
              name: t("mentions.sentiments.neutral"),
              itemStyle: { color: SENTIMENT_COLORS.neutral },
            },
            {
              value: num(s?.negative_count),
              name: t("mentions.sentiments.negative"),
              itemStyle: { color: SENTIMENT_COLORS.negative },
            },
          ],
        },
      ],
    };
  }, [data?.sentiment, t]);

  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">
          {t("reportsPage.pdf.preview.title", { defaultValue: "Preview" })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className="rounded-lg border border-border/40 p-6 bg-white text-gray-800 dark:bg-zinc-100"
          style={{ borderTopColor: accentColor, borderTopWidth: 4 }}
        >
          {/* Title strip */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold" style={{ color: accentColor }}>
                {t("reportsPage.pdf.preview.heading", {
                  defaultValue: "Media Monitoring Report",
                })}
              </h2>
              <p className="text-xs text-gray-500">
                {data?.project_name || t("reportsPage.pdf.preview.loadingProject")}
              </p>
            </div>
            <p className="text-[10px] text-gray-400">
              {new Date().toLocaleDateString()}
            </p>
          </div>

          {/* KPI strip */}
          {isLoading ? (
            <div className="py-12 flex items-center justify-center text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              {[
                {
                  label: t("reportsPage.pdf.preview.mentions", {
                    defaultValue: "Mentions",
                  }),
                  value: fmtCompact(data?.kpi.total_mentions ?? 0),
                },
                {
                  label: t("reportsPage.pdf.preview.reach", {
                    defaultValue: "Reach",
                  }),
                  value: fmtCompact(data?.kpi.total_reach ?? 0),
                },
                {
                  label: t("mentions.sentiments.positive"),
                  value: `${Math.round(data?.kpi.positive_pct ?? 0)}%`,
                },
                {
                  label: t("mentions.sentiments.negative"),
                  value: `${Math.round(data?.kpi.negative_pct ?? 0)}%`,
                },
              ].map((card) => (
                <div
                  key={card.label}
                  className="rounded-md p-2 text-center bg-gray-50"
                  style={{ borderTop: `3px solid ${accentColor}` }}
                >
                  <p className="text-base font-bold" style={{ color: accentColor }}>
                    {card.value}
                  </p>
                  <p className="text-[10px] text-gray-500">{card.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Mini sentiment donut */}
          <SafeECharts
            option={donutOption}
            style={{ height: 140 }}
            opts={{ renderer: "svg" }}
          />

          {/* Top sources sneak peek */}
          {(data?.top_sources?.length ?? 0) > 0 && (
            <div className="mt-3 space-y-1">
              <p className="text-[10px] font-semibold text-gray-500 uppercase">
                {t("reportsPage.pdf.preview.topSources", {
                  defaultValue: "Top sources",
                })}
              </p>
              {(data?.top_sources || []).slice(0, 3).map((s) => (
                <div
                  key={s.source_id || s.name}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="truncate flex-1">{str(s.name)}</span>
                  <span className="font-medium tabular-nums text-gray-500 ml-2">
                    {num(s.mentions_count).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Sections list */}
          <div className="mt-4 pt-3 border-t border-gray-200">
            <p className="text-[10px] font-semibold text-gray-500 uppercase mb-2">
              {t("reportsPage.pdf.preview.included", {
                defaultValue: "Included sections",
              })}{" "}
              ({enabledSections.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {enabledSections.map((id) => (
                <span
                  key={id}
                  className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${accentColor}1A`,
                    color: accentColor,
                  }}
                >
                  {sectionLabel(id)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
