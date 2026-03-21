from __future__ import annotations

import csv
from datetime import datetime, timezone
from io import StringIO
from typing import Any
from urllib.parse import urlparse

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.source import Source
from app.models.source_catalog import SourceCatalog, SourceCatalogHealth, SourceCatalogPolicy


def _normalize_source_type(source_type: str | None) -> str:
    value = (source_type or "").strip().lower()
    if value in {"rss", "news", "blogs", "websites", "podcasts", "videos", "other"}:
        return "rss"
    if value in {"api", "json_api", "twitter", "facebook", "instagram", "linkedin", "youtube", "telegram", "tiktok"}:
        return "api"
    if value in {"html", "crawler"}:
        return "html"
    return "rss"


def _extract_domain(url_or_domain: str) -> str:
    raw = (url_or_domain or "").strip().lower()
    if not raw:
        return ""
    if "://" not in raw:
        raw = f"https://{raw}"
    parsed = urlparse(raw)
    return parsed.netloc.lower().replace("www.", "").strip()


def _base_url(url_or_domain: str) -> str:
    raw = (url_or_domain or "").strip()
    if not raw:
        return ""
    if "://" in raw:
        return raw.rstrip("/")
    return f"https://{raw}".rstrip("/")


def _coerce_tags(value: Any) -> list[str] | None:
    if value is None:
        return None
    if isinstance(value, list):
        tags = [str(x).strip() for x in value if str(x).strip()]
        return tags or None
    text = str(value).strip()
    if not text:
        return None
    tags = [x.strip() for x in text.split(",") if x.strip()]
    return tags or None


def _coerce_bool(value: Any, default: bool = True) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    text = str(value).strip().lower()
    if text in {"1", "true", "yes", "y", "on"}:
        return True
    if text in {"0", "false", "no", "n", "off"}:
        return False
    return default


def _normalize_language(value: Any) -> str | None:
    text = str(value or "").strip().lower()
    if not text:
        return None
    # Support csv format like "English, Russian"
    first = text.split(",")[0].strip()
    aliases = {
        "english": "en",
        "en": "en",
        "russian": "ru",
        "ru": "ru",
        "kazakh": "kz",
        "kz": "kz",
        "kk": "kz",
    }
    return aliases.get(first, first[:2] if len(first) >= 2 else None)


def _infer_source_type(url: str, explicit: Any) -> str:
    if explicit is not None and str(explicit).strip():
        return _normalize_source_type(str(explicit))
    low = (url or "").lower()
    if any(token in low for token in ["/rss", "/feed", ".xml", "atom"]):
        return "rss"
    if any(token in low for token in ["/api", "json"]):
        return "api"
    return "html"


def _to_health_dict(catalog: SourceCatalog, health: SourceCatalogHealth) -> dict:
    return {
        "domain": catalog.domain,
        "base_url": catalog.base_url,
        "language": catalog.language,
        "country": catalog.country,
        "source_type": catalog.source_type,
        "active": catalog.active,
        "trust_score": catalog.trust_score,
        "robots_policy": catalog.robots_policy,
        "crawl_priority": catalog.crawl_priority,
        "tags": catalog.tags,
        "uptime_fetch": round(health.uptime_fetch, 4),
        "error_rate": round(health.error_rate, 4),
        "avg_latency": round(health.avg_latency, 2),
        "block_rate": round(health.block_rate, 4),
        "total_fetches": health.total_fetches,
        "success_fetches": health.success_fetches,
        "error_fetches": health.error_fetches,
        "blocked_fetches": health.blocked_fetches,
        "consecutive_errors": health.consecutive_errors,
        "auto_disabled_at": health.auto_disabled_at.isoformat() if health.auto_disabled_at else None,
        "auto_disabled_reason": health.auto_disabled_reason,
        "last_status_code": health.last_status_code,
        "last_error": health.last_error,
        "last_checked_at": health.last_checked_at.isoformat() if health.last_checked_at else None,
    }


def _rows_from_csv(csv_payload: str) -> list[dict]:
    reader = csv.DictReader(StringIO(csv_payload))
    rows: list[dict] = []
    for row in reader:
        rows.append({k: v for k, v in row.items()})
    return rows


