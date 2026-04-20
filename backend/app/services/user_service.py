import base64
import io
import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestError
from app.core.security import hash_password, verify_password
from app.models.crawl_job import CrawlJob
from app.models.insight import Insight
from app.models.mention import Mention
from app.models.project import Project
from app.models.refresh_token import RefreshToken
from app.models.report import Report
from app.models.user import User

logger = logging.getLogger(__name__)

# Avatar upload constraints. Anything over ~512KB raw is rejected to keep
# the user.avatar TEXT column compact (after JPEG resize the stored
# base64 dataURL is ~30-50KB).
_AVATAR_MAX_BYTES = 5 * 1024 * 1024  # 5 MB raw upload tolerated
_AVATAR_OUTPUT_SIZE = 256
_AVATAR_ALLOWED_MIMES = {"image/png", "image/jpeg", "image/jpg", "image/webp"}


async def update_user_settings(
    db: AsyncSession, user: User, updates: dict
) -> User:
    for key, value in updates.items():
        if value is not None and hasattr(user, key):
            setattr(user, key, value)
    await db.flush()
    await db.refresh(user)
    return user


async def change_password(
    db: AsyncSession, user: User, current_password: str, new_password: str
) -> None:
    if not verify_password(current_password, user.hashed_password):
        raise BadRequestError("Current password is incorrect")
    user.hashed_password = hash_password(new_password)
    await db.execute(delete(RefreshToken).where(RefreshToken.user_id == user.id))
    await db.flush()


async def list_active_sessions(
    db: AsyncSession, user: User, current_refresh_token: str | None = None
) -> list[dict]:
    result = await db.execute(
        select(RefreshToken)
        .where(RefreshToken.user_id == user.id)
        .order_by(RefreshToken.created_at.desc())
    )
    sessions = result.scalars().all()
    now = datetime.now(timezone.utc)
    items: list[dict] = []
    for session in sessions:
        if session.expires_at < now:
            continue
        items.append(
            {
                "id": session.id,
                "device": session.user_agent or "Unknown device",
                "location": "Unknown location",
                "ip": session.ip_address or "Unknown IP",
                "last_active": (session.last_used_at or session.created_at).isoformat()
                if (session.last_used_at or session.created_at)
                else "",
                "current": bool(current_refresh_token and session.token == current_refresh_token),
            }
        )
    return items


async def revoke_session(db: AsyncSession, user: User, session_id: str) -> None:
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.id == session_id,
            RefreshToken.user_id == user.id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise BadRequestError("Session not found")
    await db.delete(session)


async def revoke_other_sessions(
    db: AsyncSession, user: User, current_refresh_token: str
) -> int:
    result = await db.execute(
        delete(RefreshToken).where(
            RefreshToken.user_id == user.id,
            RefreshToken.token != current_refresh_token,
        )
    )
    return result.rowcount or 0


async def delete_account(db: AsyncSession, user: User, password: str) -> None:
    if not verify_password(password, user.hashed_password):
        raise BadRequestError("Current password is incorrect")
    await db.delete(user)


# ---------------------------------------------------------------------------
# Profile dashboard data — stats + recent activity
# ---------------------------------------------------------------------------
async def get_user_stats(db: AsyncSession, user: User) -> dict[str, int]:
    """Aggregate counters for the /profile dashboard cards.

    All four counts share the same `project_ids` subquery so even the
    largest accounts only do four index-only counts.
    """
    project_ids_subq = (
        select(Project.id).where(Project.owner_id == user.id).subquery()
    )

    projects_count = await db.scalar(
        select(func.count()).select_from(Project).where(Project.owner_id == user.id)
    )
    reports_count = await db.scalar(
        select(func.count())
        .select_from(Report)
        .where(Report.project_id.in_(select(project_ids_subq.c.id)))
    )
    mentions_count = await db.scalar(
        select(func.count())
        .select_from(Mention)
        .where(Mention.project_id.in_(select(project_ids_subq.c.id)))
    )
    insights_count = await db.scalar(
        select(func.count())
        .select_from(Insight)
        .where(Insight.project_id.in_(select(project_ids_subq.c.id)))
    )

    return {
        "projects": int(projects_count or 0),
        "reports_generated": int(reports_count or 0),
        "mentions_analyzed": int(mentions_count or 0),
        "insights_created": int(insights_count or 0),
    }


