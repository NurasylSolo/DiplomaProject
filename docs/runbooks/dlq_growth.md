# DLQ Growth Runbook

## Symptoms
- DLQ topic message count increases continuously.
- Ingestion latency and retry counts spike.

## Immediate actions
1. Check Kafka consumer lag and identify failing `task_type`.
2. Sample last 100 DLQ messages and classify by error signature.
3. If source-specific parser failure, disable source in `source_catalog`.
4. Replay only fixed message groups from DLQ to main topic.

## Mitigation
- Raise backoff and open circuit breaker for failing domains.
- Deploy parser hotfix, then replay DLQ in bounded batches.