def _default_policy(catalog_id: str) -> SourceCatalogPolicy:
    return SourceCatalogPolicy(source_catalog_id=catalog_id)


def _default_health(catalog_id: str) -> SourceCatalogHealth:
    return SourceCatalogHealth(source_catalog_id=catalog_id)


async def _ensure_health_policy(db: AsyncSession, catalog: SourceCatalog) -> tuple[SourceCatalogHealth, SourceCatalogPolicy]:
    health_result = await db.execute(
        select(SourceCatalogHealth).where(SourceCatalogHealth.source_catalog_id == catalog.id)
    )
    health = health_result.scalar_one_or_none()
    if not health:
        health = _default_health(catalog.id)
        db.add(health)

    policy_result = await db.execute(
        select(SourceCatalogPolicy).where(SourceCatalogPolicy.source_catalog_id == catalog.id)
    )
    policy = policy_result.scalar_one_or_none()
    if not policy:
        policy = _default_policy(catalog.id)
        db.add(policy)
    await db.flush()
    return health, policy


async def import_source_catalog(
    db: AsyncSession,
    items: list[dict] | None = None,
    csv_payload: str | None = None,
) -> dict:
    rows = list(items or [])
    if csv_payload:
        rows.extend(_rows_from_csv(csv_payload))

    created = 0
    updated = 0
    skipped = 0
    errors: list[str] = []

    for idx, row in enumerate(rows):
        try:
            base_url = _base_url(
                str(
                    row.get("base_url")
                    or row.get("url")
                    or row.get("website")
                    or row.get("domain")
                    or ""
                )
            )
            domain = _extract_domain(str(row.get("domain") or base_url))
            if not domain or not base_url:
                skipped += 1
                errors.append(f"row[{idx}] skipped: invalid domain/base_url")
                continue

            result = await db.execute(select(SourceCatalog).where(SourceCatalog.domain == domain))
            existing = result.scalar_one_or_none()
            payload = {
                "domain": domain,
                "base_url": base_url,
                "language": _normalize_language(row.get("language") or row.get("languages")),
                "country": (row.get("country") or None) or None,
                "source_type": _infer_source_type(base_url, row.get("source_type")),
                "trust_score": float(row.get("trust_score") if row.get("trust_score") is not None else 0.65),
                "robots_policy": (row.get("robots_policy") or "unknown"),
                "crawl_priority": int(row.get("crawl_priority") if row.get("crawl_priority") is not None else 100),
                "active": _coerce_bool(row.get("active"), default=True),
                "tags": _coerce_tags(row.get("tags")) or _coerce_tags(row.get("name")) or ["seed"],
            }

            if existing:
                for key, value in payload.items():
                    setattr(existing, key, value)
                await _ensure_health_policy(db, existing)
                updated += 1
            else:
                catalog = SourceCatalog(**payload)
                db.add(catalog)
                await db.flush()
                await _ensure_health_policy(db, catalog)
                created += 1
        except Exception as exc:
            skipped += 1
            errors.append(f"row[{idx}] skipped: {str(exc)[:200]}")

    return {
        "created": created,
        "updated": updated,
        "skipped": skipped,
        "total": len(rows),
        "errors": errors[:200],
    }


async def list_catalog_health(
    db: AsyncSession,
    limit: int = 200,
    active: bool | None = None,
    language: str | None = None,
) -> list[dict]:
    query = (
        select(SourceCatalog, SourceCatalogHealth)
        .join(SourceCatalogHealth, SourceCatalogHealth.source_catalog_id == SourceCatalog.id)
        .order_by(SourceCatalog.crawl_priority.asc(), SourceCatalog.domain.asc())
        .limit(limit)
    )
    if active is not None:
        query = query.where(SourceCatalog.active.is_(active))
    if language:
        query = query.where(SourceCatalog.language == language)
    rows = (await db.execute(query)).all()
    return [_to_health_dict(catalog, health) for catalog, health in rows]


async def get_catalog_health_by_domain(db: AsyncSession, domain: str) -> dict | None:
    norm = _extract_domain(domain)
    row = (
        await db.execute(
            select(SourceCatalog, SourceCatalogHealth)
            .join(SourceCatalogHealth, SourceCatalogHealth.source_catalog_id == SourceCatalog.id)
            .where(SourceCatalog.domain == norm)
        )
    ).first()
    if not row:
        return None
    catalog, health = row
    return _to_health_dict(catalog, health)


