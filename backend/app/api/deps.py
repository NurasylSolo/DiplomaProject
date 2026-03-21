from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.core.security import decode_token
from app.core.exceptions import UnauthorizedError
from app.models.user import User


async def get_current_user(
    authorization: str = Header(..., alias="Authorization"),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not authorization.startswith("Bearer "):
        raise UnauthorizedError("Invalid authorization header")

    token = authorization.replace("Bearer ", "")
    payload = decode_token(token)

    if payload is None:
        raise UnauthorizedError("Invalid or expired token")

    if payload.get("type") != "access":
        raise UnauthorizedError("Invalid token type")

    user_id = payload.get("sub")
    if not user_id:
        raise UnauthorizedError("Invalid token payload")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise UnauthorizedError("User not found")

    return user
