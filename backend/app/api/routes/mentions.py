from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.database import get_db
from app.api.deps import get_current_user
from app.models.mention import Mention
from app.models.user import User
from app.schemas.mention import MentionResponse, BulkActionRequest, SourceBrief
from app.services import mention_service
from app.services.nlp_service import _normalise_emotion_dict
from app.services.project_service import get_project

router = APIRouter()


def _mention_to_dict(m) -> dict:
    d = {
        "id": m.id,
        "projectId": m.project_id,
        "sourceId": m.source_id,
        "url": m.url,
        "title": m.title,
        "body": m.body,
        "snippet": m.snippet,
        "publishedAt": m.published_at.isoformat() if m.published_at else "",
        "ingestedAt": m.ingested_at.isoformat() if m.ingested_at else "",
        "language": m.language,
        "country": m.country,
        "sentimentScore": m.sentiment_score,
        "sentimentLabel": m.sentiment_label,
        "topic": None,
        "topicId": m.topic_id,
        "reach": m.reach,
        "influenceScore": m.influence_score,
        "visited": m.visited,
        "saved": m.saved,
        "summary": m.summary,
        # Always serialise the full 8-key Plutchik dict so the frontend
        # never has to special-case missing emotions for legacy rows.
        "emotions": _normalise_emotion_dict(m.emotions),
        "entities": m.entities,
        "tags": m.tags,
        "clusterId": m.cluster_id,
        "clusterSize": m.cluster_size,
        "primaryDoc": m.primary_doc,
        "keywordScore": m.keyword_score,
        "semanticScore": m.semantic_score,
        "finalRelevanceScore": m.final_relevance_score,
    }
    if m.source:
        d["source"] = {
            "id": m.source.id,
            "name": m.source.name,
            "type": m.source.type,
            "baseUrl": m.source.base_url,
            "icon": m.source.icon,
        }
    else:
        d["source"] = None
    return d


@router.get("/projects/{project_id}/mentions")
async def list_mentions(
    project_id: str,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
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
    # Hot Hours drill-down: caller passes day_of_week (0..6, Sunday=0 to
    # match Postgres `dow`) and hour (0..23) computed in `tz`. Both must
    # be present together — a stray hour without a day is ignored.
    day_of_week: int | None = Query(None, ge=0, le=6),
    hour: int | None = Query(None, ge=0, le=23),
    tz: str | None = None,
    sort_by: str = "published_at",
    sort_order: str = "desc",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)

    result = await mention_service.get_mentions(
        db, project_id, page, per_page,
        date_from=date_from, date_to=date_to,
        sources=sources, sentiment=sentiment,
        search=search, influence_min=influence_min,
        influence_max=influence_max, visited=visited,
        saved=saved, languages=languages,
        countries=countries, topic=topic,
        day_of_week=day_of_week, hour=hour, tz=tz,
        sort_by=sort_by, sort_order=sort_order,
    )

    return {
        "items": [_mention_to_dict(m) for m in result["items"]],
        "total": result["total"],
        "page": result["page"],
        "perPage": result["per_page"],
        "totalPages": result["total_pages"],
    }


@router.get("/projects/{project_id}/mentions/stats")
async def mentions_stats(
    project_id: str,
    date_from: str | None = None,
    date_to: str | None = None,
    sources: str | None = None,
    sentiment: str | None = None,
    search: str | None = None,
    languages: str | None = None,
    countries: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Filter-aware aggregates used by stat cards on Mentions / Analysis pages."""
    await get_project(db, project_id, current_user.id)
    return await mention_service.get_mentions_stats(
        db, project_id,
        date_from=date_from, date_to=date_to,
        sources=sources, sentiment=sentiment,
        search=search, languages=languages, countries=countries,
    )


@router.get("/projects/{project_id}/mentions/by-ids")
async def get_mentions_by_ids(
    project_id: str,
    ids: str = Query(..., description="Comma-separated mention IDs"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Batch fetch of mentions by id list. Used by the AI Assistant chat to
    resolve `[m:abc12345]` citations to real article URLs and titles in a
    single round-trip.

    Foreign or non-existent ids are silently dropped. Result preserves the
    requested order so the UI can render badges in the same order as cited.
    """
    await get_project(db, project_id, current_user.id)
    raw_ids = [x.strip() for x in ids.split(",") if x.strip()]
    if not raw_ids:
        return []
    rows = (
        await db.execute(
            select(Mention)
            .options(joinedload(Mention.source))
            .where(Mention.project_id == project_id, Mention.id.in_(raw_ids))
        )
    ).scalars().all()
    by_id = {m.id: m for m in rows}
    return [_mention_to_dict(by_id[i]) for i in raw_ids if i in by_id]


@router.get("/projects/{project_id}/mentions/{mention_id}")
async def get_mention(
    project_id: str,
    mention_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    mention = await mention_service.get_mention_by_id(db, project_id, mention_id)
    return _mention_to_dict(mention)


@router.post("/projects/{project_id}/mentions/bulk_action")
async def bulk_action(
    project_id: str,
    data: BulkActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    count = await mention_service.bulk_action(
        db, project_id, data.action, data.mention_ids, data.value
    )
    return {"message": f"Action '{data.action}' applied to {count} mentions", "affected": count}


@router.get("/projects/{project_id}/clusters")
async def list_duplicate_clusters(
    project_id: str,
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    clusters = await mention_service.get_duplicate_clusters(db, project_id=project_id, limit=limit)
    return {"items": clusters, "total": len(clusters)}
