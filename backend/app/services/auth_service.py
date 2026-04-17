import logging
import math
import random
from datetime import datetime, timedelta, timezone

import httpx
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.refresh_token import RefreshToken
from app.models.email_verification import EmailVerification
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.core.exceptions import BadRequestError, UnauthorizedError, ConflictError, NotFoundError
from app.config import settings
from app.services.email_service import send_verification_code

logger = logging.getLogger(__name__)

VERIFICATION_CODE_TTL_MINUTES = 10


def _generate_code() -> str:
    return f"{random.randint(0, 999_999):06d}"


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
        email_verified=False,
        auth_provider="email",
    )
    db.add(user)
    await db.flush()

    # Generate and send verification code (does not block on SMTP failures).
    code = _generate_code()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=VERIFICATION_CODE_TTL_MINUTES)
    db.add(EmailVerification(email=email, code=code, expires_at=expires_at))
    await db.flush()
    try:
        await send_verification_code(email, code)
    except Exception as exc:
        logger.warning("send_verification_code failed for %s: %s", email, exc)

    tokens = await _create_tokens(db, user, user_agent=user_agent, ip_address=ip_address)
    return {"user": user, **tokens}


async def verify_email(db: AsyncSession, email: str, code: str) -> dict:
    """Confirm a 6-digit code, mark the user as verified, drop used codes."""
    result = await db.execute(
        select(EmailVerification)
        .where(EmailVerification.email == email)
        .order_by(EmailVerification.created_at.desc())
    )
    candidates = list(result.scalars().all())
    if not candidates:
        raise NotFoundError("No verification request found for this email")

    now = datetime.now(timezone.utc)
    valid = next(
        (c for c in candidates if c.code == code and c.expires_at > now),
        None,
    )
    if not valid:
        raise BadRequestError("Invalid or expired verification code")

    user = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if not user:
        raise NotFoundError("User not found")
    user.email_verified = True

    # Purge all codes for this email — including stale ones.
    await db.execute(delete(EmailVerification).where(EmailVerification.email == email))
    await db.flush()
    return {"message": "Email verified", "email_verified": True}


async def resend_verification(db: AsyncSession, email: str) -> dict:
    """Issue a fresh code, replacing any pending ones for the same email."""
    user = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if not user:
        # Don't leak whether an account exists.
        return {"message": "If the account exists, a new code has been sent"}
    if user.email_verified:
        return {"message": "Email already verified"}

    await db.execute(delete(EmailVerification).where(EmailVerification.email == email))
    code = _generate_code()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=VERIFICATION_CODE_TTL_MINUTES)
    db.add(EmailVerification(email=email, code=code, expires_at=expires_at))
    await db.flush()
    try:
        await send_verification_code(email, code)
    except Exception as exc:
        logger.warning("resend_verification failed for %s: %s", email, exc)
    return {"message": "Verification code sent"}


async def _verify_google_token(credential: str) -> dict | None:
    """Validate either an ID-token or an access-token from Google.

    Returns dict like ``{email, sub, name, picture}`` or None on failure.
    """
    if not credential:
        return None

    timeout = httpx.Timeout(10.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        # Try ID-token first (works for both One Tap and offline IdToken flow).
        try:
            r = await client.get(
                "https://oauth2.googleapis.com/tokeninfo",
                params={"id_token": credential},
            )
            if r.status_code == 200:
                data = r.json()
                aud = data.get("aud")
                if settings.GOOGLE_CLIENT_ID and aud and aud != settings.GOOGLE_CLIENT_ID:
                    logger.warning("Google token has unexpected aud: %s", aud)
                    return None
                return {
                    "sub": data.get("sub"),
                    "email": data.get("email"),
                    "name": data.get("name") or data.get("email", "").split("@")[0],
                    "picture": data.get("picture"),
                }
        except Exception as exc:
            logger.debug("Google id_token verify failed: %s", exc)

        # Fallback: treat credential as an access-token (default for useGoogleLogin
        # implicit flow) and ask userinfo for the profile.
        try:
            r = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {credential}"},
            )
            if r.status_code == 200:
                data = r.json()
                return {
                    "sub": data.get("sub"),
                    "email": data.get("email"),
                    "name": data.get("name") or (data.get("email", "").split("@")[0] if data.get("email") else "User"),
                    "picture": data.get("picture"),
                }
            logger.warning("Google userinfo returned %s: %s", r.status_code, r.text[:200])
        except Exception as exc:
            logger.warning("Google userinfo request failed: %s", exc)

    return None


async def google_login(
    db: AsyncSession,
    google_credential: str,
    user_agent: str | None = None,
    ip_address: str | None = None,
) -> dict:
    """Sign in or sign up via Google OAuth.

    Lookup order: by ``google_id`` → by ``email`` (and link in that case)
    → create a new user with ``auth_provider="google"`` and verified email.
    """
    profile = await _verify_google_token(google_credential)
    if not profile or not profile.get("email") or not profile.get("sub"):
        raise UnauthorizedError("Invalid Google credential")

    email = str(profile["email"]).lower().strip()
    google_id = str(profile["sub"])

    user = (
        await db.execute(select(User).where(User.google_id == google_id))
    ).scalar_one_or_none()

    if not user:
        user = (
            await db.execute(select(User).where(User.email == email))
        ).scalar_one_or_none()
        if user:
            # Link Google to existing account, mark email verified.
            user.google_id = google_id
            if user.auth_provider == "email":
                user.auth_provider = "google"
            user.email_verified = True
        else:
            user = User(
                name=str(profile.get("name") or email.split("@")[0]),
                email=email,
                hashed_password="",
                avatar=profile.get("picture"),
                email_verified=True,
                auth_provider="google",
                google_id=google_id,
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

    refresh_days = (
        settings.REFRESH_TOKEN_EXPIRE_DAYS
        if remember_me
        else settings.REFRESH_TOKEN_SHORT_DAYS
    )
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
