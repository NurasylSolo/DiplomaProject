# Parser Failures Runbook

## Symptoms
- `crawl_source` jobs fail repeatedly for same domains.
- `source_catalog_health.error_rate` exceeds threshold.

## Triage
1. Check extraction mode: `rss_api`, `html`, `sitemap`.
2. Validate robots policy and status codes (403/429 patterns).
3. Inspect raw HTML snapshot for template drift.

## Fix pattern
- Add/adjust extraction template selectors.
- Keep readability fallback enabled.
- Re-enable source only after 3 successful probes.

