"""Insight service.

Generates AI-powered insights from project data (mentions, sentiment, geo,
sources) and stores them in the `insights` table. Falls back to deterministic
rule-based generation when OpenAI is not available.
"""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.insight import Insight
from app.models.mention import Mention
from app.models.source import Source
from sqlalchemy import func


logger = logging.getLogger(__name__)

# Hard ceiling on how long the GPT call may block the ingestion pipeline.
# When OpenAI is rate-limited / unreachable, its SDK retries with exponential
# backoff and can stretch a single call to a minute or more. We don't want
# that to delay the visible "completed" status of an ingestion job, so we
# fail fast and let the caller fall back to deterministic rule-based
# insights — they're already implemented and look identical from the UI.
_INSIGHT_GPT_TIMEOUT_SECONDS = 25.0


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

async def get_insights(
    db: AsyncSession,
    project_id: str,
    type: str | None = None,
    severity: str | None = None,
) -> list[Insight]:
    query = select(Insight).where(Insight.project_id == project_id)
    if type:
        query = query.where(Insight.type == type)
    if severity:
        query = query.where(Insight.severity == severity)
    query = query.order_by(Insight.created_at.desc())
    result = await db.execute(query)
    return list(result.scalars().all())


async def create_insight(
    db: AsyncSession,
    *,
    project_id: str,
    type: str,
    title: str,
    description: str,
    severity: str = "medium",
    category: str = "general",
    metric: float | None = None,
    metric_change: float | None = None,
    related_mention_ids: list[str] | None = None,
) -> Insight:
    insight = Insight(
        project_id=project_id,
        type=type,
        title=title[:500],
        description=description[:2000],
        severity=severity,
        category=category,
        metric=metric,
        metric_change=metric_change,
        related_mention_ids=related_mention_ids,
    )
    db.add(insight)
    await db.flush()
    return insight


async def delete_insight(
    db: AsyncSession, project_id: str, insight_id: str
) -> bool:
    result = await db.execute(
        delete(Insight).where(
            Insight.id == insight_id, Insight.project_id == project_id
        )
    )
    await db.flush()
    return (result.rowcount or 0) > 0


async def clear_insights(db: AsyncSession, project_id: str) -> int:
    result = await db.execute(
        delete(Insight).where(Insight.project_id == project_id)
    )
    await db.flush()
    return result.rowcount or 0


# ---------------------------------------------------------------------------
# Generation
# ---------------------------------------------------------------------------

_GENERATION_SYSTEM_PROMPT = """\
You are a senior media intelligence analyst. Given JSON statistics AND a
list of evidence_mentions for a brand monitoring project, generate 5-8
short, actionable insights for the dashboard.

Return STRICT JSON: a single object with key "insights" containing an array.
Each insight has these exact fields:
- "type": one of "alert" | "trend" | "recommendation" | "opportunity"
- "severity": one of "high" | "medium" | "low"
- "title": <= 80 chars, plain text
- "description": <= 280 chars, plain text, specific numbers preferred
- "metric_change": number (percent change, can be negative) or null
- "category": one of "sentiment" | "reach" | "engagement" | "influencers" | "geo" | "general"
- "related_mention_ids": array of mention id strings (subset of evidence_mentions[].id) — at least 1 if relevant evidence exists

Rules:
- Use the project topic name in titles when natural.
- Mix at least one alert (if any negative signal), one trend, one recommendation.
- Keep language matching the dominant language in evidence_mentions[].title.
- Each insight MUST be supported by 1-3 mention ids from evidence_mentions when possible.
- Do NOT invent mention ids that aren't in the supplied evidence_mentions.
- Do NOT include any commentary outside the JSON object.
"""


_VALID_TYPES = {"alert", "trend", "recommendation", "opportunity"}
_VALID_SEVERITY = {"high", "medium", "low"}
_VALID_CATEGORIES = {"sentiment", "reach", "engagement", "influencers", "geo", "general"}


