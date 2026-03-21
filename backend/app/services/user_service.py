from datetime import datetime, timezone
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.models.refresh_token import RefreshToken
from app.core.security import verify_password, hash_password
from app.core.exceptions import BadRequestError


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
