"""Influencer (top voices / sources) service.

Instead of relying on a denormalised ``influencers`` table that was never
populated by ingestion, we compute the list **dynamically** from the
``sources`` × ``mentions`` join. This guarantees the page always reflects
the current state of the project — every source that has at least one
matching mention shows up as a "voice" with real reach, sentiment mix
and last-seen timestamp.

The result is sorted/filtered/paged in Python after a single grouped SQL
query, which keeps the implementation simple and fast for the typical
"top 50-200 sources per project" workload.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any
from urllib.parse import urlparse

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.mention import Mention
from app.models.source import Source


# ---------------------------------------------------------------------------
# Aggregation helpers
# ---------------------------------------------------------------------------
def _domain_from_url(url: str | None) -> str:
    if not url:
        return ""
    try:
        host = urlparse(url).netloc.lower()
    except Exception:
        return ""
    return host.removeprefix("www.")


def _avatar_for(source: Source, domain: str) -> str:
    """Best-effort favicon URL. We use Google's favicon service so we
    don't depend on the source actually serving a `/favicon.ico`."""
    if source.icon:
        return source.icon
    if not domain:
        return ""
    return f"https://www.google.com/s2/favicons?domain={domain}&sz=64"


def _serialise(
    source: Source,
    *,
    mentions_count: int,
    reach: int,
    positive: int,
    neutral: int,
    negative: int,
    avg_sentiment: float,
    avg_influence: float,
    last_seen: datetime | None,
    total_project_mentions: int,
) -> dict[str, Any]:
    domain = _domain_from_url(source.base_url)
    sov = (
        round((mentions_count / total_project_mentions) * 100, 1)
        if total_project_mentions > 0
        else 0.0
    )
    # 0..100 score combining trust, reach and how aligned the coverage was.
    # Capped/clipped — purely heuristic so the table can sort meaningfully.
    influence_score = round(
        min(
            100.0,
            (
                (source.trust_score or 0.5) * 40
                + min(40.0, (reach or 0) / 10_000)
                + max(0.0, avg_sentiment) * 20
            ),
        ),
        1,
    )
    return {
        "id": source.id,
        "project_id": source.project_id,
        "handle": domain or source.name,
        "platform": (source.type or "news").lower(),
        "display_name": source.name or domain or "—",
        "avatar": _avatar_for(source, domain),
        # Trust score scaled to a "followers"-like figure so the UI can
        # render the same kind of compact number it does for socials.
        "followers": int((source.trust_score or 0.5) * 1_000_000),
        "trust_score": float(source.trust_score or 0.0),
        "country": source.country,
        "language": source.language,
        "base_url": source.base_url,
        "avg_engagement": round(avg_influence, 3),
        "influence_score": influence_score,
        "mentions_count": mentions_count,
        "reach": reach,
        "share_of_voice": sov,
        "avg_sentiment": round(avg_sentiment, 3),
        "sentiment_distribution": {
            "positive": positive,
            "neutral": neutral,
            "negative": negative,
        },
        "last_seen": last_seen.isoformat() if last_seen else None,
    }


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
async def get_influencers(
    db: AsyncSession,
    project_id: str,
    *,
    sort_by: str = "influence_score",
    sort_order: str = "desc",
    platform: str | None = None,
    search: str | None = None,
    limit: int = 100,
) -> list[dict[str, Any]]:
    """Build the influencers list on the fly.

    A "row" is one source that has at least one mention in this project.
    """
    pos = func.sum(case((Mention.sentiment_label == "positive", 1), else_=0))
    neu = func.sum(case((Mention.sentiment_label == "neutral", 1), else_=0))
    neg = func.sum(case((Mention.sentiment_label == "negative", 1), else_=0))

    rows = (
        await db.execute(
            select(
                Source,
                func.count(Mention.id).label("count"),
                func.coalesce(func.sum(Mention.reach), 0).label("reach"),
                pos.label("positive"),
                neu.label("neutral"),
                neg.label("negative"),
                func.coalesce(func.avg(Mention.sentiment_score), 0.0).label(
                    "avg_sentiment"
                ),
                func.coalesce(func.avg(Mention.influence_score), 0.0).label(
                    "avg_influence"
                ),
                func.max(Mention.published_at).label("last_seen"),
            )
            .join(Mention, Mention.source_id == Source.id)
            .where(Source.project_id == project_id)
            .group_by(Source.id)
        )
    ).all()

    total = sum(int(r.count or 0) for r in rows)

    items: list[dict[str, Any]] = []
    for r in rows:
        items.append(
            _serialise(
                r[0],  # Source
                mentions_count=int(r.count or 0),
                reach=int(r.reach or 0),
                positive=int(r.positive or 0),
                neutral=int(r.neutral or 0),
                negative=int(r.negative or 0),
                avg_sentiment=float(r.avg_sentiment or 0.0),
                avg_influence=float(r.avg_influence or 0.0),
                last_seen=r.last_seen,
                total_project_mentions=total,
            )
        )

    # ── filters
    if platform and platform != "all":
        items = [x for x in items if x["platform"] == platform.lower()]
    if search:
        q = search.lower().strip()
        if q:
            items = [
                x
                for x in items
                if q in x["display_name"].lower()
                or q in x["handle"].lower()
                or q in (x["base_url"] or "").lower()
            ]

    # ── sort
    sort_key_map = {
        "influence_score": "influence_score",
        "mentions_count": "mentions_count",
        "reach": "reach",
        "share_of_voice": "share_of_voice",
        "followers": "followers",
        "avg_sentiment": "avg_sentiment",
        "last_seen": "last_seen",
        "name": "display_name",
    }
    key = sort_key_map.get(sort_by, "influence_score")
    reverse = sort_order != "asc"
    items.sort(key=lambda x: (x[key] is None, x[key] or 0), reverse=reverse)

    return items[: max(1, min(int(limit or 100), 500))]


async def get_influencer_mentions(
    db: AsyncSession,
    project_id: str,
    influencer_id: str,
    *,
    limit: int = 10,
) -> list[dict[str, Any]]:
    """Top recent mentions from a given source. Used by the detail dialog."""
    rows = (
        await db.execute(
            select(Mention)
            .options(joinedload(Mention.source))
            .where(
                Mention.project_id == project_id,
                Mention.source_id == influencer_id,
            )
            .order_by(Mention.published_at.desc())
            .limit(max(1, min(int(limit or 10), 50)))
        )
    ).scalars().all()

    return [
        {
            "id": m.id,
            "title": m.title,
            "url": m.url,
            "snippet": m.snippet or (m.body or "")[:240],
            "published_at": m.published_at.isoformat() if m.published_at else None,
            "sentiment_label": m.sentiment_label,
            "sentiment_score": float(m.sentiment_score or 0.0),
            "reach": int(m.reach or 0),
            "language": m.language,
            "country": m.country,
        }
        for m in rows
    ]
