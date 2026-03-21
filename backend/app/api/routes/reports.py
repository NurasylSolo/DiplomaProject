from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.report import ReportCreateRequest, EmailScheduleCreate, EmailScheduleUpdate
from app.services import report_service
from app.services.project_service import get_project

router = APIRouter()


@router.post("/projects/{project_id}/reports/pdf")
async def create_pdf_report(
    project_id: str,
    data: ReportCreateRequest | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    name = data.name if data else "PDF Report"
    config = data.config.model_dump() if data and data.config else None
    report = await report_service.create_report(db, project_id, "pdf", name, config)
    return {
        "id": report.id,
        "project_id": report.project_id,
        "name": report.name,
        "type": report.type,
        "status": report.status,
        "file_url": report.file_url,
        "created_at": report.created_at.isoformat() if report.created_at else "",
        "completed_at": report.completed_at.isoformat() if report.completed_at else None,
    }


@router.post("/projects/{project_id}/reports/excel")
async def create_excel_report(
    project_id: str,
    data: ReportCreateRequest | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    name = data.name if data else "Excel Report"
    config = data.config.model_dump() if data and data.config else None
    report = await report_service.create_report(db, project_id, "excel", name, config)
    return {
        "id": report.id,
        "project_id": report.project_id,
        "name": report.name,
        "type": report.type,
        "status": report.status,
        "file_url": report.file_url,
        "created_at": report.created_at.isoformat() if report.created_at else "",
        "completed_at": report.completed_at.isoformat() if report.completed_at else None,
    }


@router.get("/projects/{project_id}/reports/{report_id}/download")
async def download_report(
    project_id: str,
    report_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    content, content_type, filename = await report_service.get_report_file(db, project_id, report_id)
    return Response(
        content=content,
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/projects/{project_id}/email_reports")
async def create_email_schedule(
    project_id: str,
    data: EmailScheduleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    schedule = await report_service.create_email_schedule(
        db, project_id, data.model_dump()
    )
    return {
        "id": schedule.id,
        "project_id": schedule.project_id,
        "recipients": schedule.recipients,
        "frequency": schedule.frequency,
        "config": schedule.config,
        "send_time": schedule.send_time,
        "timezone": schedule.timezone,
        "active": schedule.active,
        "created_at": schedule.created_at.isoformat() if schedule.created_at else "",
    }


@router.get("/projects/{project_id}/email_reports")
async def list_email_schedules(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    schedules = await report_service.get_email_schedules(db, project_id)
    return [
        {
            "id": s.id,
            "project_id": s.project_id,
            "recipients": s.recipients,
            "frequency": s.frequency,
            "config": s.config,
            "send_time": s.send_time,
            "timezone": s.timezone,
            "active": s.active,
            "last_sent_at": s.last_sent_at.isoformat() if s.last_sent_at else None,
            "next_send_at": s.next_send_at.isoformat() if s.next_send_at else None,
            "created_at": s.created_at.isoformat() if s.created_at else "",
        }
        for s in schedules
    ]


@router.patch("/projects/{project_id}/email_reports/{schedule_id}")
async def update_email_schedule(
    project_id: str,
    schedule_id: str,
    data: EmailScheduleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    schedule = await report_service.update_email_schedule(
        db, project_id, schedule_id, data.model_dump(exclude_unset=True)
    )
    return {
        "id": schedule.id,
        "active": schedule.active,
        "frequency": schedule.frequency,
        "send_time": schedule.send_time,
        "timezone": schedule.timezone,
        "recipients": schedule.recipients,
        "config": schedule.config,
    }


@router.delete("/projects/{project_id}/email_reports/{schedule_id}")
async def delete_email_schedule(
    project_id: str,
    schedule_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    await report_service.delete_email_schedule(db, project_id, schedule_id)
    return {"ok": True}


@router.post("/projects/{project_id}/email_reports/{schedule_id}/send_now")
async def send_email_schedule_now(
    project_id: str,
    schedule_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    return await report_service.send_email_schedule_now(db, project_id, schedule_id)
