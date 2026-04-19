from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.analytics import ComparisonRequest
from app.services import analytics_service, emotion_service
from app.services.project_service import get_project

router = APIRouter()


@router.get("/projects/{project_id}/analytics/geo")
async def geo_data(
    project_id: str,
    date_from: str | None = None,
    date_to: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    return await analytics_service.get_geo_data(
        db, project_id, date_from=date_from, date_to=date_to
    )


@router.get("/projects/{project_id}/analytics/hot-hours")
async def hot_hours(
    project_id: str,
    timezone: str = Query("UTC", description="IANA timezone, e.g. Asia/Almaty"),
    date_from: str | None = None,
    date_to: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Per-(day-of-week, hour) heatmap data with reach + sentiment,
    bucketed in the requested IANA timezone (defaults to UTC)."""
    await get_project(db, project_id, current_user.id)
    return await analytics_service.get_hot_hours(
        db,
        project_id,
        timezone=timezone,
        date_from=date_from,
        date_to=date_to,
    )


@router.get("/projects/{project_id}/analytics/emotions")
async def emotions(
    project_id: str,
    date_from: str | None = None,
    date_to: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Aggregated 8-emotion (Plutchik) distribution for the project,
    optionally constrained by ``date_from`` / ``date_to``.

    Returns averages, daily timeline and top mentions per emotion in a
    single payload — see ``emotion_service.aggregate_emotions``.
    """
    await get_project(db, project_id, current_user.id)
    return await emotion_service.aggregate_emotions(
        db, project_id, date_from=date_from, date_to=date_to
    )


@router.post("/projects/{project_id}/emotions/backfill")
async def backfill_emotions(
    project_id: str,
    limit: int | None = Query(None, ge=1, le=10_000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Re-classify mentions whose ``mention.emotions`` is empty / NULL /
    legacy rule-based zeros. Trigger from the UI; the work is done
    inline so the user sees immediate progress in the toast.

    ``limit`` lets the operator dry-run on a small slice before
    committing tokens to the entire backlog.
    """
    await get_project(db, project_id, current_user.id)
    return await emotion_service.backfill_project(db, project_id, limit=limit)


@router.get("/projects/{project_id}/analytics/topics")
async def topics(
    project_id: str,
    date_from: str | None = None,
    date_to: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    return await analytics_service.get_topics_data(
        db, project_id, date_from=date_from, date_to=date_to
    )


@router.get("/projects/{project_id}/analytics/sources")
async def sources_breakdown(
    project_id: str,
    date_from: str | None = None,
    date_to: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    return await analytics_service.get_sources_breakdown(
        db, project_id, date_from=date_from, date_to=date_to, limit=limit
    )


@router.get("/projects/{project_id}/analytics/keywords")
async def keywords(
    project_id: str,
    date_from: str | None = None,
    date_to: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    return await analytics_service.get_keywords(
        db, project_id, date_from=date_from, date_to=date_to, limit=limit
    )


@router.get("/projects/{project_id}/analytics/top-links")
async def top_links(
    project_id: str,
    date_from: str | None = None,
    date_to: str | None = None,
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    return await analytics_service.get_top_links(
        db, project_id, date_from=date_from, date_to=date_to, limit=limit
    )


@router.get("/projects/{project_id}/analytics/languages")
async def languages_breakdown(
    project_id: str,
    date_from: str | None = None,
    date_to: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    return await analytics_service.get_languages_breakdown(
        db, project_id, date_from=date_from, date_to=date_to
    )


@router.get("/projects/{project_id}/analytics/time-series")
async def time_series(
    project_id: str,
    days: int = Query(30, ge=1, le=365),
    date_from: str | None = None,
    date_to: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    return await analytics_service.get_time_series(
        db, project_id, days=days, date_from=date_from, date_to=date_to
    )


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

    # Security: only let the user compare projects they actually own.
    # Silently drop foreign IDs instead of 403'ing so the UI stays useful
    # if someone navigates with a stale URL.
    from app.models.project import Project as _Project
    from sqlalchemy import select as _select

    owned_ids: set[str] = set()
    if data.item_ids:
        rows = (
            await db.execute(
                _select(_Project.id).where(
                    _Project.id.in_(data.item_ids),
                    _Project.owner_id == current_user.id,
                )
            )
        ).all()
        owned_ids = {row.id for row in rows}

    safe_ids = [i for i in data.item_ids if i in owned_ids]
    if not safe_ids:
        # Always include the source project at minimum so the response is non-empty.
        safe_ids = [project_id]

    return await analytics_service.get_comparison(
        db, project_id, data.type, safe_ids, data.date_from, data.date_to
    )


@router.get("/projects/{project_id}/compare")
async def compare_get(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    return {"type": "projects", "items": [], "metrics": []}
