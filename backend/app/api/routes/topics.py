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


def _topic_to_dict(t) -> dict:
    return {
        "id": t.id,
        "project_id": t.project_id,
        "name": t.name,
        "description": t.description,
        "keywords": t.keywords or [],
        "parent_topic_id": t.parent_topic_id,
        "sentiment_distribution": t.sentiment_distribution or {},
        "created_at": t.created_at.isoformat() if t.created_at else "",
    }


@router.get("/projects/{project_id}/topics")
async def list_topics(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    topics = await topic_service.list_topics(db, project_id)
    return [_topic_to_dict(t) for t in topics]


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
    return _topic_to_dict(topic)


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
    return _topic_to_dict(topic)


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
    return {
        "created": len(topics),
        "topics": [_topic_to_dict(t) for t in topics],
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
