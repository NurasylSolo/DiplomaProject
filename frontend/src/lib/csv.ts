/**
 * Tiny zero-dependency CSV serializer used by Analysis "Export CSV".
 * Handles quoting, escaping double quotes, BOM for Excel-friendly UTF-8,
 * and falls back to JSON.stringify for nested objects/arrays.
 */

type CsvCell = string | number | boolean | null | undefined | object;
export type CsvRow = Record<string, CsvCell>;

function serializeCell(value: CsvCell): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }
  const str = String(value);
  // Escape if contains separators, quotes or newlines.
  if (/[",\r\n;]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv(rows: CsvRow[], options?: { columns?: string[] }): string {
  if (!rows || rows.length === 0) return "";

  // Auto-discover columns if not provided, preserving insertion order.
  const cols = options?.columns ?? Array.from(
    rows.reduce<Set<string>>((acc, r) => {
      Object.keys(r).forEach((k) => acc.add(k));
      return acc;
    }, new Set<string>())
  );

  const header = cols.map(serializeCell).join(",");
  const body = rows
    .map((row) => cols.map((c) => serializeCell(row[c])).join(","))
    .join("\r\n");

  return `${header}\r\n${body}`;
}

export function downloadCsv(filename: string, rows: CsvRow[], options?: { columns?: string[] }) {
  const csv = toCsv(rows, options);
  // BOM so Excel opens UTF-8 correctly with Cyrillic / Kazakh characters.
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Allow the download to start before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Build a default analysis filename like
 *   analysis_overview_a1b2c3d4_2026-04-19.csv
 */
export function buildCsvFilename(prefix: string, projectId: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const shortId = (projectId || "project").slice(0, 8);
  return `${prefix}_${shortId}_${today}.csv`;
}
