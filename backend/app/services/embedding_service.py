"""Persistent embeddings for mentions — used for RAG retrieval in chat,
insights, AI report generation and Topic auto-discovery / assignment.

The text input for an embedding is always ``title + " — " + body[:1500]``,
so retrieval matches on both the headline and the lead paragraph.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Iterable

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.mention import Mention
from app.models.mention_embedding import MentionEmbedding
from app.services import vector_service

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Low-level retry/timeout helper around the OpenAI embedding call.
# ---------------------------------------------------------------------------
async def _embed_with_retry(text: str, *, retries: int = 3, base_delay: float = 1.5) -> list[float]:
    """Wrap ``vector_service.embed_text`` with bounded retries and timeout.

    Falls back to a deterministic hash-embedding (32 dims) on persistent failure
    so callers can always rely on getting *some* vector back.
    """
    last_err: Exception | None = None
    for attempt in range(retries):
        try:
            return await asyncio.wait_for(vector_service.embed_text(text), timeout=30.0)
        except Exception as exc:  # network / API / timeout
            last_err = exc
            if attempt < retries - 1:
                await asyncio.sleep(base_delay * (2 ** attempt))
    logger.warning("embedding API failed after %s retries: %s", retries, last_err)
    return vector_service._hash_embedding(text)  # noqa: SLF001 — explicit fallback


def _build_text(mention: Mention) -> str:
    title = (mention.title or "").strip()
    body = (mention.body or mention.snippet or "").strip()
    return f"{title}\n\n{body[:1500]}".strip() or "untitled"


# ---------------------------------------------------------------------------
# Per-mention store / refresh.
# ---------------------------------------------------------------------------
async def get_existing_embedding_ids(
    db: AsyncSession, project_id: str
) -> set[str]:
    rows = (
        await db.execute(
            select(MentionEmbedding.mention_id).where(
                MentionEmbedding.project_id == project_id
            )
        )
    ).all()
    return {r[0] for r in rows}


async def embed_and_store_mention(db: AsyncSession, mention: Mention) -> bool:
    """Compute and persist (or refresh) an embedding for a single mention.

    Returns True on success, False on persistent failure (already logged).
    """
    text = _build_text(mention)
    try:
        vec = await _embed_with_retry(text)
    except Exception as exc:
        logger.warning("embed_and_store_mention failed for %s: %s", mention.id, exc)
        return False

    if not vec:
        return False

    # Upsert via delete-then-insert (Postgres UPSERT is overkill here and we
    # need cross-dialect compatibility for tests).
    await db.execute(
        delete(MentionEmbedding).where(MentionEmbedding.mention_id == mention.id)
    )
    row = MentionEmbedding(
        mention_id=mention.id,
        project_id=mention.project_id,
        embedding=list(vec),
        model=settings.OPENAI_EMBEDDING_MODEL,
        dim=len(vec),
    )
    db.add(row)
    try:
        await db.flush()
    except Exception as exc:
        logger.warning("flush of embedding for %s failed: %s", mention.id, exc)
        await db.rollback()
        return False
    return True


# ---------------------------------------------------------------------------
# Search / retrieval.
# ---------------------------------------------------------------------------
async def search_similar(
    db: AsyncSession,
    project_id: str,
    query_text: str,
    *,
    top_k: int = 15,
    min_similarity: float = 0.0,
    limit_pool: int = 1500,
) -> list[tuple[Mention, float]]:
    """Return up to ``top_k`` mentions most similar to ``query_text``.

    All embeddings of the project are fetched (capped by ``limit_pool``),
    cosine similarity is computed in Python, and the corresponding
    Mention rows are loaded in a single follow-up query.

    Falls back gracefully to "most recent N mentions" if no embeddings
    exist yet (e.g. before backfill is run).
    """
    query_vec = await _embed_with_retry(query_text or "general overview")

    rows = (
        await db.execute(
            select(MentionEmbedding.mention_id, MentionEmbedding.embedding)
            .where(MentionEmbedding.project_id == project_id)
            .limit(limit_pool)
        )
    ).all()

    if not rows:
        # Bootstrap path — no embeddings yet.
        result = (
            await db.execute(
                select(Mention)
                .where(Mention.project_id == project_id)
                .order_by(Mention.published_at.desc())
                .limit(top_k)
            )
        ).scalars().all()
        return [(m, 0.0) for m in result]

    scored: list[tuple[str, float]] = []
    for mention_id, vec in rows:
        sim = vector_service.cosine_similarity(query_vec, list(vec or []))
        if sim >= min_similarity:
            scored.append((mention_id, sim))

    scored.sort(key=lambda x: x[1], reverse=True)
    top = scored[:top_k]
    if not top:
        return []

    top_ids = [mid for mid, _ in top]
    mention_rows = (
        await db.execute(
            select(Mention).where(Mention.id.in_(top_ids))
        )
    ).scalars().all()
    by_id = {m.id: m for m in mention_rows}

    out: list[tuple[Mention, float]] = []
    for mid, sim in top:
        m = by_id.get(mid)
        if m is not None:
            out.append((m, sim))
    return out


# ---------------------------------------------------------------------------
# Bulk backfill — used by the /embeddings/backfill endpoint.
# ---------------------------------------------------------------------------
async def backfill_project(
    db: AsyncSession,
    project_id: str,
    *,
    batch_size: int = 25,
    max_mentions: int = 5000,
) -> dict:
    """Compute embeddings for every mention of the project that doesn't
    already have one. Returns counts.
    """
    existing = await get_existing_embedding_ids(db, project_id)

    candidates = (
        await db.execute(
            select(Mention)
            .where(Mention.project_id == project_id)
            .order_by(Mention.published_at.desc())
            .limit(max_mentions)
        )
    ).scalars().all()

    pending: list[Mention] = [m for m in candidates if m.id not in existing]
    total = len(pending)
    created = 0
    failed = 0

    for i in range(0, total, batch_size):
        batch = pending[i : i + batch_size]
        for mention in batch:
            ok = await embed_and_store_mention(db, mention)
            if ok:
                created += 1
            else:
                failed += 1
        try:
            await db.commit()
        except Exception as exc:
            await db.rollback()
            logger.warning("backfill batch commit failed: %s", exc)

    return {
        "project_id": project_id,
        "total_mentions": len(candidates),
        "already_embedded": len(existing),
        "newly_embedded": created,
        "failed": failed,
    }


def mention_to_context_dict(m: Mention, sim: float | None = None) -> dict:
    """Return a compact dict with the fields the LLM needs to ground answers."""
    return {
        "id": m.id,
        "title": m.title or "",
        "snippet": (m.snippet or m.body or "")[:300],
        "sentiment": m.sentiment_label,
        "score": round(float(m.sentiment_score or 0.0), 3),
        "reach": int(m.reach or 0),
        "language": m.language,
        "country": m.country,
        "published_at": m.published_at.isoformat() if m.published_at else None,
        "url": m.url,
        "similarity": round(float(sim or 0.0), 4),
    }


def mentions_to_prompt_block(items: Iterable[tuple[Mention, float]]) -> str:
    """Format retrieved mentions as a numbered context block for the LLM."""
    lines: list[str] = []
    for idx, (m, sim) in enumerate(items, start=1):
        d = mention_to_context_dict(m, sim)
        lines.append(
            f"[{idx}] id={d['id']} | sentiment={d['sentiment']} ({d['score']:+.2f}) "
            f"| reach={d['reach']} | lang={d['language']} | date={d['published_at']}\n"
            f"    title: {d['title']}\n"
            f"    snippet: {d['snippet']}\n"
            f"    url: {d['url']}"
        )
    return "\n".join(lines) if lines else "(no relevant mentions found)"