def _coerce_insight_dict(
    raw: dict[str, Any],
    *,
    valid_mention_ids: set[str] | None = None,
) -> dict[str, Any] | None:
    """Validate and normalize a single AI-generated insight dict."""
    type_ = str(raw.get("type", "")).strip().lower()
    if type_ not in _VALID_TYPES:
        return None
    severity = str(raw.get("severity", "medium")).strip().lower()
    if severity not in _VALID_SEVERITY:
        severity = "medium"
    category = str(raw.get("category", "general")).strip().lower()
    if category not in _VALID_CATEGORIES:
        category = "general"
    title = str(raw.get("title", "")).strip()
    description = str(raw.get("description", "")).strip()
    if not title or not description:
        return None
    metric_change = raw.get("metric_change")
    try:
        metric_change = float(metric_change) if metric_change is not None else None
    except (TypeError, ValueError):
        metric_change = None
    related = raw.get("related_mention_ids") or []
    if not isinstance(related, list):
        related = []
    related_ids: list[str] = []
    for x in related:
        sid = str(x).strip()
        if not sid:
            continue
        if valid_mention_ids is not None and sid not in valid_mention_ids:
            continue
        if sid not in related_ids:
            related_ids.append(sid)
    return {
        "type": type_,
        "severity": severity,
        "category": category,
        "title": title,
        "description": description,
        "metric_change": metric_change,
        "related_mention_ids": related_ids[:5] or None,
    }


async def _collect_project_stats(
    db: AsyncSession, project_id: str
) -> dict[str, Any]:
    """Pull a compact snapshot of project state for the AI prompt.

    In addition to numeric stats, retrieves up to 20 most-relevant mention
    snippets via RAG so the model can ground every insight on real evidence.
    """
    # Imports are local to avoid circular dependency at module-load time.
    from app.services import analytics_service, mention_service, embedding_service

    project = await db.get(__import__("app.models.project", fromlist=["Project"]).Project, project_id)
    project_name = getattr(project, "name", "Project")

    total_mentions = int(
        (await db.execute(
            select(func.count(Mention.id)).where(Mention.project_id == project_id)
        )).scalar() or 0
    )

    stats = await mention_service.get_mentions_stats(db, project_id)
    geo = await analytics_service.get_geo_data(db, project_id)
    try:
        anomalies = await analytics_service.get_anomaly_events(db, project_id, days=30)
    except Exception:
        anomalies = []

    src_rows = (await db.execute(
        select(Source.name, func.count(Mention.id).label("c"))
        .join(Mention, Mention.source_id == Source.id)
        .where(Mention.project_id == project_id)
        .group_by(Source.name)
        .order_by(func.count(Mention.id).desc())
        .limit(5)
    )).all()
    top_sources = [{"name": r.name, "mentions": int(r.c)} for r in src_rows]

    top_countries = [
        {
            "country": g.get("country"),
            "code": g.get("country_code"),
            "mentions": g.get("mentions"),
        }
        for g in (geo or [])[:5]
    ]

    # RAG: pick the most informative mentions for this project so that GPT
    # has real evidence (titles + snippets) it can cite by id.
    evidence_mentions: list[dict] = []
    try:
        query_text = (
            f"important news about {project_name} sentiment trends spikes "
            f"opportunities risks influencers"
        )
        pairs = await embedding_service.search_similar(
            db, project_id, query_text, top_k=20
        )
        evidence_mentions = [
            embedding_service.mention_to_context_dict(m, sim) for m, sim in pairs
        ]
    except Exception as exc:
        logger.warning("RAG retrieval for insights failed: %s", exc)

    return {
        "project_name": project_name,
        "total_mentions": total_mentions,
        "stats": stats,
        "top_sources": top_sources,
        "top_countries": top_countries,
        "anomalies": anomalies[:5],
        "evidence_mentions": evidence_mentions,
    }


