from __future__ import annotations

from datetime import datetime, timedelta, timezone

import httpx
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.alert import AlertRule, NotificationEvent
from app.models.mention import Mention


DEFAULT_RULES = [
    {
        "name": "Mention spike",
        "rule_type": "mention_spike",
        "threshold": 1.5,
        "window_minutes": 60,
        "channels": ["in_app"],
        "active": True,
    },
    {
        "name": "Negative sentiment spike",
        "rule_type": "negative_spike",
        "threshold": 0.35,
        "window_minutes": 60,
        "channels": ["in_app", "email"],
        "active": True,
    },
]


async def ensure_default_rules(db: AsyncSession, project_id: str) -> None:
    existing = await db.execute(select(func.count(AlertRule.id)).where(AlertRule.project_id == project_id))
    if (existing.scalar() or 0) > 0:
        return
    for item in DEFAULT_RULES:
        db.add(AlertRule(project_id=project_id, **item))
    await db.flush()


async def list_rules(db: AsyncSession, project_id: str) -> list[AlertRule]:
    result = await db.execute(
        select(AlertRule).where(AlertRule.project_id == project_id).order_by(AlertRule.created_at.desc())
    )
    return list(result.scalars().all())


async def create_rule(db: AsyncSession, project_id: str, payload: dict) -> AlertRule:
    rule = AlertRule(project_id=project_id, **payload)
    db.add(rule)
    await db.flush()
    await db.refresh(rule)
    return rule


async def update_rule(db: AsyncSession, project_id: str, rule_id: str, payload: dict) -> AlertRule | None:
    result = await db.execute(
        select(AlertRule).where(AlertRule.project_id == project_id, AlertRule.id == rule_id)
    )
    rule = result.scalar_one_or_none()
    if not rule:
        return None
    for k, v in payload.items():
        if v is not None and hasattr(rule, k):
            setattr(rule, k, v)
    await db.flush()
    await db.refresh(rule)
    return rule


async def list_events(db: AsyncSession, project_id: str, limit: int = 50) -> list[NotificationEvent]:
    result = await db.execute(
        select(NotificationEvent)
        .where(NotificationEvent.project_id == project_id)
        .order_by(NotificationEvent.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def mark_event_read(db: AsyncSession, project_id: str, event_id: str) -> bool:
    result = await db.execute(
        select(NotificationEvent).where(
            NotificationEvent.project_id == project_id, NotificationEvent.id == event_id
        )
    )
    event = result.scalar_one_or_none()
    if not event:
        return False
    event.unread = False
    await db.flush()
    return True


async def evaluate_project_rules(db: AsyncSession, project_id: str) -> list[NotificationEvent]:
    now = datetime.now(timezone.utc)
    rules = await list_rules(db, project_id)
    created: list[NotificationEvent] = []
    for rule in rules:
        if not rule.active:
            continue
        since = now - timedelta(minutes=rule.window_minutes)
        if rule.rule_type == "mention_spike":
            current_q = await db.execute(
                select(func.count(Mention.id)).where(
                    Mention.project_id == project_id, Mention.published_at >= since
                )
            )
            previous_q = await db.execute(
                select(func.count(Mention.id)).where(
                    Mention.project_id == project_id,
                    Mention.published_at >= since - timedelta(minutes=rule.window_minutes),
                    Mention.published_at < since,
                )
            )
            current = current_q.scalar() or 0
            previous = previous_q.scalar() or 0
            baseline = max(previous, 1)
            ratio = current / baseline
            if ratio >= rule.threshold and current >= 5:
                created.append(
                    await _create_event(
                        db,
                        project_id=project_id,
                        rule=rule,
                        title="Mention volume spike detected",
                        description=f"Mentions rose to {current} in the last {rule.window_minutes} minutes.",
                        severity="high" if ratio > (rule.threshold * 2) else "medium",
                        payload={"current_mentions": current, "baseline_mentions": previous, "ratio": round(ratio, 2)},
                    )
                )
        elif rule.rule_type == "negative_spike":
            total_q = await db.execute(
                select(func.count(Mention.id)).where(
                    Mention.project_id == project_id, Mention.published_at >= since
                )
            )
            negative_q = await db.execute(
                select(func.count(Mention.id)).where(
                    Mention.project_id == project_id,
                    Mention.published_at >= since,
                    Mention.sentiment_label == "negative",
                )
            )
            total = total_q.scalar() or 0
            negative = negative_q.scalar() or 0
            share = (negative / total) if total else 0.0
            if total >= 5 and share >= rule.threshold:
                created.append(
                    await _create_event(
                        db,
                        project_id=project_id,
                        rule=rule,
                        title="Negative sentiment spike",
                        description=f"Negative sentiment reached {round(share * 100, 1)}% over the last {rule.window_minutes} minutes.",
                        severity="high" if share >= 0.6 else "medium",
                        payload={"total_mentions": total, "negative_mentions": negative, "negative_share": round(share, 3)},
                    )
                )
    return created


async def _create_event(
    db: AsyncSession,
    project_id: str,
    rule: AlertRule,
    title: str,
    description: str,
    severity: str,
    payload: dict,
) -> NotificationEvent:
    event = NotificationEvent(
        project_id=project_id,
        rule_id=rule.id,
        event_type=rule.rule_type,
        title=title,
        description=description,
        severity=severity,
        payload=payload,
        delivered_channels=[],
    )
    db.add(event)
    await db.flush()
    await _deliver_event(event, rule.channels or [])
    return event


async def _deliver_event(event: NotificationEvent, channels: list[str]) -> None:
    delivered: list[str] = []
    if "webhook" in channels:
        webhook_url = (
            (event.payload or {}).get("webhook_url")
            or (event.payload or {}).get("webhookUrl")
        )
        if webhook_url:
            try:
                async with httpx.AsyncClient(timeout=settings.ALERT_WEBHOOK_TIMEOUT_SECONDS) as client:
                    await client.post(
                        webhook_url,
                        json={
                            "id": event.id,
                            "type": event.event_type,
                            "title": event.title,
                            "description": event.description,
                            "severity": event.severity,
                            "created_at": event.created_at.isoformat() if event.created_at else None,
                            "payload": event.payload or {},
                        },
                    )
                delivered.append("webhook")
            except Exception:
                pass
    # In-app is always available because event is persisted.
    delivered.append("in_app")
    event.delivered_channels = delivered

