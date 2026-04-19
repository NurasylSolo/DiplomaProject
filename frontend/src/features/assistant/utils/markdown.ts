import type { AIReportResponse } from "@/lib/api/services/ai";

/**
 * Convert a generated AI report response into a Markdown string suitable
 * for download as a .md file. Sections that are missing or empty are
 * silently skipped.
 */
export function renderReportToMarkdown(r: AIReportResponse): string {
  const lines: string[] = [];
  lines.push(`# AI Report`);
  if (r.generated_at) lines.push(`_Generated: ${r.generated_at}_`);
  lines.push("");
  if (r.executive_summary) {
    lines.push(`## Executive Summary`, r.executive_summary, "");
  }
  if (r.sentiment_overview) {
    lines.push(`## Sentiment Overview`, r.sentiment_overview, "");
  }
  if (Array.isArray(r.key_findings) && r.key_findings.length) {
    lines.push(`## Key Findings`);
    r.key_findings.forEach((f) => {
      lines.push(`- **${f.title}** — ${f.detail}`);
      if (Array.isArray(f.mention_ids) && f.mention_ids.length) {
        lines.push(
          `  - sources: ${f.mention_ids.map((id) => `[m:${id}]`).join(" ")}`
        );
      }
    });
    lines.push("");
  }
  if (Array.isArray(r.top_sources) && r.top_sources.length) {
    lines.push(`## Top Sources`);
    r.top_sources.forEach((s) => lines.push(`- ${s.name} — ${s.mentions} mentions`));
    lines.push("");
  }
  if (Array.isArray(r.risks) && r.risks.length) {
    lines.push(`## Risks`);
    r.risks.forEach((x) => lines.push(`- ${x}`));
    lines.push("");
  }
  if (Array.isArray(r.opportunities) && r.opportunities.length) {
    lines.push(`## Opportunities`);
    r.opportunities.forEach((x) => lines.push(`- ${x}`));
    lines.push("");
  }
  if (Array.isArray(r.recommendations) && r.recommendations.length) {
    lines.push(`## Recommendations`);
    r.recommendations.forEach((x) => lines.push(`- ${x}`));
    lines.push("");
  }
  if (r.meta?.model) {
    lines.push(
      `---`,
      `_Model: ${r.meta.model} · tokens: ${r.meta.tokens_used ?? "n/a"}_`
    );
  }
  return lines.join("\n");
}

/** Trigger a browser download of the given markdown content. */
export function downloadMarkdown(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
