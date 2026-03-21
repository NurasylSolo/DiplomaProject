import re
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.project import Project
from app.models.mention import Mention
from app.models.source import Source
from app.models.source_fetch_state import SourceFetchState
from app.models.raw_document import RawDocument
from app.models.crawl_job import CrawlJob
from app.models.topic import Topic
from app.models.insight import Insight
from app.models.report import Report, EmailReportSchedule
from app.models.filter import SavedFilter
from app.models.influencer import Influencer
from app.models.chat import Chat, ChatMessage
from app.models.alert import AlertRule, NotificationEvent
from app.core.exceptions import NotFoundError, ForbiddenError
from app.services import alerts_service



GENERIC_TOPIC_TOKENS = {
    "bank",
    "banks",
    "банк",
    "банки",
    "банкi",
    "банкiлер",
    "company",
    "inc",
    "llc",
    "corp",
    "brand",
    "news",
    "group",
    "ltd",
    "too",
    "ao",
    "ooo",
}

COMMON_TOPIC_ALIASES = {
    "astana": ["астана", "нур-султан", "нурсултан", "nur-sultan", "нұр-сұлтан"],
    "almaty": ["алматы"],
    "kazakhstan": ["казахстан", "қазақстан"],
}


def _build_project_settings(name: str, incoming: dict | None) -> dict:
    keyword_seed = [name] if name else []
    aliases = COMMON_TOPIC_ALIASES.get((name or "").strip().lower(), [])
    if name:
        for token in re.split(r"[\s,;|]+", name):
            token = token.strip()
            if len(token) < 3:
                continue
            if token.lower() in GENERIC_TOPIC_TOKENS:
                continue
            keyword_seed.append(token)
    for alias in aliases:
        if alias not in keyword_seed:
            keyword_seed.append(alias)
    base = {
        "keywords": keyword_seed,
        "excludedKeywords": [],
        "activeSources": ["news", "blogs", "websites"],
        "excludedSites": [],
        "notifications": {"email": True},
        "topicQuery": name,
        "synonyms": {name: aliases} if name and aliases else {},
        # Lower threshold to improve recall for new projects; can be raised by user later.
        "relevanceThreshold": 0.1,
    }
    if isinstance(incoming, dict):
        base.update(incoming)
        if not base.get("keywords"):
            base["keywords"] = keyword_seed
        if not base.get("topicQuery"):
            base["topicQuery"] = name
    return base


async def get_user_projects(db: AsyncSession, user_id: str) -> list:
    result = await db.execute(
        select(Project).where(Project.owner_id == user_id).order_by(Project.created_at.desc())
    )
    projects = result.scalars().all()

    # Fast path: read precomputed metrics from project settings to avoid
    # expensive aggregate queries for each project on every UI refresh.
    return [{"project": project, "stats": _stats_from_settings(project.settings)} for project in projects]


async def get_project(db: AsyncSession, project_id: str, user_id: str) -> Project:
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise NotFoundError("Project not found")
    if project.owner_id != user_id:
        raise ForbiddenError("You don't have access to this project")
    return project


async def create_project(db: AsyncSession, user_id: str, data: dict) -> Project:
    payload = dict(data or {})
    project_name = payload.get("name", "")
    payload["settings"] = _build_project_settings(project_name, payload.get("settings"))
    project = Project(owner_id=user_id, **payload)
    db.add(project)
    await db.flush()
    await alerts_service.ensure_default_rules(db, project.id)
    await db.refresh(project)
    return project


async def update_project(
    db: AsyncSession, project_id: str, user_id: str, data: dict
) -> Project:
    project = await get_project(db, project_id, user_id)
    for key, value in data.items():
        if value is not None and hasattr(project, key):
            setattr(project, key, value)
    await db.flush()
    await db.refresh(project)
    return project


async def delete_project(db: AsyncSession, project_id: str, user_id: str) -> None:
    project = await get_project(db, project_id, user_id)
    await _delete_project_fast(db, project.id)


