import asyncio
import json

from sqlalchemy import func, select

from app.database import AsyncSessionLocal
from app.models.project import Project
from app.models.source import Source
from app.models.source_catalog import SourceCatalog


async def _run() -> None:
    async with AsyncSessionLocal() as db:
        total_catalog = int(
            (await db.execute(select(func.count()).select_from(SourceCatalog))).scalar_one()
        )
        projects = (await db.execute(select(Project.id, Project.name))).all()
        project_rows = []
        for project_id, project_name in projects:
            source_count = int(
                (
                    await db.execute(
                        select(func.count()).select_from(Source).where(Source.project_id == project_id)
                    )
                ).scalar_one()
            )
            project_rows.append(
                {
                    "project_id": project_id,
                    "project_name": project_name,
                    "source_count": source_count,
                }
            )
    print(
        json.dumps(
            {"source_catalog_total": total_catalog, "projects": project_rows},
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    asyncio.run(_run())
