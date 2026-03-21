from typing import TypeVar, Generic, List, Optional
from pydantic import BaseModel
from sqlalchemy import select, func, Select
from sqlalchemy.ext.asyncio import AsyncSession

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    per_page: int
    total_pages: int


async def paginate(
    db: AsyncSession,
    query: Select,
    page: int = 1,
    per_page: int = 20,
) -> dict:
    per_page = min(per_page, 100)
    page = max(page, 1)
    offset = (page - 1) * per_page

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    paginated_query = query.offset(offset).limit(per_page)
    result = await db.execute(paginated_query)
    items = result.scalars().all()

    total_pages = (total + per_page - 1) // per_page if total > 0 else 0

    return {
        "items": items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": total_pages,
    }
