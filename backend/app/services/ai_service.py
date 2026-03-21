import uuid
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from openai import AsyncOpenAI
from app.config import settings
from app.models.mention import Mention
from app.models.chat import Chat, ChatMessage
from app.core.exceptions import BadRequestError
from app.services.vector_service import embed_text, cosine_similarity


_client = None


def _get_openai_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        if not settings.OPENAI_API_KEY:
            raise BadRequestError("OpenAI API key is not configured")
        _client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


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
    result = await db.execute(query)
    mentions = result.scalars().all()

    if not mentions:
        return "No mentions found for the given criteria."

    mentions_text = "\n\n".join(
        f"Title: {m.title}\nSource: {m.sentiment_label}\nDate: {m.published_at}\nSnippet: {m.snippet or m.body[:200]}"
        for m in mentions
    )

    client = _get_openai_client()
    response = await client.chat.completions.create(
        model=settings.OPENAI_CHAT_MODEL,
        messages=[
            {
                "role": "system",
                "content": "You are a media intelligence analyst. Summarize the following media mentions, highlighting key trends, sentiment patterns, and notable events. Provide the summary in Russian.",
            },
            {"role": "user", "content": f"Summarize these {len(mentions)} media mentions:\n\n{mentions_text}"},
        ],
        max_tokens=1000,
        temperature=0.3,
    )

    return response.choices[0].message.content or "Unable to generate summary."


async def chat_with_assistant(
    db: AsyncSession,
    project_id: str,
    user_id: str,
    message: str,
    chat_id: str | None = None,
) -> dict:
    if chat_id:
        result = await db.execute(
            select(Chat).where(Chat.id == chat_id, Chat.project_id == project_id)
        )
        chat = result.scalar_one_or_none()
        if not chat:
            raise BadRequestError("Chat not found")
    else:
        chat = Chat(
            project_id=project_id,
            user_id=user_id,
            title=message[:50] + "..." if len(message) > 50 else message,
        )
        db.add(chat)
        await db.flush()

    user_msg = ChatMessage(
        chat_id=chat.id,
        role="user",
        content=message,
    )
    db.add(user_msg)
    await db.flush()

    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.chat_id == chat.id)
        .order_by(ChatMessage.created_at.desc())
        .limit(20)
    )
    history = list(reversed(result.scalars().all()))

    mentions_result = await db.execute(
        select(Mention)
        .where(Mention.project_id == project_id)
        .order_by(Mention.published_at.desc())
        .limit(80)
    )
    recent_mentions = list(mentions_result.scalars().all())
    query_embedding = await embed_text(message)
    scored: list[tuple[float, Mention]] = []
    for mention in recent_mentions:
        m_embedding = await embed_text(f"{mention.title}\n{mention.body[:600]}")
        scored.append((cosine_similarity(query_embedding, m_embedding), mention))
    scored.sort(key=lambda item: item[0], reverse=True)
    top_mentions = [m for _, m in scored[:8]]

    context = ""
    if top_mentions:
        context = "Top relevant mentions:\n" + "\n".join(
            f"- [{m.id}] {m.title} | {m.sentiment_label} | reach={m.reach} | {m.url}"
            for m in top_mentions
        )

    messages = [
        {
            "role": "system",
            "content": (
                "You are a brand intelligence assistant for media monitoring. "
                "Use provided mentions as grounding context and cite mention ids in square brackets. "
                "Answer in the same language as the user's message.\n\n"
                f"Context:\n{context}"
            ),
        }
    ]

    for msg in history:
        messages.append({"role": msg.role, "content": msg.content})

    client = _get_openai_client()
    response = await client.chat.completions.create(
        model=settings.OPENAI_CHAT_MODEL,
        messages=messages,
        max_tokens=1500,
        temperature=0.7,
    )

    assistant_content = response.choices[0].message.content or "I couldn't generate a response."

    assistant_msg = ChatMessage(
        chat_id=chat.id,
        role="assistant",
        content=assistant_content,
        metadata_json={
            "model": settings.OPENAI_CHAT_MODEL,
            "tokens_used": response.usage.total_tokens if response.usage else None,
            "sources": [m.url for m in top_mentions],
            "source_ids": [m.id for m in top_mentions],
        },
    )
    db.add(assistant_msg)
    await db.flush()

    return {
        "id": assistant_msg.id,
        "chat_id": chat.id,
        "role": "assistant",
        "content": assistant_content,
        "timestamp": assistant_msg.created_at.isoformat() if assistant_msg.created_at else datetime.now(timezone.utc).isoformat(),
        "metadata": assistant_msg.metadata_json,
    }
