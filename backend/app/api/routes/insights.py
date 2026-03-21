from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.services import insight_service
from app.services.project_service import get_project

router = APIRouter()


@router.get("/projects/{project_id}/insights")
async def list_insights(
    project_id: str,
    type: str | None = None,
    severity: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    insights = await insight_service.get_insights(db, project_id, type=type, severity=severity)
    return [
        {
            "id": i.id,
            "project_id": i.project_id,
            "type": i.type,
            "title": i.title,
            "description": i.description,
            "metric": i.metric,
            "metric_change": i.metric_change,
            "severity": i.severity,
            "related_mention_ids": i.related_mention_ids,
            "created_at": i.created_at.isoformat() if i.created_at else "",
        }
        for i in insights
    ]
