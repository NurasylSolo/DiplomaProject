from __future__ import annotations

from app.services.nlp_service import (
    emotion_scores,
    extract_entities,
    score_sentiment,
    topic_tags,
)


def detect_sentiment_multilingual(text: str) -> tuple[str, float]:
    # Placeholder for transformer head (XLM-R style) with deterministic fallback.
    return score_sentiment(text)


def detect_entities_multilingual(text: str) -> list[dict]:
    return extract_entities(text)


def detect_topics_multilingual(text: str, keywords: list[str] | None = None) -> list[str]:
    return topic_tags(text, keywords or [])


def detect_emotions_multilabel(text: str) -> dict[str, float]:
    return emotion_scores(text)

