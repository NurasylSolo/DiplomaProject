from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.analytics import ComparisonRequest
from app.services import analytics_service
from app.services.project_service import get_project

router = APIRouter()


@router.get("/projects/{project_id}/analytics/geo")
async def geo_data(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    return await analytics_service.get_geo_data(db, project_id)


@router.get("/projects/{project_id}/analytics/hot-hours")
async def hot_hours(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    return await analytics_service.get_hot_hours(db, project_id)


@router.get("/projects/{project_id}/analytics/emotions")
async def emotions(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    return await analytics_service.get_emotions_data(db, project_id)


@router.get("/projects/{project_id}/analytics/topics")
async def topics(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    return await analytics_service.get_topics_data(db, project_id)


@router.get("/projects/{project_id}/analytics/time-series")
async def time_series(
    project_id: str,
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    return await analytics_service.get_time_series(db, project_id, days)


@router.get("/projects/{project_id}/analytics/events")
async def anomaly_events(
    project_id: str,
    days: int = Query(30, ge=7, le=365),
    z_threshold: float = Query(2.0, ge=1.0, le=5.0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    return await analytics_service.get_anomaly_events(
        db, project_id, days=days, z_threshold=z_threshold
    )


@router.post("/projects/{project_id}/compare")
async def compare(
    project_id: str,
    data: ComparisonRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    return await analytics_service.get_comparison(
        db, project_id, data.type, data.item_ids, data.date_from, data.date_to
    )


@router.get("/projects/{project_id}/compare")
async def compare_get(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    return {"type": "projects", "items": [], "metrics": []}