def _rule_based_insights(snapshot: dict[str, Any]) -> list[dict[str, Any]]:
    """Deterministic insights when GPT is unavailable.

    Generates 3-5 short insights from raw stats: sentiment, geo leader,
    anomaly spikes, top source, dominant emotion.
    """
    out: list[dict[str, Any]] = []
    name = snapshot.get("project_name") or "Project"
    stats = snapshot.get("stats") or {}
    pos = float(stats.get("positive_percentage") or 0)
    neg = float(stats.get("negative_percentage") or 0)
    total = int(stats.get("total_mentions") or 0)

    if total == 0:
        return [{
            "type": "recommendation",
            "severity": "medium",
            "category": "general",
            "title": f"Start collecting mentions for {name}",
            "description": "No mentions yet. Click Refresh to start ingestion or check your project keywords.",
            "metric_change": None,
        }]

    # Sentiment
    if pos >= 60:
        out.append({
            "type": "trend",
            "severity": "low",
            "category": "sentiment",
            "title": f"Strong positive sentiment for {name}",
            "description": f"{pos:.0f}% of mentions are positive — well above neutral baseline.",
            "metric_change": round(pos - 50, 1),
        })
    elif neg >= 30:
        out.append({
            "type": "alert",
            "severity": "high",
            "category": "sentiment",
            "title": f"High negative sentiment detected",
            "description": f"{neg:.0f}% of mentions about {name} are negative. Review top critical sources.",
            "metric_change": round(neg, 1),
        })
    else:
        out.append({
            "type": "trend",
            "severity": "low",
            "category": "sentiment",
            "title": "Sentiment is mostly neutral",
            "description": f"{pos:.0f}% positive, {neg:.0f}% negative across {total} mentions.",
            "metric_change": None,
        })

    # Top country
    countries = snapshot.get("top_countries") or []
    if countries:
        first = countries[0]
        out.append({
            "type": "trend",
            "severity": "low",
            "category": "geo",
            "title": f"Top region: {first.get('country', 'Unknown')}",
            "description": f"{first.get('mentions', 0)} mentions originate from {first.get('country', 'Unknown')}.",
            "metric_change": None,
        })

    # Top source
    sources = snapshot.get("top_sources") or []
    if sources:
        s = sources[0]
        out.append({
            "type": "opportunity",
            "severity": "medium",
            "category": "reach",
            "title": f"Most active source: {s.get('name', 'Unknown')}",
            "description": f"{s.get('name', 'Unknown')} published {s.get('mentions', 0)} mentions. Consider engaging with this outlet.",
            "metric_change": None,
        })

    # Anomalies
    spikes = [a for a in (snapshot.get("anomalies") or []) if a.get("type") == "spike"]
    if spikes:
        sp = spikes[0]
        out.append({
            "type": "alert",
            "severity": "medium",
            "category": "reach",
            "title": "Mention spike detected",
            "description": f"Unusual activity on {sp.get('date')}: {sp.get('mentions')} mentions (z-score {sp.get('z_score')}).",
            "metric_change": None,
        })

    # Recommendation
    out.append({
        "type": "recommendation",
        "severity": "low",
        "category": "engagement",
        "title": "Generate weekly summary",
        "description": "Open Reports to compile a PDF or schedule an automatic email digest for stakeholders.",
        "metric_change": None,
    })

    return out


