from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.source import (
    SourceCreate,
    SourceUpdate,
    SourceResponse,
    SourceBulkActionRequest,
)
from app.schemas.auth import MessageResponse
from app.services import source_service
from app.services.project_service import get_project

router = APIRouter()


def _source_to_dict(
    s,
    mention_count: int = 0,
    total_reach: int = 0,
    avg_sentiment: float = 0.0,
    last_published_at=None,
) -> dict:
    return {
        "id": s.id,
        "project_id": s.project_id,
        "name": s.name,
        "type": s.type,
        "base_url": s.base_url,
        "active": s.active,
        "trust_score": s.trust_score,
        "country": s.country,
        "language": s.language,
        "icon": s.icon,
        "mention_count": int(mention_count),
        "total_reach": int(total_reach or 0),
        "avg_sentiment": round(float(avg_sentiment or 0.0), 3),
        "last_published_at": last_published_at.isoformat() if last_published_at else None,
        "last_crawled_at": s.last_crawled_at.isoformat() if s.last_crawled_at else None,
        "created_at": s.created_at.isoformat() if s.created_at else "",
    }


@router.get("/projects/{project_id}/sources")
async def list_sources(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    rows = await source_service.get_sources(db, project_id)
    return [
        _source_to_dict(
            s,
            mention_count=mc,
            total_reach=tr,
            avg_sentiment=avg,
            last_published_at=last,
        )
        for (s, mc, tr, avg, last) in rows
    ]


@router.post("/projects/{project_id}/sources/bulk-action", response_model=MessageResponse)
async def bulk_action_sources(
    project_id: str,
    payload: SourceBulkActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    affected = await source_service.bulk_action(
        db, project_id, payload.action, payload.source_ids
    )
    return {"message": f"Action '{payload.action}' applied to {affected} source(s)"}


@router.post("/projects/{project_id}/sources")
async def create_source(
    project_id: str,
    data: SourceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    source = await source_service.create_source(db, project_id, data.model_dump())
    return _source_to_dict(source)


@router.get("/projects/{project_id}/sources/{source_id}")
async def get_source(
    project_id: str,
    source_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    source = await source_service.get_source(db, project_id, source_id)
    return _source_to_dict(source)


@router.put("/projects/{project_id}/sources/{source_id}")
async def update_source(
    project_id: str,
    source_id: str,
    data: SourceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    source = await source_service.update_source(
        db, project_id, source_id, data.model_dump(exclude_unset=True)
    )
    return _source_to_dict(source)


@router.delete("/projects/{project_id}/sources/{source_id}", response_model=MessageResponse)
async def delete_source(
    project_id: str,
    source_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    await source_service.delete_source(db, project_id, source_id)
    return {"message": "Source deleted successfully"}
