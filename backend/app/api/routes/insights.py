from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database import get_db
from app.models.user import User
from app.services import insight_service
from app.services.project_service import get_project

router = APIRouter()


def _serialize(i) -> dict:
    return {
        "id": i.id,
        "project_id": i.project_id,
        "type": i.type,
        "title": i.title,
        "description": i.description,
        "metric": i.metric,
        "metric_change": i.metric_change,
        "severity": i.severity,
        "category": getattr(i, "category", "general"),
        "related_mention_ids": i.related_mention_ids,
        "created_at": i.created_at.isoformat() if i.created_at else "",
    }


@router.get("/projects/{project_id}/insights")
async def list_insights(
    project_id: str,
    type: str | None = None,
    severity: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    insights = await insight_service.get_insights(
        db, project_id, type=type, severity=severity
    )
    return [_serialize(i) for i in insights]


@router.post("/projects/{project_id}/insights/generate")
async def generate_insights(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Re-generate AI insights for the project from latest data."""
    await get_project(db, project_id, current_user.id)
    insights = await insight_service.generate_insights_for_project(db, project_id)
    await db.commit()
    return [_serialize(i) for i in insights]


@router.delete("/projects/{project_id}/insights/{insight_id}")
async def dismiss_insight(
    project_id: str,
    insight_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Dismiss (delete) a single insight."""
    await get_project(db, project_id, current_user.id)
    deleted = await insight_service.delete_insight(db, project_id, insight_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Insight not found")
    await db.commit()
    return {"message": "Insight dismissed"}
