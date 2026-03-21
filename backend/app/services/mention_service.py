from datetime import datetime, timezone
from sqlalchemy import select, and_, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from app.models.mention import Mention
from app.models.source import Source
from app.utils.pagination import paginate
from app.core.exceptions import NotFoundError


def _parse_date(raw: str) -> datetime:
    raw = raw.strip().replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(raw)
    except ValueError:
        dt = datetime.strptime(raw[:19], "%Y-%m-%dT%H:%M:%S")
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


async def get_mentions(
    db: AsyncSession,
    project_id: str,
    page: int = 1,
    per_page: int = 20,
    date_from: str | None = None,
    date_to: str | None = None,
    sources: str | None = None,
    sentiment: str | None = None,
    search: str | None = None,
    influence_min: float | None = None,
    influence_max: float | None = None,
    visited: bool | None = None,
    saved: bool | None = None,
    languages: str | None = None,
    countries: str | None = None,
    topic: str | None = None,
    sort_by: str = "published_at",
    sort_order: str = "desc",
) -> dict:
    query = select(Mention).options(joinedload(Mention.source)).where(
        Mention.project_id == project_id
    )

    if date_from:
        query = query.where(Mention.published_at >= _parse_date(date_from))
    if date_to:
        query = query.where(Mention.published_at <= _parse_date(date_to))
    if sources:
        source_types = [s.strip() for s in sources.split(",")]
        query = query.join(Source).where(Source.type.in_(source_types))
    if sentiment:
        sentiments = [s.strip() for s in sentiment.split(",")]
        query = query.where(Mention.sentiment_label.in_(sentiments))
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                Mention.title.ilike(search_term),
                Mention.body.ilike(search_term),
            )
        )
    if influence_min is not None:
        query = query.where(Mention.influence_score >= influence_min)
    if influence_max is not None:
        query = query.where(Mention.influence_score <= influence_max)
    if visited is not None:
        query = query.where(Mention.visited == visited)
    if saved is not None:
        query = query.where(Mention.saved == saved)
    if languages:
        langs = [l.strip() for l in languages.split(",")]
        query = query.where(Mention.language.in_(langs))
    if countries:
        ctrs = [c.strip() for c in countries.split(",")]
        query = query.where(Mention.country.in_(ctrs))
    if topic:
        query = query.where(Mention.topic_id == topic)

    sort_column = getattr(Mention, sort_by, Mention.published_at)
    if sort_order == "asc":
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())

    return await paginate(db, query, page, per_page)


async def get_mention_by_id(
    db: AsyncSession, project_id: str, mention_id: str
) -> Mention:
    result = await db.execute(
        select(Mention)
        .options(joinedload(Mention.source))
        .where(Mention.id == mention_id, Mention.project_id == project_id)
    )
    mention = result.scalar_one_or_none()
    if not mention:
        raise NotFoundError("Mention not found")
    return mention


async def bulk_action(
    db: AsyncSession, project_id: str, action: str, mention_ids: list, value=None
) -> int:
    result = await db.execute(
        select(Mention).where(
            Mention.id.in_(mention_ids), Mention.project_id == project_id
        )
    )
    mentions = result.scalars().all()

    for mention in mentions:
        if action == "mark_visited":
            mention.visited = True
        elif action == "mark_unvisited":
            mention.visited = False
        elif action == "save":
            mention.saved = True
        elif action == "unsave":
            mention.saved = False
        elif action == "set_sentiment" and value:
            mention.sentiment_label = value
        elif action == "add_tag" and value:
            if mention.tags is None:
                mention.tags = []
            if value not in mention.tags:
                mention.tags = mention.tags + [value]

    await db.flush()
    return len(mentions)


async def get_duplicate_clusters(db: AsyncSession, project_id: str, limit: int = 100) -> list[dict]:
    rows = (
        await db.execute(
            select(
                Mention.cluster_id,
                func.count(Mention.id).label("cluster_size"),
                func.max(Mention.published_at).label("last_published_at"),
            )
            .where(Mention.project_id == project_id, Mention.cluster_id.isnot(None))
            .group_by(Mention.cluster_id)
            .order_by(func.count(Mention.id).desc())
            .limit(limit)
        )
    ).all()
    return [
        {
            "cluster_id": cluster_id,
            "cluster_size": int(cluster_size or 0),
            "last_published_at": last_published_at.isoformat() if last_published_at else None,
        }
        for cluster_id, cluster_size, last_published_at in rows
    ]
