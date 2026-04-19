"use client";

import { use } from "react";
// `Image` from lucide collides with the global Image constructor we don't
// use here. Aliasing keeps imports readable without ESLint complaining.
import { Download, Image as ImageIcon, Loader2, RefreshCw, Share2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  InfographicCanvas,
  ReportsHeader,
  useExportImage,
} from "@/features/reports";
import {
  useGeoData,
  useInfluencers,
  useReportPreview,
  useTranslation,
} from "@/hooks";

interface InfographicPageProps {
  params: Promise<{ projectId: string }>;
}

export default function InfographicPage({ params }: InfographicPageProps) {
  const { projectId } = use(params);
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const previewQuery = useReportPreview(projectId);
  const influencersQuery = useInfluencers(projectId, { limit: 5 });
  const geoQuery = useGeoData(projectId);

  // The infographic is large but pure HTML — html-to-image rasterises it
  // at retina pixel-ratio so the output looks crisp on Twitter / LinkedIn.
  const { ref, exportPng, share, isExporting } = useExportImage<HTMLDivElement>({
    backgroundColor: "#0b0d12",
    pixelRatio: 2,
  });

  const handleExport = async () => {
    const ok = await exportPng(
      `infographic-${(previewQuery.data?.project_name || "project").toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.png`
    );
    toast[ok ? "success" : "error"](
      ok
        ? t("reportsPage.infographic.toasts.exported", {
            defaultValue: "Infographic saved",
          })
        : t("reportsPage.infographic.toasts.exportFailed", {
            defaultValue: "Failed to save infographic",
          })
    );
  };

  const handleShare = async () => {
    const result = await share(
      `infographic-${new Date().toISOString().slice(0, 10)}.png`,
      previewQuery.data?.project_name || "Media report"
    );
    if (result === "shared") {
      toast.success(
        t("reportsPage.infographic.toasts.shared", { defaultValue: "Shared" })
      );
    } else if (result === "copied") {
      toast.success(
        t("reportsPage.infographic.toasts.linkCopied", {
          defaultValue: "Link copied to clipboard",
        })
      );
    } else {
      toast.error(
        t("reportsPage.infographic.toasts.shareFailed", {
          defaultValue: "Failed to share",
        })
      );
    }
  };

  const handleRegenerate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["report-preview", projectId] }),
      queryClient.invalidateQueries({ queryKey: ["influencers", projectId] }),
      queryClient.invalidateQueries({ queryKey: ["analytics", "geo", projectId] }),
    ]);
    toast.success(
      t("reportsPage.infographic.toasts.refreshed", {
        defaultValue: "Refreshed",
      })
    );
  };

  // Adapt geo response (may be {country, mentions, ...}) to the canvas prop.
  const geoCountries =
    (geoQuery.data ?? []).map((g) => ({
      country: g.country,
      mentions: g.mentions ?? 0,
    })) ?? [];

  const isLoading =
    previewQuery.isLoading || influencersQuery.isLoading || geoQuery.isLoading;

  return (
    <div className="space-y-6">
      <ReportsHeader
        icon={ImageIcon}
        title={t("reportsPage.infographic.title")}
        subtitle={t("reportsPage.infographic.subtitle")}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {t("reportsPage.infographic.actions.regenerate", {
                defaultValue: "Regenerate",
              })}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              disabled={isExporting || isLoading}
            >
              <Share2 className="h-4 w-4 mr-2" />
              {t("reportsPage.infographic.actions.share", {
                defaultValue: "Share",
              })}
            </Button>
            <Button
              className="glow-sm"
              onClick={handleExport}
              disabled={isExporting || isLoading}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {t("reportsPage.infographic.actions.exportPng", {
                defaultValue: "Export PNG",
              })}
            </Button>
          </>
        }
      />

      <Card className="glass overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <InfographicCanvas
              ref={ref}
              preview={previewQuery.data}
              influencers={influencersQuery.data}
              geoCountries={geoCountries}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
