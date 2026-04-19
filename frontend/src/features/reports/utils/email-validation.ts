/**
 * Lightweight RFC-compliant-ish email validation. Mirrors what the backend
 * checks in `email_service.send_report_email` (presence of `@` + a dot in
 * the domain part). Good enough for client-side UX — server-side parsers
 * still validate via `email-validator` on auth flows.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  if (!value) return false;
  return EMAIL_RE.test(value.trim());
}
