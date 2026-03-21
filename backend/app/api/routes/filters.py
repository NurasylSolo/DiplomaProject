from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.filter import FilterCreate, FilterUpdate
from app.schemas.auth import MessageResponse
from app.services import filter_service
from app.services.project_service import get_project

router = APIRouter()


def _filter_to_dict(f) -> dict:
    return {
        "id": f.id,
        "project_id": f.project_id,
        "user_id": f.user_id,
        "name": f.name,
        "filters": f.filters,
        "created_at": f.created_at.isoformat() if f.created_at else "",
    }


@router.get("/projects/{project_id}/filters")
async def list_filters(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    filters = await filter_service.get_filters(db, project_id, current_user.id)
    return [_filter_to_dict(f) for f in filters]


@router.post("/projects/{project_id}/filters")
async def create_filter(
    project_id: str,
    data: FilterCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    f = await filter_service.create_filter(
        db, project_id, current_user.id, data.model_dump()
    )
    return _filter_to_dict(f)


@router.get("/projects/{project_id}/filters/{filter_id}")
async def get_filter(
    project_id: str,
    filter_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    f = await filter_service.get_filter(db, project_id, filter_id, current_user.id)
    return _filter_to_dict(f)


@router.put("/projects/{project_id}/filters/{filter_id}")
async def update_filter(
    project_id: str,
    filter_id: str,
    data: FilterUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    f = await filter_service.update_filter(
        db, project_id, filter_id, current_user.id, data.model_dump(exclude_unset=True)
    )
    return _filter_to_dict(f)


@router.delete("/projects/{project_id}/filters/{filter_id}", response_model=MessageResponse)
async def delete_filter(
    project_id: str,
    filter_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    await filter_service.delete_filter(db, project_id, filter_id, current_user.id)
    return {"message": "Filter deleted successfully"}
