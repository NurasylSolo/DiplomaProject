# Kafka Lag Spike Runbook

## Symptoms
- Consumer lag rises faster than drain rate.
- Delayed ingestion jobs and stale dashboard data.

## Immediate actions
1. Verify broker health and topic partitions.
2. Scale worker instances and confirm group rebalancing.
3. Throttle slow sources via `source_catalog_policy.max_requests_per_minute`.

## Recovery
- Prioritize high-value projects by crawl priority.
- Pause heavy HTML stream if RSS/API backlog is critical.
- Backfill lagged windows after queue normalizes.

