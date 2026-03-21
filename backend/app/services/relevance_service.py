from __future__ import annotations

import re

from app.services.vector_service import cosine_similarity, embed_text


def _expand_terms(values: list[str] | None) -> list[str]:
    out: list[str] = []
    for value in values or []:
        v = str(value).strip().lower()
        if not v:
            continue
        if v not in out:
            out.append(v)
        for tok in re.split(r"[\s,;|]+", v):
            tok = tok.strip()
            if len(tok) >= 3 and tok not in out:
                out.append(tok)
    return out


def keyword_relevance_score(
    text: str,
    include_keywords: list[str],
    exclude_keywords: list[str],
    synonyms: dict[str, list[str]] | None = None,
) -> float:
    sample = (text or "").lower()
    include = set(_expand_terms(include_keywords))
    exclude = set(_expand_terms(exclude_keywords))
    for base, items in (synonyms or {}).items():
        if base in include:
            include.update(_expand_terms(items))

    if exclude and any(term in sample for term in exclude):
        return 0.0
    if not include:
        return 0.5

    hit = 0
    for term in include:
        if term in sample:
            hit += 1
    return min(1.0, hit / max(1, min(len(include), 8)))


async def semantic_relevance_score(text: str, query: str) -> float:
    if not query:
        return 0.0
    a = await embed_text(text[:4000])
    b = await embed_text(query[:1000])
    score = cosine_similarity(a, b)
    return max(0.0, min(1.0, (score + 1.0) / 2.0))


async def relevance_scores(
    text: str,
    *,
    include_keywords: list[str],
    exclude_keywords: list[str],
    synonyms: dict[str, list[str]] | None,
    semantic_query: str,
    keyword_weight: float = 0.7,
    semantic_weight: float = 0.3,
) -> tuple[float, float, float]:
    keyword_score = keyword_relevance_score(text, include_keywords, exclude_keywords, synonyms)
    semantic_score = await semantic_relevance_score(text, semantic_query or " ".join(include_keywords or []))
    final = (keyword_score * keyword_weight) + (semantic_score * semantic_weight)
    return round(keyword_score, 4), round(semantic_score, 4), round(final, 4)

