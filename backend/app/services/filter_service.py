from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.filter import SavedFilter
from app.core.exceptions import NotFoundError


async def get_filters(db: AsyncSession, project_id: str, user_id: str) -> list:
    result = await db.execute(
        select(SavedFilter)
        .where(SavedFilter.project_id == project_id, SavedFilter.user_id == user_id)
        .order_by(SavedFilter.created_at.desc())
    )
    return list(result.scalars().all())


async def get_filter(db: AsyncSession, project_id: str, filter_id: str, user_id: str) -> SavedFilter:
    result = await db.execute(
        select(SavedFilter).where(
            SavedFilter.id == filter_id,
            SavedFilter.project_id == project_id,
            SavedFilter.user_id == user_id,
        )
    )
    f = result.scalar_one_or_none()
    if not f:
        raise NotFoundError("Filter not found")
    return f


async def create_filter(db: AsyncSession, project_id: str, user_id: str, data: dict) -> SavedFilter:
    saved_filter = SavedFilter(project_id=project_id, user_id=user_id, **data)
    db.add(saved_filter)
    await db.flush()
    await db.refresh(saved_filter)
    return saved_filter


async def update_filter(
    db: AsyncSession, project_id: str, filter_id: str, user_id: str, data: dict
) -> SavedFilter:
    f = await get_filter(db, project_id, filter_id, user_id)
    for key, value in data.items():
        if value is not None and hasattr(f, key):
            setattr(f, key, value)
    await db.flush()
    await db.refresh(f)
    return f


async def delete_filter(db: AsyncSession, project_id: str, filter_id: str, user_id: str) -> None:
    f = await get_filter(db, project_id, filter_id, user_id)
    await db.delete(f)
