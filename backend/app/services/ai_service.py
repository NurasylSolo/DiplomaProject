"""AI services: chat assistant, summarization, structured AI report.

All GPT calls share one helper (`_chat_completion`) with retry, timeout and
unified model selection from ``settings.OPENAI_CHAT_MODEL``.

Retrieval uses persisted embeddings from ``mention_embeddings`` table via
``embedding_service.search_similar`` — never the on-the-fly hash fallback.
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select, delete, update
from sqlalchemy.ext.asyncio import AsyncSession
from openai import AsyncOpenAI

from app.config import settings
from app.core.exceptions import BadRequestError, NotFoundError
from app.models.chat import Chat, ChatMessage
from app.models.mention import Mention
from app.services import embedding_service

logger = logging.getLogger(__name__)


_client: AsyncOpenAI | None = None


def _get_openai_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        if not settings.OPENAI_API_KEY:
            raise BadRequestError("OpenAI API key is not configured")
        _client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


# ---------------------------------------------------------------------------
# Unified chat completion helper.
# ---------------------------------------------------------------------------
async def _chat_completion(
    *,
    messages: list[dict],
    model: str | None = None,
    temperature: float = 0.4,
    max_tokens: int = 1500,
    response_format: dict | None = None,
    retries: int = 3,
    timeout: float = 60.0,
) -> tuple[str, dict[str, Any]]:
    """Call ``chat.completions.create`` with retries, timeout and structured
    metadata in the response.
    """
    client = _get_openai_client()
    chosen_model = model or settings.OPENAI_CHAT_MODEL

    last_err: Exception | None = None
    for attempt in range(retries):
        try:
            kwargs = {
                "model": chosen_model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            }
            if response_format is not None:
                kwargs["response_format"] = response_format

            resp = await asyncio.wait_for(
                client.chat.completions.create(**kwargs), timeout=timeout
            )
            content = resp.choices[0].message.content or ""
            meta = {
                "model": chosen_model,
                "tokens_used": resp.usage.total_tokens if resp.usage else None,
                "prompt_tokens": resp.usage.prompt_tokens if resp.usage else None,
                "completion_tokens": resp.usage.completion_tokens if resp.usage else None,
            }
            return content, meta
        except Exception as exc:
            last_err = exc
            if attempt < retries - 1:
                await asyncio.sleep(1.5 * (2 ** attempt))
            else:
                logger.error("chat.completions.create failed: %s", exc)

    raise BadRequestError(f"AI request failed after {retries} attempts: {last_err}")


# ---------------------------------------------------------------------------
# Summarize a list of mentions.
# ---------------------------------------------------------------------------
async def summarize_mentions(
    db: AsyncSession,
    project_id: str,
    mention_ids: list[str] | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> str:
    query = select(Mention).where(Mention.project_id == project_id)

    if mention_ids:
        query = query.where(Mention.id.in_(mention_ids))
    if date_from:
        query = query.where(Mention.published_at >= datetime.fromisoformat(date_from))
    if date_to:
        query = query.where(Mention.published_at <= datetime.fromisoformat(date_to))

    query = query.order_by(Mention.published_at.desc()).limit(50)
    mentions = (await db.execute(query)).scalars().all()

    if not mentions:
        return "No mentions found for the given criteria."

    lines = []
    for m in mentions:
        lines.append(
            f"- id={m.id} | sentiment={m.sentiment_label} | reach={m.reach} | "
            f"date={m.published_at.isoformat() if m.published_at else 'n/a'}\n"
            f"  title: {m.title}\n  snippet: {(m.snippet or m.body or '')[:280]}"
        )
    body = "\n".join(lines)

    system = (
        "You are a senior media intelligence analyst. Summarize the supplied news "
        "mentions in 4-7 bullet points covering: dominant narrative, sentiment "
        "distribution, notable events, top sources, recommended next steps. "
        "Reply in the same language as the majority of source titles. "
        "Always cite specific mentions by id in square brackets like [m:abc123]."
    )

    content, _ = await _chat_completion(
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": f"Mentions ({len(mentions)} total):\n\n{body}"},
        ],
        temperature=0.3,
        max_tokens=900,
    )
    return content or "Unable to generate summary."


# ---------------------------------------------------------------------------
# Brand Assistant chat with RAG.
# ---------------------------------------------------------------------------
_CITATION_RE = re.compile(r"\[m:([a-zA-Z0-9-]{6,40})\]")


def _extract_cited_ids(text: str) -> list[str]:
    return list(dict.fromkeys(_CITATION_RE.findall(text or "")))


def _resolve_cited_ids(raw_ids: list[str], pool: list[str]) -> list[str]:
    """Map raw citation strings (which GPT often shortens to a prefix) to
    actual mention ids from the retrieval pool.
    """
    out: list[str] = []
    for raw in raw_ids:
        if raw in pool:
            out.append(raw)
            continue
        prefix_hits = [p for p in pool if p.startswith(raw)]
        if len(prefix_hits) == 1:
            out.append(prefix_hits[0])
    # Preserve order, drop duplicates.
    return list(dict.fromkeys(out))


async def chat_with_assistant(
    db: AsyncSession,
    project_id: str,
    user_id: str,
    message: str,
    chat_id: str | None = None,
) -> dict:
    # ── chat lookup or creation ───────────────────────────────────────────
    if chat_id:
        result = await db.execute(
            select(Chat).where(Chat.id == chat_id, Chat.project_id == project_id)
        )
        chat = result.scalar_one_or_none()
        if not chat:
            raise NotFoundError("Chat not found")
    else:
        chat = Chat(
            project_id=project_id,
            user_id=user_id,
            title=(message[:50] + "...") if len(message) > 50 else message,
        )
        db.add(chat)
        await db.flush()

    # ── persist user message ──────────────────────────────────────────────
    user_msg = ChatMessage(
        chat_id=chat.id,
        role="user",
        content=message,
    )
    db.add(user_msg)
    await db.flush()

    # ── load chat history ────────────────────────────────────────────────
    hist_q = (
        select(ChatMessage)
        .where(ChatMessage.chat_id == chat.id)
        .order_by(ChatMessage.created_at.desc())
        .limit(20)
    )
    history = list(reversed((await db.execute(hist_q)).scalars().all()))

    # ── RAG: retrieve top mentions for this question ─────────────────────
    try:
        top_pairs = await embedding_service.search_similar(
            db, project_id, message, top_k=15
        )
    except Exception as exc:
        logger.warning("RAG search failed, falling back to recent: %s", exc)
        recent = (
            await db.execute(
                select(Mention)
                .where(Mention.project_id == project_id)
                .order_by(Mention.published_at.desc())
                .limit(15)
            )
        ).scalars().all()
        top_pairs = [(m, 0.0) for m in recent]

    context_block = embedding_service.mentions_to_prompt_block(top_pairs)
    cited_pool = [m.id for m, _ in top_pairs]

    system_prompt = (
        "You are SentiNews Brand Assistant — a senior media intelligence analyst. "
        "You answer ONLY based on the supplied list of news mentions. "
        "Always cite the supporting mention id in square brackets like [m:abc12345] "
        "right after each fact, statistic or claim. If the user asks something "
        "that is not supported by the supplied mentions, say so honestly and "
        "suggest a related question. Match the user's language exactly "
        "(English / Russian / Kazakh).\n\n"
        "When asked for analysis, structure your answer with short headings and "
        "bullet points. When asked for a report, follow the schema: "
        "Executive summary -> Key findings (3-5 bullets) -> Sentiment overview -> "
        "Top sources -> Recommendations.\n\n"
        f"=== RETRIEVED MENTIONS (top {len(top_pairs)} by semantic similarity) ===\n"
        f"{context_block}\n"
        f"=== END MENTIONS ==="
    )

    messages: list[dict] = [{"role": "system", "content": system_prompt}]
    for msg in history:
        messages.append({"role": msg.role, "content": msg.content})

    content, meta = await _chat_completion(
        messages=messages,
        temperature=0.4,
        max_tokens=1500,
    )

    cited_ids = _resolve_cited_ids(_extract_cited_ids(content), cited_pool)

    assistant_msg = ChatMessage(
        chat_id=chat.id,
        role="assistant",
        content=content,
        metadata_json={
            **meta,
            "cited_mention_ids": cited_ids,
            "retrieved_mention_ids": cited_pool,
            "retrieved_count": len(cited_pool),
        },
    )
    db.add(assistant_msg)
    await db.flush()

    # Update chat timestamp via title (cheap touch).
    chat.title = chat.title  # noqa
    await db.flush()

    return {
        "id": assistant_msg.id,
        "chat_id": chat.id,
        "role": "assistant",
        "content": content,
        "timestamp": (
            assistant_msg.created_at.isoformat()
            if assistant_msg.created_at
            else datetime.now(timezone.utc).isoformat()
        ),
        "metadata": assistant_msg.metadata_json,
    }


# ---------------------------------------------------------------------------
# Comprehensive AI Report.
# ---------------------------------------------------------------------------
_REPORT_SYSTEM_PROMPT = (
    "You are a senior media intelligence analyst writing a CEO-ready brief. "
    "Use ONLY the supplied mentions and stats. Output STRICT JSON with this "
    "schema:\n"
    "{\n"
    '  "language": "en"|"ru"|"kk",\n'
    '  "executive_summary": "2-3 sentences",\n'
    '  "key_findings": [{"title": str, "detail": str, "mention_ids": [str]}, ...] (3-5 items),\n'
    '  "sentiment_overview": "1-2 sentences",\n'
    '  "top_sources": [{"name": str, "mentions": int, "note": str}],\n'
    '  "risks": [str],\n'
    '  "opportunities": [str],\n'
    '  "recommendations": [str]\n'
    "}\n\n"
    "Cite mention ids only from the provided list. Match the dominant language of titles."
)


async def generate_ai_report(
    db: AsyncSession,
    project_id: str,
    *,
    project_name: str,
    project_stats: dict,
    top_k: int = 25,
) -> dict:
    """Generate a comprehensive structured report (JSON) for the project."""
    pairs = await embedding_service.search_similar(
        db, project_id, f"key news about {project_name}", top_k=top_k
    )
    context = embedding_service.mentions_to_prompt_block(pairs)

    user_payload = {
        "project_name": project_name,
        "stats": project_stats,
        "mentions": [
            embedding_service.mention_to_context_dict(m, sim) for m, sim in pairs
        ],
    }

    content, meta = await _chat_completion(
        messages=[
            {"role": "system", "content": _REPORT_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"Project: {project_name}\n"
                    f"Stats: {json.dumps(project_stats, ensure_ascii=False)[:2000]}\n\n"
                    f"=== MENTIONS (top {len(pairs)}) ===\n{context}\n=== END ==="
                ),
            },
        ],
        temperature=0.3,
        max_tokens=2200,
        response_format={"type": "json_object"},
    )

    try:
        parsed = json.loads(content) if content else {}
    except json.JSONDecodeError:
        parsed = {"executive_summary": content[:600], "raw": True}

    parsed.setdefault("language", "en")
    parsed["meta"] = meta
    parsed["mentions_used"] = [m.id for m, _ in pairs]
    parsed["generated_at"] = datetime.now(timezone.utc).isoformat()
    return parsed


# ---------------------------------------------------------------------------
# Chat history CRUD helpers.
# ---------------------------------------------------------------------------
async def list_chats(db: AsyncSession, project_id: str, user_id: str) -> list[dict]:
    chats = (
        await db.execute(
            select(Chat)
            .where(Chat.project_id == project_id, Chat.user_id == user_id)
            .order_by(Chat.updated_at.desc(), Chat.created_at.desc())
        )
    ).scalars().all()

    out: list[dict] = []
    for c in chats:
        last_msg_q = (
            select(ChatMessage)
            .where(ChatMessage.chat_id == c.id)
            .order_by(ChatMessage.created_at.desc())
            .limit(1)
        )
        last = (await db.execute(last_msg_q)).scalar_one_or_none()
        out.append({
            "id": c.id,
            "title": c.title,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None,
            "last_message_preview": (last.content[:120] if last else None),
            "last_message_role": (last.role if last else None),
            "last_message_at": (last.created_at.isoformat() if last and last.created_at else None),
        })
    return out


async def get_chat_messages(
    db: AsyncSession, project_id: str, chat_id: str, user_id: str
) -> list[dict]:
    chat = (
        await db.execute(
            select(Chat).where(
                Chat.id == chat_id,
                Chat.project_id == project_id,
                Chat.user_id == user_id,
            )
        )
    ).scalar_one_or_none()
    if not chat:
        raise NotFoundError("Chat not found")

    msgs = (
        await db.execute(
            select(ChatMessage)
            .where(ChatMessage.chat_id == chat_id)
            .order_by(ChatMessage.created_at.asc())
        )
    ).scalars().all()

    return [
        {
            "id": m.id,
            "chat_id": m.chat_id,
            "role": m.role,
            "content": m.content,
            "timestamp": m.created_at.isoformat() if m.created_at else None,
            "metadata": m.metadata_json,
        }
        for m in msgs
    ]


async def delete_chat(
    db: AsyncSession, project_id: str, chat_id: str, user_id: str
) -> None:
    chat = (
        await db.execute(
            select(Chat).where(
                Chat.id == chat_id,
                Chat.project_id == project_id,
                Chat.user_id == user_id,
            )
        )
    ).scalar_one_or_none()
    if not chat:
        raise NotFoundError("Chat not found")

    await db.execute(delete(ChatMessage).where(ChatMessage.chat_id == chat_id))
    await db.delete(chat)


async def rename_chat(
    db: AsyncSession, project_id: str, chat_id: str, user_id: str, title: str
) -> dict:
    title = (title or "").strip() or "New chat"
    chat = (
        await db.execute(
            select(Chat).where(
                Chat.id == chat_id,
                Chat.project_id == project_id,
                Chat.user_id == user_id,
            )
        )
    ).scalar_one_or_none()
    if not chat:
        raise NotFoundError("Chat not found")
    chat.title = title[:100]
    await db.flush()
    return {
        "id": chat.id,
        "title": chat.title,
        "updated_at": chat.updated_at.isoformat() if chat.updated_at else None,
    }
