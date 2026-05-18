from __future__ import annotations

import math

from openai import AsyncOpenAI

from app.config import settings


_client = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


async def embed_text(text: str) -> list[float]:
    if not settings.ENABLE_RAG_EMBEDDINGS or not settings.OPENAI_API_KEY:
        return _hash_embedding(text)
    client = _get_client()
    response = await client.embeddings.create(
        model=settings.OPENAI_EMBEDDING_MODEL,
        input=text[:8000],
    )
    return list(response.data[0].embedding)


async def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed many texts in a single OpenAI request.

    Returns one vector per input, in the same order. Falls back to the
    deterministic hash-embedding for every input when RAG is disabled or
    the API key is missing — keeps callers free of None-handling.
    """
    if not texts:
        return []
    if not settings.ENABLE_RAG_EMBEDDINGS or not settings.OPENAI_API_KEY:
        return [_hash_embedding(t) for t in texts]
    client = _get_client()
    inputs = [(t or "")[:8000] for t in texts]
    response = await client.embeddings.create(
        model=settings.OPENAI_EMBEDDING_MODEL,
        input=inputs,
    )
    return [list(item.embedding) for item in response.data]


def cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b:
        return 0.0
    length = min(len(a), len(b))
    a = a[:length]
    b = b[:length]
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def _hash_embedding(text: str, dim: int = 64) -> list[float]:
    vec = [0.0] * dim
    for token in (text or "").lower().split():
        idx = abs(hash(token)) % dim
        vec[idx] += 1.0
    norm = math.sqrt(sum(x * x for x in vec)) or 1.0
    return [x / norm for x in vec]