async def _generate_with_gpt(snapshot: dict[str, Any]) -> list[dict[str, Any]] | None:
    """Call GPT to generate insights. Returns None on any failure.

    Uses ``AsyncOpenAI`` so the call does NOT block the event loop —
    previously this used the sync ``OpenAI`` client, which froze the
    entire uvicorn/worker process during retries (a 429 burst could
    pause ingestion for a minute or more). Now the call is awaited and
    the outer ``asyncio.wait_for`` in :func:`generate_insights_for_project`
    bounds the total time spent here.

    We also explicitly cap ``max_retries=1`` and ``timeout=15`` on the
    SDK so a transient quota error fails quickly rather than triggering
    the default exponential-backoff loop.
    """
    api_key = (settings.OPENAI_API_KEY or "").strip()
    if not api_key:
        return None

    valid_ids: set[str] = {
        str(m.get("id")) for m in (snapshot.get("evidence_mentions") or []) if m.get("id")
    }

    try:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=api_key, max_retries=1, timeout=15.0)
        payload = json.dumps(snapshot, ensure_ascii=False, default=str)
        insight_model = settings.OPENAI_CHAT_MODEL or "gpt-4o-mini"
        response = await client.chat.completions.create(
            model=insight_model,
            messages=[
                {"role": "system", "content": _GENERATION_SYSTEM_PROMPT},
                {"role": "user", "content": payload[:14000]},
            ],
            temperature=0.3,
            max_tokens=1800,
            response_format={"type": "json_object"},
        )
        content = (response.choices[0].message.content or "").strip()
        parsed = json.loads(content)
        if isinstance(parsed, dict):
            for key in ("insights", "items", "data", "results"):
                if isinstance(parsed.get(key), list):
                    parsed = parsed[key]
                    break
        if not isinstance(parsed, list):
            return None
        out: list[dict[str, Any]] = []
        for raw in parsed:
            if not isinstance(raw, dict):
                continue
            cleaned = _coerce_insight_dict(raw, valid_mention_ids=valid_ids)
            if cleaned:
                out.append(cleaned)
        return out or None
    except Exception as exc:
        logger.warning("GPT insight generation failed: %s", exc)
        return None


async def generate_insights_for_project(
    db: AsyncSession, project_id: str
) -> list[Insight]:
    """Top-level: snapshot project state, ask GPT (or fallback), persist.

    Always replaces existing insights for the project. Returns the freshly
    inserted rows in creation order.
    """
    snapshot = await _collect_project_stats(db, project_id)

    if int(snapshot.get("total_mentions") or 0) < 3:
        # Not enough data yet — don't waste GPT tokens, return placeholder.
        await clear_insights(db, project_id)
        placeholder = await create_insight(
            db,
            project_id=project_id,
            type="recommendation",
            title="Not enough data yet",
            description=(
                "Wait for the first ingestion run to finish (or click Refresh) "
                "to generate AI insights from your project mentions."
            ),
            severity="low",
            category="general",
        )
        return [placeholder]

    # Hard time cap. If GPT (or the network, or asyncpg in _collect_…)
    # takes longer than this, ingestion would visibly stall in "running"
    # state. Falling back to rule-based insights keeps the UX snappy and
    # the user still gets meaningful insights (sentiment trend, top
    # source, anomaly spikes, etc.).
    raw_insights: list[dict[str, Any]] | None = None
    try:
        raw_insights = await asyncio.wait_for(
            _generate_with_gpt(snapshot), timeout=_INSIGHT_GPT_TIMEOUT_SECONDS
        )
    except asyncio.TimeoutError:
        logger.warning(
            "insight generation timed out after %.0fs — using rule-based fallback",
            _INSIGHT_GPT_TIMEOUT_SECONDS,
        )
    if not raw_insights:
        raw_insights = _rule_based_insights(snapshot)

    # Replace previous generation, but keep around for diff is unnecessary —
    # the dashboard always shows the latest snapshot of insights.
    await clear_insights(db, project_id)
    created: list[Insight] = []
    for r in raw_insights[:8]:
        try:
            ins = await create_insight(
                db,
                project_id=project_id,
                type=r["type"],
                title=r["title"],
                description=r["description"],
                severity=r["severity"],
                category=r["category"],
                metric_change=r.get("metric_change"),
                related_mention_ids=r.get("related_mention_ids"),
            )
            created.append(ins)
        except Exception as exc:
            logger.warning("Failed to persist insight: %s", exc)
    return created
