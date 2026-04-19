"use client";

import { use } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  PDF_SECTION_PRESETS,
  PdfAdditionalOptions,
  PdfPreviewCard,
  ReportsHeader,
  SectionToggleGrid,
  usePdfConfig,
} from "@/features/reports";
import { useCreatePdfReport, useDownloadReport, useTranslation } from "@/hooks";

interface PDFReportPageProps {
  params: Promise<{ projectId: string }>;
}

export default function PDFReportPage({ params }: PDFReportPageProps) {
  const { projectId } = use(params);
  const { t } = useTranslation();
  const cfg = usePdfConfig();
  const createPdf = useCreatePdfReport(projectId);
  const downloadReport = useDownloadReport(projectId);

  const isGenerating = createPdf.isPending || downloadReport.isPending;

  const handleGenerate = async () => {
    try {
      const report = await createPdf.mutateAsync({
        config: cfg.toRequestConfig(),
      });
      await downloadReport.mutateAsync(report.id);
      toast.success(
        t("reportsPage.pdf.toasts.success", {
          defaultValue: "PDF report downloaded",
        })
      );
    } catch {
      toast.error(
        t("reportsPage.pdf.toasts.error", {
          defaultValue: "Failed to generate PDF report",
        })
      );
    }
  };

  const sectionLabel = (id: string) => {
    const preset = PDF_SECTION_PRESETS.find((p) => p.id === id);
    if (!preset) return id;
    return t(`reportsPage.pdf.sections.${preset.i18nKey}`, {
      defaultValue: preset.i18nKey,
    });
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <ReportsHeader
        icon={FileText}
        title={t("reportsPage.pdf.title")}
        subtitle={t("reportsPage.pdf.subtitle")}
        actions={
          <Button
            className="glow-sm"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("reportsPage.pdf.actions.generating", {
                  defaultValue: "Generating…",
                })}
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                {t("reportsPage.pdf.actions.generate", {
                  defaultValue: "Generate & Download",
                })}
              </>
            )}
          </Button>
        }
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <SectionToggleGrid
            title={t("reportsPage.pdf.sectionsTitle", {
              defaultValue: "Report sections",
            })}
            sections={cfg.sections}
            i18nBase="reportsPage.pdf.sections"
            t={t}
            onToggle={cfg.toggleSection}
          />

          <PdfAdditionalOptions
            language={cfg.language}
            setLanguage={cfg.setLanguage}
            description={cfg.description}
            setDescription={cfg.setDescription}
            accentColor={cfg.accentColor}
            setAccentColor={cfg.setAccentColor}
            t={t}
          />
        </div>

        <PdfPreviewCard
          projectId={projectId}
          accentColor={cfg.accentColor}
          enabledSections={cfg.enabledIds}
          sectionI18nBase="reportsPage.pdf.sections"
          sectionLabel={sectionLabel}
        />
      </div>
    </div>
  );
}
