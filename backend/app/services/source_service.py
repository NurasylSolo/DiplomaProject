from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.source import Source
from app.models.mention import Mention
from app.models.source_catalog import SourceCatalog
from app.core.exceptions import NotFoundError


async def get_sources(db: AsyncSession, project_id: str) -> list:
    # Show only sources that already have mentions for this project.
    result = await db.execute(
        select(
            Source,
            func.count(Mention.id).label("mention_count"),
        )
        .join(Mention, Mention.source_id == Source.id)
        .where(Source.project_id == project_id, Mention.project_id == project_id)
        .group_by(Source.id)
        .order_by(func.count(Mention.id).desc(), Source.created_at.desc())
    )
    return list(result.all())


async def get_source(db: AsyncSession, project_id: str, source_id: str) -> Source:
    result = await db.execute(
        select(Source).where(Source.id == source_id, Source.project_id == project_id)
    )
    source = result.scalar_one_or_none()
    if not source:
        raise NotFoundError("Source not found")
    return source


async def create_source(db: AsyncSession, project_id: str, data: dict) -> Source:
    source = Source(project_id=project_id, **data)
    db.add(source)
    await db.flush()
    await db.refresh(source)
    return source


async def update_source(
    db: AsyncSession, project_id: str, source_id: str, data: dict
) -> Source:
    source = await get_source(db, project_id, source_id)
    for key, value in data.items():
        if value is not None and hasattr(source, key):
            setattr(source, key, value)
    await db.flush()
    await db.refresh(source)
    return source


async def delete_source(db: AsyncSession, project_id: str, source_id: str) -> None:
    source = await get_source(db, project_id, source_id)
    await db.delete(source)


def _map_catalog_type_to_project_type(source_type: str, tags: list | None) -> str:
    stype = (source_type or "").strip().lower()
    tag_values = {str(t).strip().lower() for t in (tags or []) if str(t).strip()}
    social_tags = {"twitter", "facebook", "instagram", "linkedin", "youtube", "telegram", "tiktok"}
    detected_social = next((tag for tag in social_tags if tag in tag_values), None)
    if detected_social:
        return detected_social
    if stype == "html":
        return "websites"
    return "news"


async def attach_catalog_sources_to_project(
    db: AsyncSession,
    project_id: str,
    filters: dict,
) -> dict:
    languages = {str(x).strip() for x in (filters.get("languages") or []) if str(x).strip()}
    countries = {str(x).strip() for x in (filters.get("countries") or []) if str(x).strip()}
    source_types = {str(x).strip().lower() for x in (filters.get("source_types") or []) if str(x).strip()}
    tags_any = {x.strip().lower() for x in (filters.get("tags_any") or []) if str(x).strip()}
    min_trust_score = float(filters.get("min_trust_score") or 0.0)
    active_only = bool(filters.get("active_only", True))
    limit = int(filters.get("limit") or 1000)
    dry_run = bool(filters.get("dry_run", False))

    query = select(SourceCatalog).where(SourceCatalog.trust_score >= min_trust_score)
    if active_only:
        query = query.where(SourceCatalog.active.is_(True))
    if languages:
        query = query.where(SourceCatalog.language.in_(languages))
    if countries:
        query = query.where(SourceCatalog.country.in_(countries))
    if source_types:
        query = query.where(SourceCatalog.source_type.in_(source_types))
    query = query.order_by(SourceCatalog.crawl_priority.asc(), SourceCatalog.domain.asc()).limit(limit)
    catalog_rows = list((await db.execute(query)).scalars().all())

    if tags_any:
        filtered_rows: list[SourceCatalog] = []
        for row in catalog_rows:
            row_tags = {str(t).strip().lower() for t in (row.tags or []) if str(t).strip()}
            if row_tags.intersection(tags_any):
                filtered_rows.append(row)
        catalog_rows = filtered_rows

    existing_result = await db.execute(
        select(Source.base_url).where(Source.project_id == project_id)
    )
    existing_urls = {str(url).rstrip("/").lower() for url in existing_result.scalars().all()}

    created = 0
    already_exists = 0
    skipped = 0
    sample_domains: list[str] = []

    for row in catalog_rows:
        normalized_url = row.base_url.rstrip("/").lower()
        if len(sample_domains) < 20:
            sample_domains.append(row.domain)
        if normalized_url in existing_urls:
            already_exists += 1
            continue
        if dry_run:
            continue
        source = Source(
            project_id=project_id,
            name=row.domain,
            type=_map_catalog_type_to_project_type(row.source_type, row.tags),
            base_url=row.base_url,
            active=row.active,
            trust_score=row.trust_score,
            country=row.country,
            language=row.language,
            icon=None,
        )
        db.add(source)
        existing_urls.add(normalized_url)
        created += 1

    matched = len(catalog_rows)
    if dry_run:
        created = 0
    skipped = max(0, matched - created - already_exists)
    await db.flush()
    return {
        "matched": matched,
        "created": created,
        "already_exists": already_exists,
        "skipped": skipped,
        "dry_run": dry_run,
        "sample_domains": sample_domains,
    }
