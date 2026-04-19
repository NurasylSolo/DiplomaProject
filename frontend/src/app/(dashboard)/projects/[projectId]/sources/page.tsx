"use client";

import { use, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { useTranslation } from "@/hooks";
import { downloadCsv, buildCsvFilename, type CsvRow } from "@/lib/csv";
import { getErrorMessage } from "@/lib/api";
import {
  AddSourceDialog,
  AttachCatalogDialog,
  BulkActionBar,
  SourcesCharts,
  SourcesFilters,
  SourcesHeader,
  SourcesStats,
  SourcesTable,
  buildTopSourcesBar,
  buildTypesDonut,
  useSourcesPage,
  type BulkAction,
  type SourceRow,
} from "@/features/sources";

interface SourcesPageProps {
  params: Promise<{ projectId: string }>;
}

export default function SourcesPage({ params }: SourcesPageProps) {
  const { projectId } = use(params);
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const data = useSourcesPage(projectId);
  const [addOpen, setAddOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);

  const topSourcesBar = useMemo(
    () => buildTopSourcesBar(data.sources, isDark),
    [data.sources, isDark]
  );
  const typesDonut = useMemo(
    () => buildTypesDonut(data.sources, isDark),
    [data.sources, isDark]
  );

  // ── single-row actions
  const handleToggleActive = (s: SourceRow) => {
    data.updateMutation.mutate(
      { sourceId: s.id, data: { active: !s.active } },
      { onError: (err) => toast.error(getErrorMessage(err)) }
    );
  };
  const handleToggleTrust = (s: SourceRow) => {
    data.updateMutation.mutate(
      { sourceId: s.id, data: { trust_score: s.trusted ? 0.4 : 0.85 } },
      {
        onSuccess: () =>
          toast.success(
            t(s.trusted ? "sources.toasts.untrusted" : "sources.toasts.trusted")
          ),
        onError: (err) => toast.error(getErrorMessage(err)),
      }
    );
  };
  const handleDelete = (s: SourceRow) => {
    if (!confirm(t("sources.confirm.deleteOne", { name: s.name }))) return;
    data.deleteMutation.mutate(s.id, {
      onSuccess: () => toast.success(t("sources.toasts.deleted")),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  };

  // ── bulk
  const handleBulk = (action: BulkAction) => {
    if (data.selectedIds.size === 0) return;
    if (
      action === "delete" &&
      !confirm(t("sources.confirm.deleteMany", { count: data.selectedIds.size }))
    )
      return;
    data.bulkMutation.mutate(
      { action, source_ids: Array.from(data.selectedIds) },
      {
        onSuccess: (res) => {
          toast.success(res.message);
          data.clearSelection();
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      }
    );
  };

  // ── header actions
  const handleExportCsv = () => {
    if (data.sorted.length === 0) {
      toast.error(t("sources.toasts.noDataExport"));
      return;
    }
    const rows: CsvRow[] = data.sorted.map((s) => ({
      name: s.name,
      base_url: s.baseUrl,
      type: s.type,
      active: s.active,
      trusted: s.trusted,
      trust_score: s.trustScore,
      country: s.country ?? "",
      language: s.language ?? "",
      mentions: s.mentionCount,
      total_reach: s.totalReach,
      avg_sentiment: s.avgSentiment,
      last_published_at: s.lastPublishedAt
        ? s.lastPublishedAt.toISOString()
        : "",
      last_crawled_at: s.lastCrawledAt ? s.lastCrawledAt.toISOString() : "",
    }));
    downloadCsv(buildCsvFilename("sources", projectId), rows);
    toast.success(t("sources.toasts.exported"));
  };

  if (data.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SourcesHeader
        isRefetching={data.isRefetching}
        onRefresh={() => data.refetch()}
        onExportCsv={handleExportCsv}
        onOpenAttach={() => setAttachOpen(true)}
        onOpenAdd={() => setAddOpen(true)}
      />

      <SourcesStats {...data.stats} />

      {data.sources.length > 0 && (
        <SourcesCharts topSourcesBar={topSourcesBar} typesDonut={typesDonut} />
      )}

      <SourcesFilters
        searchQuery={data.searchQuery}
        setSearchQuery={data.setSearchQuery}
        typeFilter={data.typeFilter}
        setTypeFilter={data.setTypeFilter}
        activeFilter={data.activeFilter}
        setActiveFilter={data.setActiveFilter}
        trustedFilter={data.trustedFilter}
        setTrustedFilter={data.setTrustedFilter}
        countryFilter={data.countryFilter}
        setCountryFilter={data.setCountryFilter}
        languageFilter={data.languageFilter}
        setLanguageFilter={data.setLanguageFilter}
        uniqueTypes={data.uniqueTypes}
        uniqueCountries={data.uniqueCountries}
        uniqueLanguages={data.uniqueLanguages}
      />

      <BulkActionBar
        selectedCount={data.selectedIds.size}
        isPending={data.bulkMutation.isPending}
        onAction={handleBulk}
        onClear={data.clearSelection}
      />

      <SourcesTable
        paged={data.paged}
        sortedCount={data.sorted.length}
        page={data.page}
        totalPages={data.totalPages}
        setPage={data.setPage}
        selectedIds={data.selectedIds}
        onToggleSelected={data.toggleSelected}
        onToggleSelectAll={data.toggleSelectAllVisible}
        sortBy={data.sortBy}
        sortOrder={data.sortOrder}
        onSort={data.handleSort}
        isUpdatePending={data.updateMutation.isPending}
        onToggleActive={handleToggleActive}
        onToggleTrust={handleToggleTrust}
        onDelete={handleDelete}
      />

      <AddSourceDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        createMutation={data.createMutation}
      />
      <AttachCatalogDialog
        open={attachOpen}
        onOpenChange={setAttachOpen}
        attachMutation={data.attachMutation}
      />
    </div>
  );
}