async def source_health_summary(db: AsyncSession) -> dict:
    rows = (
        await db.execute(
            select(SourceCatalog, SourceCatalogHealth).join(
                SourceCatalogHealth, SourceCatalogHealth.source_catalog_id == SourceCatalog.id
            )
        )
    ).all()
    total = len(rows)
    active = sum(1 for c, _ in rows if c.active)
    auto_disabled = sum(1 for _, h in rows if h.auto_disabled_at is not None)
    avg_error_rate = round(sum(h.error_rate for _, h in rows) / max(1, total), 4)
    avg_block_rate = round(sum(h.block_rate for _, h in rows) / max(1, total), 4)
    avg_latency = round(sum(h.avg_latency for _, h in rows) / max(1, total), 2)
    return {
        "total_sources": total,
        "active_sources": active,
        "auto_disabled_sources": auto_disabled,
        "avg_error_rate": avg_error_rate,
        "avg_block_rate": avg_block_rate,
        "avg_latency_ms": avg_latency,
    }


async def is_source_allowed(db: AsyncSession, source: Source) -> bool:
    domain = _extract_domain(source.base_url)
    if not domain:
        return True
    result = await db.execute(select(SourceCatalog.active).where(SourceCatalog.domain == domain))
    active = result.scalar_one_or_none()
    if active is None:
        return True
    return bool(active)


async def record_source_fetch_health(
    db: AsyncSession,
    source: Source,
    *,
    success: bool,
    latency_ms: int,
    status_code: int | None = None,
    error: str | None = None,
    blocked: bool = False,
) -> bool:
    domain = _extract_domain(source.base_url)
    if not domain:
        return False

    catalog_result = await db.execute(select(SourceCatalog).where(SourceCatalog.domain == domain))
    catalog = catalog_result.scalar_one_or_none()
    if not catalog:
        catalog = SourceCatalog(
            domain=domain,
            base_url=_base_url(source.base_url),
            language=source.language,
            country=source.country,
            source_type=_normalize_source_type(source.type),
            trust_score=source.trust_score or 0.5,
            robots_policy="unknown",
            crawl_priority=100,
            active=True,
            tags=[source.type] if source.type else None,
        )
        db.add(catalog)
        await db.flush()

    health, policy = await _ensure_health_policy(db, catalog)
    now = datetime.now(timezone.utc)

    prev_total = health.total_fetches
    health.total_fetches += 1
    if success:
        health.success_fetches += 1
        health.consecutive_errors = 0
    else:
        health.error_fetches += 1
        health.consecutive_errors += 1
    if blocked:
        health.blocked_fetches += 1

    if prev_total <= 0:
        health.avg_latency = float(latency_ms)
    else:
        health.avg_latency = ((health.avg_latency * prev_total) + float(latency_ms)) / float(prev_total + 1)

    total = max(1, health.total_fetches)
    health.uptime_fetch = float(health.success_fetches) / float(total)
    health.error_rate = float(health.error_fetches) / float(total)
    health.block_rate = float(health.blocked_fetches) / float(total)
    health.last_status_code = status_code
    health.last_error = (error or None)
    health.last_checked_at = now

    auto_disabled = False
    threshold_ready = health.total_fetches >= policy.min_fetches_before_enforce
    rate_violation = threshold_ready and (
        health.error_rate >= policy.max_error_rate or health.block_rate >= policy.max_block_rate
    )
    burst_violation = health.consecutive_errors >= policy.disable_on_error_burst
    if catalog.active and (rate_violation or burst_violation):
        catalog.active = False
        health.auto_disabled_at = now
        if burst_violation:
            health.auto_disabled_reason = (
                f"Auto-disabled: consecutive_errors={health.consecutive_errors} "
                f"(threshold={policy.disable_on_error_burst})"
            )
        else:
            health.auto_disabled_reason = (
                f"Auto-disabled: error_rate={health.error_rate:.3f}, block_rate={health.block_rate:.3f}, "
                f"thresholds=({policy.max_error_rate:.3f}, {policy.max_block_rate:.3f})"
            )
        auto_disabled = True

    return auto_disabled