async def delete_previous_projects(
    db: AsyncSession,
    user_id: str,
    keep_project_id: str | None = None,
) -> int:
    result = await db.execute(
        select(Project).where(Project.owner_id == user_id).order_by(Project.created_at.desc())
    )
    projects = list(result.scalars().all())
    removed = 0
    for project in projects:
        if keep_project_id and project.id == keep_project_id:
            continue
        await _delete_project_fast(db, project.id)
        removed += 1
    return removed


def _stats_from_settings(settings_data: dict | None) -> dict:
    metrics = {}
    if isinstance(settings_data, dict):
        raw = settings_data.get("computed_metrics")
        if isinstance(raw, dict):
            metrics = raw
    return {
        "total_mentions": int(metrics.get("total_mentions", 0) or 0),
        "total_reach": int(metrics.get("total_reach", 0) or 0),
        "positive_percentage": float(metrics.get("positive_percentage", 0.0) or 0.0),
        "negative_percentage": float(metrics.get("negative_percentage", 0.0) or 0.0),
        "presence_score": float(metrics.get("presence_score", 0.0) or 0.0),
    }


async def _delete_project_fast(db: AsyncSession, project_id: str) -> None:
    source_ids = select(Source.id).where(Source.project_id == project_id)
    chat_ids = select(Chat.id).where(Chat.project_id == project_id)
    rule_ids = select(AlertRule.id).where(AlertRule.project_id == project_id)

    # Children with indirect links
    await db.execute(delete(ChatMessage).where(ChatMessage.chat_id.in_(chat_ids)))
    await db.execute(delete(SourceFetchState).where(SourceFetchState.source_id.in_(source_ids)))
    await db.execute(delete(NotificationEvent).where(NotificationEvent.rule_id.in_(rule_ids)))

    # Direct project-scoped data
    await db.execute(delete(NotificationEvent).where(NotificationEvent.project_id == project_id))
    await db.execute(delete(Mention).where(Mention.project_id == project_id))
    await db.execute(delete(RawDocument).where(RawDocument.project_id == project_id))
    await db.execute(delete(CrawlJob).where(CrawlJob.project_id == project_id))
    await db.execute(delete(Insight).where(Insight.project_id == project_id))
    await db.execute(delete(Report).where(Report.project_id == project_id))
    await db.execute(delete(EmailReportSchedule).where(EmailReportSchedule.project_id == project_id))
    await db.execute(delete(SavedFilter).where(SavedFilter.project_id == project_id))
    await db.execute(delete(Influencer).where(Influencer.project_id == project_id))
    await db.execute(delete(Chat).where(Chat.project_id == project_id))
    await db.execute(delete(Topic).where(Topic.project_id == project_id))
    await db.execute(delete(AlertRule).where(AlertRule.project_id == project_id))
    await db.execute(delete(Source).where(Source.project_id == project_id))
    await db.execute(delete(Project).where(Project.id == project_id))
    await db.flush()


async def _compute_project_stats(db: AsyncSession, project_id: str) -> dict:
    total_q = await db.execute(
        select(func.count(Mention.id)).where(Mention.project_id == project_id)
    )
    total_mentions = total_q.scalar() or 0

    reach_q = await db.execute(
        select(func.coalesce(func.sum(Mention.reach), 0)).where(Mention.project_id == project_id)
    )
    total_reach = reach_q.scalar() or 0

    if total_mentions > 0:
        pos_q = await db.execute(
            select(func.count(Mention.id)).where(
                Mention.project_id == project_id, Mention.sentiment_label == "positive"
            )
        )
        pos_count = pos_q.scalar() or 0

        neg_q = await db.execute(
            select(func.count(Mention.id)).where(
                Mention.project_id == project_id, Mention.sentiment_label == "negative"
            )
        )
        neg_count = neg_q.scalar() or 0

        positive_pct = round((pos_count / total_mentions) * 100, 1)
        negative_pct = round((neg_count / total_mentions) * 100, 1)
    else:
        positive_pct = 0.0
        negative_pct = 0.0

    presence_score = min(100.0, round((total_reach / 10000) * 10, 1)) if total_reach > 0 else 0.0

    return {
        "total_mentions": total_mentions,
        "total_reach": total_reach,
        "positive_percentage": positive_pct,
        "negative_percentage": negative_pct,
        "presence_score": presence_score,
    }
