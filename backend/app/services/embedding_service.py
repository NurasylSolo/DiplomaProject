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

# Cosine distance operator from pgvector. Distance = 1 - cosine_similarity,
# so ORDER BY ... ASC gives the most similar rows first. Kept as a module
# constant so the SQL is easy to grep and swap if we ever move to L2 / IP.
_COSINE_DIST_OP = "<=>"


# ---------------------------------------------------------------------------
# Low-level retry/timeout helper around the OpenAI embedding call.
# ---------------------------------------------------------------------------

# All persisted embeddings must match this dimensionality (the column is
# pgvector ``vector(1536)``). Hash fallbacks are NOT persisted because
# they would either fail the type check or — worse — pollute the index
# with random vectors that ruin retrieval quality.
EMBEDDING_DIM = 1536


async def _embed_with_retry(text: str, *, retries: int = 3, base_delay: float = 1.5) -> list[float]:
    """Wrap ``vector_service.embed_text`` with bounded retries and timeout.

    On persistent failure returns the deterministic hash-embedding so
    *in-memory* callers (relevance scoring, ad-hoc similarity) still get
    a vector back. Callers that persist the vector must check
    ``len(vec) == EMBEDDING_DIM`` and skip storage otherwise — see
    :func:`embed_and_store_mention`.
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
    if len(vec) != EMBEDDING_DIM:
        # Hash-fallback (or a wrong-model response) — skip storage so we
        # don't poison the pgvector index. Retrieval gracefully degrades
        # to "most recent N mentions" until a real embedding is computed.
        logger.warning(
            "skipping embedding persistence for %s: got %d dims, expected %d",
            mention.id, len(vec), EMBEDDING_DIM,
        )
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


async def embed_and_store_mentions_batch(
    db: AsyncSession, mentions: list[Mention], *, chunk_size: int = 96
) -> int:
    """Embed and persist many mentions using a single API call per chunk.

    OpenAI's embeddings endpoint accepts a list as ``input`` and returns one
    vector per item — far cheaper than one HTTP round-trip per mention. We
    chunk to stay well under provider-side payload caps.

    Returns the number of embeddings successfully stored.
    """
    if not mentions:
        return 0

    stored = 0
    for start in range(0, len(mentions), chunk_size):
        chunk = mentions[start : start + chunk_size]
        texts = [_build_text(m) for m in chunk]
        try:
            vectors = await asyncio.wait_for(
                vector_service.embed_texts(texts), timeout=60.0
            )
        except Exception as exc:
            logger.warning(
                "batched embed failed (%d items), falling back to hash: %s",
                len(chunk), exc,
            )
            vectors = [vector_service._hash_embedding(t) for t in texts]  # noqa: SLF001

        if len(vectors) != len(chunk):
            logger.warning(
                "embedding count mismatch: got %d for %d inputs",
                len(vectors), len(chunk),
            )
            continue

        # Drop hash-fallback vectors so we never store anything that
        # isn't a real ``vector(EMBEDDING_DIM)`` — see the dim guard in
        # ``embed_and_store_mention`` for the rationale.
        valid = [
            (m, v) for m, v in zip(chunk, vectors)
            if v and len(v) == EMBEDDING_DIM
        ]
        skipped = len(chunk) - len(valid)
        if skipped:
            logger.warning(
                "skipping %d/%d batched embeddings with wrong dim",
                skipped, len(chunk),
            )
        if not valid:
            continue

        ids = [m.id for m, _ in valid]
        await db.execute(
            delete(MentionEmbedding).where(MentionEmbedding.mention_id.in_(ids))
        )
        for mention, vec in valid:
            db.add(MentionEmbedding(
                mention_id=mention.id,
                project_id=mention.project_id,
                embedding=list(vec),
                model=settings.OPENAI_EMBEDDING_MODEL,
                dim=len(vec),
            ))
        try:
            await db.flush()
            stored += len(valid)
        except Exception as exc:
            logger.warning("flush of batched embeddings failed: %s", exc)
            await db.rollback()
    return stored


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
    limit_pool: int | None = None,  # kept for back-compat; ignored now
) -> list[tuple[Mention, float]]:
    """Return up to ``top_k`` mentions most similar to ``query_text``.

    Performs the similarity search inside Postgres via pgvector's cosine
    distance operator (``<=>``) joined with ``mentions`` so the whole
    operation is one round-trip and benefits from the HNSW index. This is
    the hot path for the AI chat, AI report and insight generation, so
    we want it O(log N) per query rather than O(N).

    Falls back gracefully to "most recent N mentions" if no embeddings
    exist yet (e.g. before backfill is run) or if the SQL search fails
    (e.g. pgvector not installed in dev / tests).
    """
    del limit_pool  # whole-pool scan no longer needed — index handles it.

    query_vec = await _embed_with_retry(query_text or "general overview")

    # min_similarity is in cosine-similarity space [-1, 1]; pgvector's
    # `<=>` returns cosine *distance* in [0, 2] = 1 - similarity. Convert
    # once here so the SQL stays in distance space.
    max_distance = 1.0 - float(min_similarity) if min_similarity > 0.0 else None

    try:
        rows = await _search_similar_pgvector(
            db, project_id, query_vec, top_k=top_k, max_distance=max_distance
        )
    except Exception as exc:
        # pgvector not installed, column type mismatch, etc. — log once
        # and fall through to the Python path so the feature still works
        # in dev environments without the extension.
        logger.warning(
            "pgvector search failed (%s), falling back to in-memory cosine",
            exc,
        )
        rows = await _search_similar_python(
            db, project_id, query_vec, top_k=top_k, min_similarity=min_similarity
        )

    if rows:
        return rows

    # Bootstrap path — no embeddings stored yet.
    result = (
        await db.execute(
            select(Mention)
            .where(Mention.project_id == project_id)
            .order_by(Mention.published_at.desc())
            .limit(top_k)
        )
    ).scalars().all()
    return [(m, 0.0) for m in result]


async def _search_similar_pgvector(
    db: AsyncSession,
    project_id: str,
    query_vec: list[float],
    *,
    top_k: int,
    max_distance: float | None,
) -> list[tuple[Mention, float]]:
    """One-shot top-k retrieval using pgvector + HNSW.

    Joins ``mention_embeddings`` to ``mentions`` so we return fully
    loaded ORM rows in a single query. The cosine distance is selected
    as a label so we can convert it back to similarity for callers.
    """
    distance = MentionEmbedding.embedding.op(_COSINE_DIST_OP)(query_vec)
    stmt = (
        select(Mention, distance.label("distance"))
        .join(MentionEmbedding, MentionEmbedding.mention_id == Mention.id)
        .where(MentionEmbedding.project_id == project_id)
        .order_by(distance.asc())
        .limit(top_k)
    )
    if max_distance is not None:
        stmt = stmt.where(distance <= max_distance)

    result = await db.execute(stmt)
    out: list[tuple[Mention, float]] = []
    for mention, dist in result.all():
        # Clamp because pgvector can return tiny negative values from
        # float-precision noise on identical vectors.
        sim = max(-1.0, min(1.0, 1.0 - float(dist)))
        out.append((mention, sim))
    return out


async def _search_similar_python(
    db: AsyncSession,
    project_id: str,
    query_vec: list[float],
    *,
    top_k: int,
    min_similarity: float,
) -> list[tuple[Mention, float]]:
    """Legacy in-memory cosine search. Kept only as a safety net for
    environments where pgvector is unavailable (CI without the
    extension, SQLite-backed unit tests). Capped pool size to keep this
    bounded.
    """
    rows = (
        await db.execute(
            select(MentionEmbedding.mention_id, MentionEmbedding.embedding)
            .where(MentionEmbedding.project_id == project_id)
            .limit(1500)
        )
    ).all()
    if not rows:
        return []

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
        await db.execute(select(Mention).where(Mention.id.in_(top_ids)))
    ).scalars().all()
    by_id = {m.id: m for m in mention_rows}
    return [(by_id[mid], sim) for mid, sim in top if mid in by_id]


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
        stored = await embed_and_store_mentions_batch(db, batch, chunk_size=batch_size)
        created += stored
        failed += len(batch) - stored
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
