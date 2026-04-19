from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database import get_db
from app.models.user import User
from app.services import influencer_service
from app.services.project_service import get_project

router = APIRouter()


@router.get("/projects/{project_id}/influencers")
async def list_influencers(
    project_id: str,
    sort_by: str = Query("influence_score"),
    sort_order: str = Query("desc"),
    platform: str | None = None,
    search: str | None = None,
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List the project's "voices" (top sources by mentions/reach)
    computed dynamically from the mentions table.
    """
    await get_project(db, project_id, current_user.id)
    return await influencer_service.get_influencers(
        db,
        project_id,
        sort_by=sort_by,
        sort_order=sort_order,
        platform=platform,
        search=search,
        limit=limit,
    )


@router.get("/projects/{project_id}/influencers/{influencer_id}/mentions")
async def list_influencer_mentions(
    project_id: str,
    influencer_id: str,
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Top recent mentions authored by / pulled from a single source —
    drives the detail dialog on the influencers page.
    """
    await get_project(db, project_id, current_user.id)
    return await influencer_service.get_influencer_mentions(
        db, project_id, influencer_id, limit=limit
    )
