from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.insight import Insight


async def get_insights(
    db: AsyncSession, project_id: str, type: str | None = None, severity: str | None = None
) -> list:
    query = select(Insight).where(Insight.project_id == project_id)

    if type:
        query = query.where(Insight.type == type)
    if severity:
        query = query.where(Insight.severity == severity)

    query = query.order_by(Insight.created_at.desc())
    result = await db.execute(query)
    return list(result.scalars().all())