async def get_user_activity(
    db: AsyncSession, user: User, limit: int = 10
) -> list[dict[str, Any]]:
    """Recent activity feed — merged from projects + reports + crawl_jobs.

    No new tables. We just take the 3*limit most recent rows from each
    source, merge them in-memory and slice. Each item carries a
    `link` so the UI can deep-link straight to the relevant page.
    """
    limit = max(1, min(int(limit or 10), 50))

    # Projects this user owns — straightforward.
    projects_q = (
        select(Project.id, Project.name, Project.created_at)
        .where(Project.owner_id == user.id)
        .order_by(Project.created_at.desc())
        .limit(limit)
    )
    projects_rows = (await db.execute(projects_q)).all()

    # Reports — must JOIN with projects to filter by owner_id.
    reports_q = (
        select(Report.id, Report.project_id, Report.name, Report.type, Report.created_at)
        .join(Project, Project.id == Report.project_id)
        .where(Project.owner_id == user.id)
        .order_by(Report.created_at.desc())
        .limit(limit)
    )
    reports_rows = (await db.execute(reports_q)).all()

    # Crawl jobs — only completed runs are interesting in the activity feed.
    jobs_q = (
        select(
            CrawlJob.id,
            CrawlJob.project_id,
            CrawlJob.job_type,
            CrawlJob.status,
            CrawlJob.items_saved,
            CrawlJob.finished_at,
            CrawlJob.created_at,
        )
        .where(
            CrawlJob.created_by == user.id,
            CrawlJob.status.in_(("completed", "running", "failed")),
        )
        .order_by(CrawlJob.created_at.desc())
        .limit(limit)
    )
    jobs_rows = (await db.execute(jobs_q)).all()

    items: list[dict[str, Any]] = []

    for row in projects_rows:
        ts = row.created_at
        items.append(
            {
                "id": f"project:{row.id}",
                "type": "project_created",
                "title_key": "profile.activity.types.projectCreated",
                "title_params": {"name": row.name},
                "description": row.name,
                "icon_hint": "project",
                "timestamp": ts.isoformat() if ts else "",
                "sort_at": ts,
                "link": f"/projects/{row.id}/mentions",
            }
        )

    for row in reports_rows:
        ts = row.created_at
        report_kind = (row.type or "pdf").lower()
        link = f"/projects/{row.project_id}/reports/{report_kind}"
        items.append(
            {
                "id": f"report:{row.id}",
                "type": "report_generated",
                "title_key": "profile.activity.types.reportGenerated",
                "title_params": {"type": report_kind.upper()},
                "description": row.name or "",
                "icon_hint": "report",
                "timestamp": ts.isoformat() if ts else "",
                "sort_at": ts,
                "link": link,
            }
        )

    for row in jobs_rows:
        ts = row.finished_at or row.created_at
        link = f"/projects/{row.project_id}/mentions"
        if row.status == "completed":
            title_key = "profile.activity.types.mentionsAnalyzed"
            params = {"count": int(row.items_saved or 0)}
            icon = "analyze"
        elif row.status == "failed":
            title_key = "profile.activity.types.crawlFailed"
            params = {}
            icon = "alert"
        else:
            title_key = "profile.activity.types.crawlRunning"
            params = {}
            icon = "running"
        items.append(
            {
                "id": f"job:{row.id}",
                "type": row.status,
                "title_key": title_key,
                "title_params": params,
                "description": (row.job_type or "").replace("_", " "),
                "icon_hint": icon,
                "timestamp": ts.isoformat() if ts else "",
                "sort_at": ts,
                "link": link,
            }
        )

    # Sort by sort_at desc, drop nulls to the bottom.
    items.sort(
        key=lambda it: it["sort_at"] or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )
    # Strip the helper key — the API contract uses ISO `timestamp` only.
    for it in items:
        it.pop("sort_at", None)
    return items[:limit]


# ---------------------------------------------------------------------------
# Avatar upload — Pillow resize → base64 dataURL
# ---------------------------------------------------------------------------
async def upload_avatar(
    db: AsyncSession, user: User, file_bytes: bytes, content_type: str | None
) -> User:
    """Validate, normalise and store the uploaded avatar as a base64 dataURL.

    The image is center-cropped to a square then resized to 256×256 JPEG
    quality 82 — the resulting payload (~30-50 KB) fits comfortably into
    the `users.avatar TEXT` column and renders crisply in every UI place
    that displays it (header, sidebar, profile, settings).
    """
    if not file_bytes:
        raise BadRequestError("Empty file")
    if len(file_bytes) > _AVATAR_MAX_BYTES:
        raise BadRequestError("File too large (max 5 MB)")
    mime = (content_type or "").lower().split(";")[0].strip()
    if mime and mime not in _AVATAR_ALLOWED_MIMES:
        raise BadRequestError("Unsupported image type — use PNG, JPEG or WebP")

    try:
        from PIL import Image, ImageOps  # imported lazily — only needed here
    except Exception as exc:  # pragma: no cover — defensive
        logger.error("Pillow not installed: %s", exc)
        raise BadRequestError("Image processing unavailable on this server")

    try:
        img = Image.open(io.BytesIO(file_bytes))
        # Apply EXIF rotation (phones rotate via metadata, not pixels) so
        # portraits come out the right way up.
        img = ImageOps.exif_transpose(img)
        # Drop alpha channel — JPEG can't carry it.
        if img.mode in ("RGBA", "LA", "P"):
            background = Image.new("RGB", img.size, (255, 255, 255))
            if img.mode == "P":
                img = img.convert("RGBA")
            background.paste(img, mask=img.split()[-1] if img.mode in ("RGBA", "LA") else None)
            img = background
        else:
            img = img.convert("RGB")
        # Center-crop to square then resize.
        img = ImageOps.fit(
            img,
            (_AVATAR_OUTPUT_SIZE, _AVATAR_OUTPUT_SIZE),
            method=Image.Resampling.LANCZOS,
            centering=(0.5, 0.5),
        )
        out = io.BytesIO()
        img.save(out, format="JPEG", quality=82, optimize=True)
        encoded = base64.b64encode(out.getvalue()).decode("ascii")
    except BadRequestError:
        raise
    except Exception as exc:
        logger.warning("Avatar processing failed: %s", exc)
        raise BadRequestError("Could not read image — file may be corrupted")

    user.avatar = f"data:image/jpeg;base64,{encoded}"
    await db.flush()
    await db.refresh(user)
    return user


async def delete_avatar(db: AsyncSession, user: User) -> User:
    user.avatar = None
    await db.flush()
    await db.refresh(user)
    return user
