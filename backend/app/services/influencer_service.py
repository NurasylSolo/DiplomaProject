from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.influencer import Influencer


async def get_influencers(
    db: AsyncSession,
    project_id: str,
    sort_by: str = "influence_score",
    sort_order: str = "desc",
    platform: str | None = None,
) -> list:
    query = select(Influencer).where(Influencer.project_id == project_id)

    if platform:
        query = query.where(Influencer.platform == platform)

    sort_column = getattr(Influencer, sort_by, Influencer.influence_score)
    if sort_order == "asc":
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())

    result = await db.execute(query)
    return list(result.scalars().all())
