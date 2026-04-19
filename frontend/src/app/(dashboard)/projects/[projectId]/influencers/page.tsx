"use client";

import { use, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { useTranslation } from "@/hooks";
import {
  buildPlatformDonut,
  buildTopInfluencersBar,
  exportInfluencersCsv,
  InfluencerDetailDialog,
  InfluencersCharts,
  InfluencersFilters,
  InfluencersHeader,
  InfluencersStats,
  InfluencersTable,
  useInfluencersPage,
} from "@/features/influencers";
import type { InfluencerDto } from "@/lib/api/services/influencers";

interface InfluencersPageProps {
  params: Promise<{ projectId: string }>;
}

export default function InfluencersPage({ params }: InfluencersPageProps) {
  const { projectId } = use(params);
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const data = useInfluencersPage(projectId);
  const [selected, setSelected] = useState<InfluencerDto | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Memoised so the chart only re-renders when the data or theme changes,
  // not on every keystroke in the search box.
  const topInfluencersBar = useMemo(
    () => buildTopInfluencersBar(data.influencers, isDark),
    [data.influencers, isDark]
  );
  const platformDonut = useMemo(
    () => buildPlatformDonut(data.influencers, isDark),
    [data.influencers, isDark]
  );

  const handleExport = () => {
    const ok = exportInfluencersCsv(projectId, data.influencers);
    if (ok) toast.success(t("influencersPage.toasts.exported"));
    else toast.error(t("influencersPage.toasts.noDataExport"));
  };

  const handleRefresh = async () => {
    await data.refresh();
    toast.success(t("influencersPage.toasts.refreshed"));
  };

  if (data.isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <InfluencersHeader
        isRefetching={data.isRefetching}
        onRefresh={handleRefresh}
        onExportCsv={handleExport}
      />

      <InfluencersStats {...data.stats} />

      {data.influencers.length > 0 && (
        <InfluencersCharts
          topInfluencersBar={topInfluencersBar}
          platformDonut={platformDonut}
        />
      )}

      <InfluencersFilters
        search={data.search}
        setSearch={data.setSearch}
        platform={data.platform}
        setPlatform={data.setPlatform}
        uniquePlatforms={data.uniquePlatforms}
      />

      <InfluencersTable
        paged={data.paged}
        totalCount={data.influencers.length}
        page={data.page}
        totalPages={data.totalPages}
        setPage={data.setPage}
        sortBy={data.sortBy}
        sortOrder={data.sortOrder}
        onSort={data.handleSort}
        onView={(inf) => {
          setSelected(inf);
          setDetailOpen(true);
        }}
      />

      <InfluencerDetailDialog
        projectId={projectId}
        influencer={selected}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
