"""Topic service.

Provides:
- CRUD for project topics with keywords/description.
- AI auto-discovery of topics from a project's mentions (GPT).
- Embedding-based assignment of mentions to the best matching topic.
- AI summary of a single topic with citation of mention ids.

Topics use the persistent ``mention_embeddings`` table for retrieval and
matching, so the system gets smarter as more news are ingested.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from sqlalchemy import case, delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.exceptions import BadRequestError, NotFoundError
from app.models.mention import Mention
from app.models.mention_embedding import MentionEmbedding
from app.models.topic import Topic
from app.services import embedding_service, vector_service

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------
async def list_topics(db: AsyncSession, project_id: str) -> list[Topic]:
    rows = (
        await db.execute(
            select(Topic)
            .where(Topic.project_id == project_id)
            .order_by(Topic.created_at.asc())
        )
    ).scalars().all()
    return list(rows)


# ---------------------------------------------------------------------------
# Aggregated stats for the topics list page (mentions count, sentiment
# distribution, total reach). Computed on the fly from the mentions table
# so we don't have to keep a denormalised cache in sync.
#
# Two paths:
# 1. **Assigned**: count mentions where ``Mention.topic_id == topic.id``.
#    This is the canonical source after a successful auto-discover/reassign.
# 2. **Keyword fallback**: when no mentions are assigned to a topic yet
#    (e.g. user just created the topic, or reassign hasn't been triggered
#    after ingest), fall back to ILIKE matching of mention title/body
#    against the topic's keywords + name. This guarantees the topics page
#    shows real numbers immediately and never displays "0 mentions" for a
#    topic that obviously has matching news.
# ---------------------------------------------------------------------------
def _sentiment_aggregates():
    return (
        func.sum(case((Mention.sentiment_label == "positive", 1), else_=0)),
        func.sum(case((Mention.sentiment_label == "neutral", 1), else_=0)),
        func.sum(case((Mention.sentiment_label == "negative", 1), else_=0)),
    )


def _topic_match_terms(topic: Topic) -> list[str]:
    """Build a deduplicated, length-filtered list of search terms for
    keyword-fallback matching. Includes the topic name and all keywords.
    """
    terms: list[str] = []
    seen: set[str] = set()
    for raw in (topic.keywords or []) + ([topic.name] if topic.name else []):
        s = (raw or "").strip()
        if len(s) < 3:
            continue
        key = s.lower()
        if key in seen:
            continue
        seen.add(key)
        terms.append(s)
    return terms


async def _stats_by_assigned_topic_id(
    db: AsyncSession, project_id: str
) -> dict[str, dict]:
    pos, neu, neg = _sentiment_aggregates()
    rows = (
        await db.execute(
            select(
                Mention.topic_id,
                func.count(Mention.id).label("count"),
                pos.label("positive"),
                neu.label("neutral"),
                neg.label("negative"),
                func.coalesce(func.sum(Mention.reach), 0).label("reach"),
            )
            .where(
                Mention.project_id == project_id,
                Mention.topic_id.is_not(None),
            )
            .group_by(Mention.topic_id)
        )
    ).all()
    return {
        r.topic_id: {
            "mentions_count": int(r.count or 0),
            "sentiment_distribution": {
                "positive": int(r.positive or 0),
                "neutral": int(r.neutral or 0),
                "negative": int(r.negative or 0),
            },
            "total_reach": int(r.reach or 0),
        }
        for r in rows
    }


async def _stats_by_keyword_match_bulk(
    db: AsyncSession, project_id: str, topics: list[Topic]
) -> dict[str, dict]:
    """Compute keyword-fallback stats for many topics in a single
    round-trip: pull every project mention once (id, label, reach,
    title+body lowercased), then run the keyword matching in Python.

    This replaces the previous N+1 (one SELECT per topic) implementation
    that visibly slowed down the topics page.
    """
    if not topics:
        return {}

    # Pre-compute lowercase term lists per topic.
    topic_terms: list[tuple[str, list[str]]] = []
    for t in topics:
        terms = [term.lower() for term in _topic_match_terms(t)]
        if terms:
            topic_terms.append((t.id, terms[:12]))
    if not topic_terms:
        return {}

    rows = (
        await db.execute(
            select(
                Mention.id,
                Mention.sentiment_label,
                Mention.reach,
                Mention.title,
                Mention.body,
            ).where(Mention.project_id == project_id)
        )
    ).all()
    if not rows:
        return {}

    out: dict[str, dict] = {
        tid: {
            "mentions_count": 0,
            "sentiment_distribution": {"positive": 0, "neutral": 0, "negative": 0},
            "total_reach": 0,
        }
        for tid, _ in topic_terms
    }

    for r in rows:
        haystack = f"{r.title or ''} {r.body or ''}".lower()
        if not haystack:
            continue
        reach = int(r.reach or 0)
        label = r.sentiment_label or "neutral"
        for tid, terms in topic_terms:
            if any(term in haystack for term in terms):
                bucket = out[tid]
                bucket["mentions_count"] += 1
                bucket["total_reach"] += reach
                if label in bucket["sentiment_distribution"]:
                    bucket["sentiment_distribution"][label] += 1

    # Drop topics that ended up empty so the caller treats them as "no data".
    return {tid: stats for tid, stats in out.items() if stats["mentions_count"] > 0}


async def aggregate_topic_stats(
    db: AsyncSession, project_id: str
) -> dict[str, dict]:
    """Return ``{topic_id: {mentions_count, sentiment_distribution,
    total_reach}}`` for every topic. Combines the assigned-id aggregate
    (single GROUP BY query) with a bulk keyword-match fallback (one full
    mentions scan in Python) for topics that have no assigned mentions
    yet.
    """
    assigned = await _stats_by_assigned_topic_id(db, project_id)
    topics = await list_topics(db, project_id)

    unassigned = [t for t in topics if t.id not in assigned]
    fallback = (
        await _stats_by_keyword_match_bulk(db, project_id, unassigned)
        if unassigned
        else {}
    )

    out: dict[str, dict] = {}
    for t in topics:
        if t.id in assigned:
            out[t.id] = assigned[t.id]
        elif t.id in fallback:
            out[t.id] = fallback[t.id]
    return out


async def get_topic(db: AsyncSession, project_id: str, topic_id: str) -> Topic:
    row = (
        await db.execute(
            select(Topic).where(Topic.id == topic_id, Topic.project_id == project_id)
        )
    ).scalar_one_or_none()
    if not row:
        raise NotFoundError("Topic not found")
    return row


async def create_topic(
    db: AsyncSession,
    project_id: str,
    *,
    name: str,
    description: str | None = None,
    keywords: list[str] | None = None,
) -> Topic:
    name = (name or "").strip()
    if not name:
        raise BadRequestError("Topic name is required")
    topic = Topic(
        project_id=project_id,
        name=name[:255],
        description=(description or "")[:1000] or None,
        keywords=[str(k).strip() for k in (keywords or []) if str(k).strip()] or None,
    )
    db.add(topic)
    await db.flush()
    await db.refresh(topic)
    return topic


async def update_topic(
    db: AsyncSession,
    project_id: str,
    topic_id: str,
    *,
    name: str | None = None,
    description: str | None = None,
    keywords: list[str] | None = None,
) -> Topic:
    topic = await get_topic(db, project_id, topic_id)
    if name is not None:
        n = name.strip()
        if n:
            topic.name = n[:255]
    if description is not None:
        topic.description = (description or "")[:1000] or None
    if keywords is not None:
        topic.keywords = [str(k).strip() for k in keywords if str(k).strip()] or None
    await db.flush()
    return topic


async def delete_topic(db: AsyncSession, project_id: str, topic_id: str) -> None:
    topic = await get_topic(db, project_id, topic_id)
    # Detach mentions from this topic so they aren't lost.
    await db.execute(
        update(Mention)
        .where(Mention.project_id == project_id, Mention.topic_id == topic_id)
        .values(topic_id=None)
    )
    await db.delete(topic)
    await db.flush()


# ---------------------------------------------------------------------------
# Top mentions / sources for a topic.
# ---------------------------------------------------------------------------
async def get_topic_mentions(
    db: AsyncSession, project_id: str, topic_id: str, limit: int = 10
) -> list[Mention]:
    rows = (
        await db.execute(
            select(Mention)
            .where(
                Mention.project_id == project_id,
                Mention.topic_id == topic_id,
            )
            .order_by(Mention.published_at.desc())
            .limit(limit)
        )
    ).scalars().all()
    return list(rows)


# ---------------------------------------------------------------------------
# Embedding-based assignment.
# ---------------------------------------------------------------------------
def _topic_text_for_embedding(t: Topic) -> str:
    parts = [t.name or ""]
    if t.description:
        parts.append(t.description)
    if t.keywords:
        parts.append(", ".join(t.keywords))
    return " — ".join(p for p in parts if p)


# Module-level cache: (topic_id, text_hash) -> embedding. Stops us from
# calling OpenAI once per (mention, topic) pair during ingestion / bulk
# reassign — the topic text is identical across all mentions of the same
# project, so one embedding per topic is enough. ``text_hash`` invalidates
# the entry as soon as the user renames the topic or edits its keywords.
_TOPIC_EMB_CACHE: dict[tuple[str, int], list[float]] = {}


async def _topic_embedding(t: Topic) -> list[float]:
    text = _topic_text_for_embedding(t)
    key = (t.id, hash(text))
    cached = _TOPIC_EMB_CACHE.get(key)
    if cached is not None:
        return cached
    vec = await embedding_service._embed_with_retry(text)
    _TOPIC_EMB_CACHE[key] = vec
    return vec


async def _load_topic_embeddings(topics: list[Topic]) -> list[tuple[Topic, list[float]]]:
    """Resolve embeddings for many topics, using the per-topic cache so a
    bulk reassign over thousands of mentions only triggers ~``len(topics)``
    OpenAI calls in total.
    """
    out: list[tuple[Topic, list[float]]] = []
    for t in topics:
        try:
            vec = await _topic_embedding(t)
        except Exception as exc:
            logger.warning("topic embedding failed for %s: %s", t.id, exc)
            continue
        if vec:
            out.append((t, vec))
    return out


async def assign_to_best_topic(
    db: AsyncSession,
    mention: Mention,
    *,
    min_similarity: float = 0.3,
    topic_embeddings: list[tuple[Topic, list[float]]] | None = None,
) -> str | None:
    """Pick the topic with highest cosine similarity to this mention's
    embedding. Returns the topic id or None.

    ``topic_embeddings`` lets the caller pre-compute embeddings once and
    reuse them across many mentions (see :func:`reassign_all_mentions`).
    When omitted, we fall back to the per-call cache in
    :func:`_topic_embedding`.
    """
    if topic_embeddings is None:
        topics = await list_topics(db, mention.project_id)
        if not topics:
            return None
        topic_embeddings = await _load_topic_embeddings(topics)
    if not topic_embeddings:
        return None
    topics = [t for t, _ in topic_embeddings]

    # Use the existing mention embedding (was just created by ingestion).
    me = (
        await db.execute(
            select(MentionEmbedding.embedding).where(
                MentionEmbedding.mention_id == mention.id
            )
        )
    ).scalar_one_or_none()
    if me is None:
        # Fall back to keyword scoring.
        return _assign_by_keywords(mention, topics)

    me_list = list(me)
    best_id: str | None = None
    best_sim = -1.0
    for t, t_emb in topic_embeddings:
        try:
            sim = vector_service.cosine_similarity(me_list, t_emb)
        except Exception:
            sim = _keyword_score(mention, t)
        if sim > best_sim:
            best_sim = sim
            best_id = t.id

    if best_sim < min_similarity:
        # Not confident enough — try keyword backup.
        kid = _assign_by_keywords(mention, topics)
        return kid
    return best_id


def _assign_by_keywords(mention: Mention, topics: list[Topic]) -> str | None:
    best_id: str | None = None
    best_score = 0
    for t in topics:
        score = _keyword_score(mention, t)
        if score > best_score:
            best_score = score
            best_id = t.id
    return best_id if best_score > 0 else None


def _keyword_score(mention: Mention, topic: Topic) -> float:
    haystack = f"{mention.title or ''} {mention.body or ''}".lower()
    if not haystack:
        return 0.0
    score = 0.0
    for kw in topic.keywords or []:
        kw_l = (kw or "").lower().strip()
        if kw_l and kw_l in haystack:
            score += 1.0
    if topic.name and topic.name.lower() in haystack:
        score += 0.5
    return score


async def reassign_all_mentions(
    db: AsyncSession, project_id: str, *, batch_size: int = 100
) -> dict:
    """Re-run topic assignment for every mention of the project."""
    total = int(
        (
            await db.execute(
                select(func.count(Mention.id)).where(Mention.project_id == project_id)
            )
        ).scalar() or 0
    )
    if total == 0:
        return {"total": 0, "reassigned": 0, "unmatched": 0}

    # Embed every topic ONCE up-front. Without this we'd hit OpenAI
    # `topics × mentions` times during a reassign — at ~10 topics and
    # 5000 mentions that's 50k API calls.
    topics = await list_topics(db, project_id)
    topic_embeddings = await _load_topic_embeddings(topics) if topics else []

    reassigned = 0
    unmatched = 0
    offset = 0
    while offset < total:
        batch = (
            await db.execute(
                select(Mention)
                .where(Mention.project_id == project_id)
                .order_by(Mention.id)
                .offset(offset)
                .limit(batch_size)
            )
        ).scalars().all()
        for m in batch:
            try:
                tid = await assign_to_best_topic(
                    db, m, topic_embeddings=topic_embeddings
                )
            except Exception as exc:
                logger.warning("reassign failed for %s: %s", m.id, exc)
                tid = None
            if tid:
                if m.topic_id != tid:
                    m.topic_id = tid
                reassigned += 1
            else:
                if m.topic_id is not None:
                    m.topic_id = None
                unmatched += 1
        try:
            await db.commit()
        except Exception:
            await db.rollback()
        offset += batch_size

    return {"total": total, "reassigned": reassigned, "unmatched": unmatched}


# ---------------------------------------------------------------------------
# AI auto-discover topics from project mentions.
# ---------------------------------------------------------------------------
_DISCOVER_SYSTEM_PROMPT = (
    "You are a topic-modeling expert. Given a list of news article titles "
    "and short snippets about a brand or subject, propose 5-10 concise topics "
    "that summarize the main themes. Output STRICT JSON: an object with key "
    '"topics" containing an array. Each topic has:\n'
    '- "name": 2-5 words, Title Case\n'
    '- "description": 1 sentence describing the theme\n'
    '- "keywords": array of 3-8 lowercase words used to detect the topic in '
    'future articles\n\n'
    "Match the dominant language of supplied titles. Do NOT include any text "
    "outside the JSON."
)


async def auto_discover_topics(
    db: AsyncSession, project_id: str, *, sample_size: int = 80
) -> list[Topic]:
    """Use GPT to discover topics from a sample of mentions, persist them
    and reassign all project mentions to the new topics.
    """
    api_key = (settings.OPENAI_API_KEY or "").strip()
    if not api_key:
        raise BadRequestError("OPENAI_API_KEY is not configured")

    sample = (
        await db.execute(
            select(Mention)
            .where(Mention.project_id == project_id)
            .order_by(Mention.published_at.desc())
            .limit(sample_size)
        )
    ).scalars().all()
    if not sample:
        return []

    lines = []
    for m in sample[:60]:
        title = (m.title or "").strip()
        snippet = (m.snippet or m.body or "")[:200].strip()
        lines.append(f"- {title} | {snippet}")
    payload = "\n".join(lines)

    # AsyncOpenAI + bounded retries/timeout so this endpoint never freezes
    # the event loop (the sync ``OpenAI`` client used to block uvicorn for
    # the duration of every backoff retry — typically 30s+ on a 429).
    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=api_key, max_retries=1, timeout=20.0)

    try:
        resp = await client.chat.completions.create(
            model=settings.OPENAI_CHAT_MODEL or "gpt-4o-mini",
            messages=[
                {"role": "system", "content": _DISCOVER_SYSTEM_PROMPT},
                {"role": "user", "content": f"Articles:\n{payload[:8000]}"},
            ],
            temperature=0.3,
            max_tokens=1200,
            response_format={"type": "json_object"},
        )
        content = (resp.choices[0].message.content or "").strip()
        parsed = json.loads(content)
    except Exception as exc:
        logger.warning("auto_discover_topics GPT failed: %s", exc)
        raise BadRequestError(f"AI topic discovery failed: {exc}")

    # Accept either {"topics": [...]} or a bare list under common keys.
    raw_list: list[dict] = []
    if isinstance(parsed, dict):
        for key in ("topics", "items", "data", "results"):
            v = parsed.get(key)
            if isinstance(v, list):
                raw_list = v
                break
    elif isinstance(parsed, list):
        raw_list = parsed

    if not raw_list:
        raise BadRequestError("AI returned no usable topics")

    # Replace existing AI-discovered topics for this project.
    # We keep manually-created topics intact: heuristic — drop only those
    # whose name was generated previously via AI (we mark via description prefix).
    # To keep things safe and deterministic, just drop all and recreate.
    await db.execute(
        update(Mention)
        .where(Mention.project_id == project_id)
        .values(topic_id=None)
    )
    await db.execute(delete(Topic).where(Topic.project_id == project_id))
    await db.flush()

    created: list[Topic] = []
    for raw in raw_list[:10]:
        if not isinstance(raw, dict):
            continue
        name = str(raw.get("name") or "").strip()
        if not name:
            continue
        description = str(raw.get("description") or "").strip() or None
        kws = raw.get("keywords") or []
        if not isinstance(kws, list):
            kws = []
        clean_kws = [str(k).strip().lower() for k in kws if str(k).strip()]
        topic = Topic(
            project_id=project_id,
            name=name[:255],
            description=description[:1000] if description else None,
            keywords=clean_kws or None,
        )
        db.add(topic)
        created.append(topic)
    await db.flush()

    # Reassign mentions to new topics.
    try:
        await reassign_all_mentions(db, project_id)
    except Exception as exc:
        logger.warning("post-discovery reassign failed: %s", exc)

    return created


# ---------------------------------------------------------------------------
# AI summary of a single topic.
# ---------------------------------------------------------------------------
_SUMMARY_SYSTEM_PROMPT = (
    "You are a media intelligence analyst. Summarize the news mentions of a "
    "single topic in 4-6 bullet points covering: dominant narrative, sentiment "
    "balance, notable events, top sources, recommended actions. Cite "
    "supporting mention ids in square brackets like [m:abc12345]. Match the "
    "dominant language of the mentions."
)


async def summarize_topic(
    db: AsyncSession, project_id: str, topic_id: str
) -> dict:
    topic = await get_topic(db, project_id, topic_id)
    api_key = (settings.OPENAI_API_KEY or "").strip()
    if not api_key:
        raise BadRequestError("OPENAI_API_KEY is not configured")

    mentions = await get_topic_mentions(db, project_id, topic_id, limit=25)
    if not mentions:
        return {
            "topic_id": topic_id,
            "summary": (
                "This topic has no mentions yet. Reassign mentions or wait for "
                "new ingestion to gather material."
            ),
            "mention_ids": [],
        }

    lines = []
    for m in mentions:
        lines.append(
            f"- id={m.id} | sentiment={m.sentiment_label} | reach={m.reach}\n"
            f"  title: {m.title}\n"
            f"  snippet: {(m.snippet or m.body or '')[:250]}"
        )
    payload = "\n".join(lines)

    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=api_key, max_retries=1, timeout=20.0)

    try:
        resp = await client.chat.completions.create(
            model=settings.OPENAI_CHAT_MODEL or "gpt-4o-mini",
            messages=[
                {"role": "system", "content": _SUMMARY_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": (
                        f"Topic: {topic.name}\n"
                        f"Description: {topic.description or 'n/a'}\n\n"
                        f"Mentions ({len(mentions)}):\n{payload[:9000]}"
                    ),
                },
            ],
            temperature=0.3,
            max_tokens=900,
        )
        content = (resp.choices[0].message.content or "").strip()
    except Exception as exc:
        logger.warning("summarize_topic GPT failed: %s", exc)
        raise BadRequestError(f"AI summary failed: {exc}")

    raw_cited = list(dict.fromkeys(re.findall(r"\[m:([a-zA-Z0-9-]{6,40})\]", content)))
    valid_ids = [m.id for m in mentions]
    matched: list[str] = []
    for c in raw_cited:
        if c in valid_ids:
            matched.append(c)
            continue
        # GPT often shortens UUIDs to a prefix like "2dddd43e" — accept the
        # match if exactly one valid id starts with this prefix.
        prefix_hits = [v for v in valid_ids if v.startswith(c)]
        if len(prefix_hits) == 1:
            matched.append(prefix_hits[0])

    return {
        "topic_id": topic_id,
        "summary": content,
        "mention_ids": list(dict.fromkeys(matched)),
    }
