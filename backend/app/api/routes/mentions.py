from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.mention import MentionResponse, BulkActionRequest, SourceBrief
from app.services import mention_service
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
        "emotions": m.emotions,
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
        sort_by=sort_by, sort_order=sort_order,
    )

    return {
        "items": [_mention_to_dict(m) for m in result["items"]],
        "total": result["total"],
        "page": result["page"],
        "perPage": result["per_page"],
        "totalPages": result["total_pages"],
    }


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
