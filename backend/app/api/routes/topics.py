from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.auth import MessageResponse
from app.schemas.topic import (
    TopicCreate,
    TopicUpdate,
    TopicResponse,
    TopicSummaryResponse,
)
from app.services import topic_service
from app.services.project_service import get_project

router = APIRouter()


_EMPTY_SENTIMENT = {"positive": 0, "neutral": 0, "negative": 0}


def _topic_to_dict(t, stats: dict | None = None) -> dict:
    """Serialize a Topic. If ``stats`` is provided (live aggregate from
    ``aggregate_topic_stats``) — use it; otherwise fall back to the
    persisted columns and zeros so the response shape stays stable.
    """
    sentiment = (
        stats.get("sentiment_distribution")
        if stats
        else (t.sentiment_distribution or _EMPTY_SENTIMENT.copy())
    )
    mentions_count = stats.get("mentions_count") if stats else 0
    total_reach = stats.get("total_reach") if stats else 0
    return {
        "id": t.id,
        "project_id": t.project_id,
        "name": t.name,
        "description": t.description,
        "keywords": t.keywords or [],
        "parent_topic_id": t.parent_topic_id,
        "sentiment_distribution": sentiment,
        "mentions_count": mentions_count,
        "total_reach": total_reach,
        "created_at": t.created_at.isoformat() if t.created_at else "",
    }


async def _topic_to_dict_with_live_stats(db, project_id: str, topic) -> dict:
    """Helper for single-topic endpoints (create / update / detail)."""
    stats_map = await topic_service.aggregate_topic_stats(db, project_id)
    return _topic_to_dict(topic, stats_map.get(topic.id))


@router.get("/projects/{project_id}/topics")
async def list_topics(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    topics = await topic_service.list_topics(db, project_id)
    stats_map = await topic_service.aggregate_topic_stats(db, project_id)
    return [_topic_to_dict(t, stats_map.get(t.id)) for t in topics]


@router.post("/projects/{project_id}/topics")
async def create_topic(
    project_id: str,
    data: TopicCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    topic = await topic_service.create_topic(
        db,
        project_id,
        name=data.name,
        description=data.description,
        keywords=data.keywords,
    )
    return await _topic_to_dict_with_live_stats(db, project_id, topic)


@router.patch("/projects/{project_id}/topics/{topic_id}")
async def update_topic(
    project_id: str,
    topic_id: str,
    data: TopicUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    topic = await topic_service.update_topic(
        db,
        project_id,
        topic_id,
        name=data.name,
        description=data.description,
        keywords=data.keywords,
    )
    return await _topic_to_dict_with_live_stats(db, project_id, topic)


@router.delete(
    "/projects/{project_id}/topics/{topic_id}",
    response_model=MessageResponse,
)
async def delete_topic(
    project_id: str,
    topic_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    await topic_service.delete_topic(db, project_id, topic_id)
    return {"message": "Topic deleted"}


@router.post("/projects/{project_id}/topics/auto-discover")
async def auto_discover(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Use GPT to discover 5-10 topics from project mentions, then assign
    every mention to the best-matching topic.
    """
    await get_project(db, project_id, current_user.id)
    topics = await topic_service.auto_discover_topics(db, project_id)
    stats_map = await topic_service.aggregate_topic_stats(db, project_id)
    return {
        "created": len(topics),
        "topics": [_topic_to_dict(t, stats_map.get(t.id)) for t in topics],
    }


@router.post("/projects/{project_id}/topics/reassign-all")
async def reassign_all(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    return await topic_service.reassign_all_mentions(db, project_id)


@router.get("/projects/{project_id}/topics/{topic_id}/mentions")
async def topic_mentions(
    project_id: str,
    topic_id: str,
    limit: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    rows = await topic_service.get_topic_mentions(db, project_id, topic_id, limit=limit)
    return [
        {
            "id": m.id,
            "title": m.title,
            "url": m.url,
            "snippet": m.snippet or (m.body or "")[:200],
            "sentiment_label": m.sentiment_label,
            "sentiment_score": m.sentiment_score,
            "reach": m.reach,
            "language": m.language,
            "country": m.country,
            "published_at": m.published_at.isoformat() if m.published_at else None,
        }
        for m in rows
    ]


@router.post("/projects/{project_id}/topics/{topic_id}/summary")
async def topic_summary(
    project_id: str,
    topic_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    return await topic_service.summarize_topic(db, project_id, topic_id)
