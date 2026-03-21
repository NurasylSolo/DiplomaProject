from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.source import SourceCreate, SourceUpdate, SourceResponse
from app.schemas.auth import MessageResponse
from app.services import source_service
from app.services.project_service import get_project

router = APIRouter()


def _source_to_dict(s, mention_count: int = 0) -> dict:
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
    sources = await source_service.get_sources(db, project_id)
    return [_source_to_dict(s, mention_count) for s, mention_count in sources]


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
