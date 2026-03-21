import math
from datetime import datetime, timedelta, timezone
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.models.refresh_token import RefreshToken
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.core.exceptions import BadRequestError, UnauthorizedError, ConflictError
from app.config import settings


async def register_user(
    db: AsyncSession,
    name: str,
    email: str,
    password: str,
    user_agent: str | None = None,
    ip_address: str | None = None,
) -> dict:
    result = await db.execute(select(User).where(User.email == email))
    existing = result.scalar_one_or_none()
    if existing:
        raise ConflictError("User with this email already exists")

    user = User(
        name=name,
        email=email,
        hashed_password=hash_password(password),
    )
    db.add(user)
    await db.flush()

    tokens = await _create_tokens(db, user, user_agent=user_agent, ip_address=ip_address)
    return {"user": user, **tokens}


async def login_user(
    db: AsyncSession,
    email: str,
    password: str,
    remember_me: bool = False,
    user_agent: str | None = None,
    ip_address: str | None = None,
) -> dict:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(password, user.hashed_password):
        raise UnauthorizedError("Invalid email or password")

    refresh_days = 30 if remember_me else settings.REFRESH_TOKEN_EXPIRE_DAYS
    tokens = await _create_tokens(
        db,
        user,
        user_agent=user_agent,
        ip_address=ip_address,
        refresh_expires_days=refresh_days,
    )
    return {"user": user, **tokens}


async def refresh_tokens(
    db: AsyncSession,
    refresh_token_str: str,
    user_agent: str | None = None,
    ip_address: str | None = None,
) -> dict:
    payload = decode_token(refresh_token_str)
    if not payload or payload.get("type") != "refresh":
        raise UnauthorizedError("Invalid refresh token")

    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token == refresh_token_str)
    )
    stored_token = result.scalar_one_or_none()
    if not stored_token:
        raise UnauthorizedError("Refresh token not found")

    if stored_token.expires_at < datetime.now(timezone.utc):
        await db.delete(stored_token)
        raise UnauthorizedError("Refresh token expired")

    result = await db.execute(select(User).where(User.id == stored_token.user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise UnauthorizedError("User not found")

    remaining_seconds = max(
        1,
        int((stored_token.expires_at - datetime.now(timezone.utc)).total_seconds()),
    )
    remaining_days = max(1, int(math.ceil(remaining_seconds / 86400)))
    await db.delete(stored_token)
    tokens = await _create_tokens(
        db,
        user,
        user_agent=user_agent,
        ip_address=ip_address,
        refresh_expires_days=remaining_days,
    )
    return tokens


async def logout_user(db: AsyncSession, refresh_token_str: str) -> None:
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token == refresh_token_str)
    )
    stored = result.scalar_one_or_none()
    if stored:
        await db.delete(stored)


async def _create_tokens(
    db: AsyncSession,
    user: User,
    user_agent: str | None = None,
    ip_address: str | None = None,
    refresh_expires_days: int | None = None,
) -> dict:
    token_data = {"sub": user.id, "email": user.email, "role": user.role}

    access_token = create_access_token(token_data)
    refresh_days = refresh_expires_days or settings.REFRESH_TOKEN_EXPIRE_DAYS
    refresh_token = create_refresh_token(token_data, expires_delta=timedelta(days=refresh_days))

    expires_at = datetime.now(timezone.utc) + timedelta(days=refresh_days)
    db_token = RefreshToken(
        user_id=user.id,
        token=refresh_token,
        expires_at=expires_at,
        user_agent=user_agent[:500] if user_agent else None,
        ip_address=ip_address[:100] if ip_address else None,
        last_used_at=datetime.now(timezone.utc),
    )
    db.add(db_token)

    return {"access_token": access_token, "refresh_token": refresh_token}
