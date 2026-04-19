type Translator = (key: string, options?: Record<string, unknown>) => string;

export function formatTime(d: Date | string | null): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function relativeDate(d: string | Date | null, t: Translator): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return t("assistant.relative.justNow");
  if (min < 60) return t("assistant.relative.minutesAgo", { count: min });
  const hr = Math.floor(min / 60);
  if (hr < 24) return t("assistant.relative.hoursAgo", { count: hr });
  if (hr < 48) return t("assistant.relative.yesterday");
  return date.toLocaleDateString();
}

const CITATION_RE = /\[m:([a-zA-Z0-9-]{6,40})\]/g;

/**
 * Split assistant text into a stream of plain-text and citation segments
 * (e.g. `[m:abc12345]`). Returned tokens are in document order.
 */
export function splitTextWithCitations(
  text: string
): Array<{ type: "text" | "cite"; value: string }> {
  const out: Array<{ type: "text" | "cite"; value: string }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  CITATION_RE.lastIndex = 0;
  while ((match = CITATION_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      out.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    out.push({ type: "cite", value: match[1] });
    lastIndex = CITATION_RE.lastIndex;
  }
  if (lastIndex < text.length) {
    out.push({ type: "text", value: text.slice(lastIndex) });
  }
  return out;
}

/** Pull every `[m:xxxx]` citation id out of the given text. */
export function extractCitationIds(text: string): string[] {
  const out: string[] = [];
  let match: RegExpExecArray | null;
  CITATION_RE.lastIndex = 0;
  while ((match = CITATION_RE.exec(text)) !== null) {
    out.push(match[1]);
  }
  return out;
}

/**
 * Normalise a mention URL coming from the backend so that `<a href>` and
 * `window.open` always treat it as an absolute external URL.
 *
 * - Trims whitespace.
 * - Returns null for empty / placeholder values (so the caller can render a
 *   plain badge instead of a dead link).
 * - Adds `https://` for protocol-relative (`//host/...`) and bare-domain
 *   URLs (`example.com/path`) so the browser doesn't treat them as paths
 *   under the current origin.
 */
export function normalizeMentionUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = String(url).trim();
  if (!trimmed || trimmed === "#" || trimmed === "/") return null;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  // Bare domain like "example.com/news/1" or "www.tass.ru".
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(trimmed)) return `https://${trimmed}`;
  // Anything else (e.g. relative path) we treat as unsafe — caller will skip.
  return null;
}

/**
 * Open a mention URL in a new tab. Centralised so every citation site
 * (chat body, footer list, AI report) goes through the same logic and any
 * future popup-blocker / focus tweaks live in one place.
 */
export function openMentionUrl(url: string | null | undefined): void {
  const safe = normalizeMentionUrl(url);
  if (!safe) return;
  const win = window.open(safe, "_blank", "noopener,noreferrer");
  if (win) win.opener = null;
}
