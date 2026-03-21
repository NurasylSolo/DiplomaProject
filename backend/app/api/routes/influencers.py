from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.services import influencer_service
from app.services.project_service import get_project

router = APIRouter()


@router.get("/projects/{project_id}/influencers")
async def list_influencers(
    project_id: str,
    sort_by: str = "influence_score",
    sort_order: str = "desc",
    platform: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    influencers = await influencer_service.get_influencers(
        db, project_id, sort_by=sort_by, sort_order=sort_order, platform=platform
    )
    return [
        {
            "id": i.id,
            "project_id": i.project_id,
            "handle": i.handle,
            "platform": i.platform,
            "display_name": i.display_name,
            "avatar": i.avatar,
            "followers": i.followers,
            "avg_engagement": i.avg_engagement,
            "influence_score": i.influence_score,
            "mentions_count": i.mentions_count,
            "reach": i.reach,
            "share_of_voice": i.share_of_voice,
            "sentiment_distribution": i.sentiment_distribution,
            "last_seen": i.last_seen.isoformat() if i.last_seen else None,
        }
        for i in influencers
    ]
