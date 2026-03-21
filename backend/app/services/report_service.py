import io
import uuid
from datetime import datetime, timezone
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.report import Report, EmailReportSchedule
from app.models.mention import Mention
from app.core.exceptions import NotFoundError


async def create_report(
    db: AsyncSession,
    project_id: str,
    report_type: str,
    name: str = "Report",
    config: dict | None = None,
) -> Report:
    report = Report(
        project_id=project_id,
        name=name,
        type=report_type,
        config=config,
        status="processing",
    )
    db.add(report)
    await db.flush()

    report.status = "completed"
    report.completed_at = datetime.now(timezone.utc)
    report.file_url = f"/api/v1/projects/{project_id}/reports/{report.id}/download"
    await db.flush()
    await db.refresh(report)

    return report


async def get_report_file(
    db: AsyncSession, project_id: str, report_id: str
) -> tuple[bytes, str, str]:
    result = await db.execute(
        select(Report).where(Report.id == report_id, Report.project_id == project_id)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise NotFoundError("Report not found")

    mentions_q = await db.execute(
        select(Mention)
        .where(Mention.project_id == project_id)
        .order_by(Mention.published_at.desc())
        .limit(100)
    )
    mentions = mentions_q.scalars().all()

    if report.type == "excel":
        content, content_type, filename = await _generate_excel(report, mentions)
    else:
        content, content_type, filename = await _generate_pdf(report, mentions)

    return content, content_type, filename


async def _generate_excel(report: Report, mentions: list) -> tuple[bytes, str, str]:
    from openpyxl import Workbook

    wb = Workbook()
    ws = wb.active
    ws.title = "Mentions"

    headers = ["Title", "Source", "Sentiment", "Reach", "Date", "Country", "Language", "URL"]
    ws.append(headers)

    for m in mentions:
        ws.append([
            m.title,
            m.source.name if m.source else "",
            m.sentiment_label,
            m.reach,
            m.published_at.strftime("%Y-%m-%d %H:%M") if m.published_at else "",
            m.country,
            m.language,
            m.url,
        ])

    for col in ws.columns:
        max_length = max(len(str(cell.value or "")) for cell in col)
        ws.column_dimensions[col[0].column_letter].width = min(max_length + 2, 50)

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    return buffer.getvalue(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", f"{report.name}.xlsx"


async def _generate_pdf(report: Report, mentions: list) -> tuple[bytes, str, str]:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()
    elements = []

    elements.append(Paragraph(f"Report: {report.name}", styles["Title"]))
    elements.append(Spacer(1, 20))
    elements.append(Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}", styles["Normal"]))
    elements.append(Spacer(1, 20))

    data = [["Title", "Sentiment", "Reach", "Date"]]
    for m in mentions[:50]:
        data.append([
            m.title[:50],
            m.sentiment_label,
            str(m.reach),
            m.published_at.strftime("%Y-%m-%d") if m.published_at else "",
        ])

    if len(data) > 1:
        table = Table(data, colWidths=[200, 80, 60, 80])
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0d9488")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0fdfa")]),
        ]))
        elements.append(table)

    doc.build(elements)
    buffer.seek(0)

    return buffer.getvalue(), "application/pdf", f"{report.name}.pdf"


async def create_email_schedule(
    db: AsyncSession, project_id: str, data: dict
) -> EmailReportSchedule:
    schedule = EmailReportSchedule(project_id=project_id, **data)
    db.add(schedule)
    await db.flush()
    await db.refresh(schedule)
    return schedule


async def get_email_schedules(db: AsyncSession, project_id: str) -> list:
    result = await db.execute(
        select(EmailReportSchedule).where(EmailReportSchedule.project_id == project_id)
    )
    return list(result.scalars().all())


async def update_email_schedule(
    db: AsyncSession, project_id: str, schedule_id: str, data: dict
) -> EmailReportSchedule:
    result = await db.execute(
        select(EmailReportSchedule).where(
            EmailReportSchedule.project_id == project_id,
            EmailReportSchedule.id == schedule_id,
        )
    )
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise NotFoundError("Email schedule not found")
    for key, value in data.items():
        if value is not None and hasattr(schedule, key):
            setattr(schedule, key, value)
    await db.flush()
    await db.refresh(schedule)
    return schedule


async def delete_email_schedule(db: AsyncSession, project_id: str, schedule_id: str) -> None:
    result = await db.execute(
        select(EmailReportSchedule).where(
            EmailReportSchedule.project_id == project_id,
            EmailReportSchedule.id == schedule_id,
        )
    )
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise NotFoundError("Email schedule not found")
    await db.delete(schedule)


async def send_email_schedule_now(db: AsyncSession, project_id: str, schedule_id: str) -> dict:
    result = await db.execute(
        select(EmailReportSchedule).where(
            EmailReportSchedule.project_id == project_id,
            EmailReportSchedule.id == schedule_id,
        )
    )
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise NotFoundError("Email schedule not found")
    # MVP: generate a PDF report and mark schedule send timestamps.
    report = await create_report(
        db=db,
        project_id=project_id,
        report_type="pdf",
        name=f"Scheduled report {schedule.frequency}",
        config=schedule.config or {},
    )
    now = datetime.now(timezone.utc)
    schedule.last_sent_at = now
    await db.flush()
    return {
        "schedule_id": schedule.id,
        "report_id": report.id,
        "last_sent_at": now.isoformat(),
    }
