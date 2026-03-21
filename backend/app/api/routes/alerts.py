from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.alerts import AlertRuleCreate, AlertRuleUpdate
from app.services import alerts_service
from app.services.project_service import get_project

router = APIRouter()


@router.get("/projects/{project_id}/alerts/rules")
async def list_alert_rules(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    await alerts_service.ensure_default_rules(db, project_id)
    rules = await alerts_service.list_rules(db, project_id)
    return [
        {
            "id": r.id,
            "name": r.name,
            "rule_type": r.rule_type,
            "threshold": r.threshold,
            "window_minutes": r.window_minutes,
            "channels": r.channels or [],
            "config": r.config,
            "active": r.active,
            "created_at": r.created_at.isoformat() if r.created_at else "",
            "updated_at": r.updated_at.isoformat() if r.updated_at else "",
        }
        for r in rules
    ]


@router.post("/projects/{project_id}/alerts/rules")
async def create_alert_rule(
    project_id: str,
    payload: AlertRuleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    rule = await alerts_service.create_rule(db, project_id, payload.model_dump())
    return {
        "id": rule.id,
        "name": rule.name,
        "rule_type": rule.rule_type,
        "threshold": rule.threshold,
        "window_minutes": rule.window_minutes,
        "channels": rule.channels or [],
        "config": rule.config,
        "active": rule.active,
    }


@router.patch("/projects/{project_id}/alerts/rules/{rule_id}")
async def update_alert_rule(
    project_id: str,
    rule_id: str,
    payload: AlertRuleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    rule = await alerts_service.update_rule(db, project_id, rule_id, payload.model_dump(exclude_unset=True))
    if not rule:
        return {"ok": False}
    return {"ok": True}


@router.get("/projects/{project_id}/alerts/events")
async def list_alert_events(
    project_id: str,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    events = await alerts_service.list_events(db, project_id, min(max(limit, 1), 200))
    return [
        {
            "id": e.id,
            "type": e.event_type,
            "title": e.title,
            "description": e.description,
            "severity": e.severity,
            "unread": e.unread,
            "project_id": e.project_id,
            "payload": e.payload or {},
            "created_at": e.created_at.isoformat() if e.created_at else "",
        }
        for e in events
    ]


@router.post("/projects/{project_id}/alerts/events/{event_id}/read")
async def mark_alert_read(
    project_id: str,
    event_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    ok = await alerts_service.mark_event_read(db, project_id, event_id)
    return {"ok": ok}

