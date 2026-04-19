"use client";

import { use } from "react";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  ExcelExportTypeCard,
  ExcelSheetsCard,
  ReportsHeader,
  useExcelConfig,
} from "@/features/reports";
import { useCreateExcelReport, useDownloadReport, useTranslation } from "@/hooks";

interface ExcelExportPageProps {
  params: Promise<{ projectId: string }>;
}

export default function ExcelExportPage({ params }: ExcelExportPageProps) {
  const { projectId } = use(params);
  const { t } = useTranslation();
  const cfg = useExcelConfig();
  const createExcel = useCreateExcelReport(projectId);
  const downloadReport = useDownloadReport(projectId);

  const isExporting = createExcel.isPending || downloadReport.isPending;

  const handleExport = async () => {
    try {
      const report = await createExcel.mutateAsync({
        config: cfg.toRequestConfig(),
      });
      await downloadReport.mutateAsync(report.id);
      toast.success(
        t("reportsPage.excel.toasts.success", {
          defaultValue: "Excel report downloaded",
        })
      );
    } catch {
      toast.error(
        t("reportsPage.excel.toasts.error", {
          defaultValue: "Failed to export Excel report",
        })
      );
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <ReportsHeader
        icon={FileSpreadsheet}
        title={t("reportsPage.excel.title")}
        subtitle={t("reportsPage.excel.subtitle")}
        actions={
          <Button
            className="glow-sm"
            onClick={handleExport}
            disabled={isExporting || cfg.enabledIds.length === 0}
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("reportsPage.excel.actions.exporting", {
                  defaultValue: "Exporting…",
                })}
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                {t("reportsPage.excel.actions.export", {
                  defaultValue: "Export to Excel",
                })}
              </>
            )}
          </Button>
        }
      />

      <ExcelExportTypeCard
        value={cfg.exportType}
        onChange={cfg.setExportType}
        t={t}
      />

      <ExcelSheetsCard sheets={cfg.sheets} onToggle={cfg.toggleSheet} t={t} />
    </div>
  );
}
