"use client";

import Link from "next/link";
import { Download, ExternalLink, FileText, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "@/hooks";
import type { AIReportResponse } from "@/lib/api/services/ai";
import type { Mention } from "@/types";
import { normalizeMentionUrl, openMentionUrl } from "../utils/format";

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  report: AIReportResponse | null;
  projectId: string;
  mentionsById: Map<string, Mention>;
  onDownload: () => void;
}

export function ReportDialog({
  open,
  onOpenChange,
  report,
  projectId,
  mentionsById,
  onDownload,
}: ReportDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {t("assistant.report.title")}
          </DialogTitle>
          <DialogDescription>
            {t("assistant.report.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          {!report ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <ReportView
              report={report}
              projectId={projectId}
              mentionsById={mentionsById}
            />
          )}
        </div>
        {report && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.close")}
            </Button>
            <Button onClick={onDownload}>
              <Download className="h-4 w-4 mr-2" />
              {t("assistant.report.download")}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ReportView({
  report: r,
  projectId,
  mentionsById,
}: {
  report: AIReportResponse;
  projectId: string;
  mentionsById: Map<string, Mention>;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-5 text-sm">
      {r.executive_summary && (
        <Section title={t("assistant.report.sections.executive")}>
          <p className="text-muted-foreground leading-relaxed">
            {r.executive_summary}
          </p>
        </Section>
      )}

      {r.sentiment_overview && (
        <Section title={t("assistant.report.sections.sentiment")}>
          <p className="text-muted-foreground leading-relaxed">
            {r.sentiment_overview}
          </p>
        </Section>
      )}

      {Array.isArray(r.key_findings) && r.key_findings.length > 0 && (
        <Section title={t("assistant.report.sections.findings")}>
          <div className="space-y-2">
            {r.key_findings.map((f, i) => (
              <div
                key={i}
                className="rounded-lg border border-border/50 p-3 bg-muted/30"
              >
                <p className="font-medium">{f.title}</p>
                <p className="text-muted-foreground mt-1">{f.detail}</p>
                {Array.isArray(f.mention_ids) && f.mention_ids.length > 0 && (
                  <div className="flex flex-col gap-1 mt-2">
                    {f.mention_ids.slice(0, 5).map((id) => (
                      <FindingMentionLink
                        key={id}
                        id={id}
                        projectId={projectId}
                        mentionsById={mentionsById}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {Array.isArray(r.top_sources) && r.top_sources.length > 0 && (
        <Section title={t("assistant.report.sections.sources")}>
          <ul className="space-y-1">
            {r.top_sources.map((s, i) => (
              <li key={i} className="flex items-center justify-between">
                <span className="font-medium">{s.name}</span>
                <Badge variant="secondary">{s.mentions}</Badge>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {Array.isArray(r.risks) && r.risks.length > 0 && (
        <Section
          title={t("assistant.report.sections.risks")}
          titleClass="text-red-500"
        >
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            {r.risks.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </Section>
      )}

      {Array.isArray(r.opportunities) && r.opportunities.length > 0 && (
        <Section
          title={t("assistant.report.sections.opportunities")}
          titleClass="text-green-500"
        >
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            {r.opportunities.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </Section>
      )}

      {Array.isArray(r.recommendations) && r.recommendations.length > 0 && (
        <Section title={t("assistant.report.sections.recommendations")}>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            {r.recommendations.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </Section>
      )}

      {r.raw && (
        <p className="text-xs text-muted-foreground">
          (Raw JSON could not be parsed; showing executive summary only.)
        </p>
      )}
    </div>
  );
}

function Section({
  title,
  titleClass,
  children,
}: {
  title: string;
  titleClass?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3
        className={`font-display font-semibold text-base mb-2 ${titleClass ?? ""}`}
      >
        {title}
      </h3>
      {children}
    </section>
  );
}

function FindingMentionLink({
  id,
  projectId,
  mentionsById,
}: {
  id: string;
  projectId: string;
  mentionsById: Map<string, Mention>;
}) {
  const m = mentionsById.get(id);
  const safeUrl = m ? normalizeMentionUrl(m.url) : null;

  if (m && safeUrl) {
    return (
      <a
        href={safeUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => {
          e.stopPropagation();
          if (e.defaultPrevented) {
            e.preventDefault();
            openMentionUrl(safeUrl);
          }
        }}
        onAuxClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-1.5 text-[11px] text-primary hover:underline cursor-pointer"
      >
        <ExternalLink className="h-3 w-3" />
        <span className="line-clamp-1">{m.title}</span>
      </a>
    );
  }
  // Fall back to an in-app link to the highlighted mention.
  return (
    <Link
      href={`/projects/${projectId}/mentions?highlight=${id}`}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded bg-primary/10 text-primary hover:bg-primary/20 w-fit"
    >
      m:{id.slice(0, 6)}
    </Link>
  );
}
