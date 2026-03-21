from __future__ import annotations

import re
from collections import Counter
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from langdetect import detect


POSITIVE_MARKERS = [
    "good",
    "great",
    "success",
    "рост",
    "успех",
    "позитив",
    "жақсы",
    "тамаша",
]
NEGATIVE_MARKERS = [
    "bad",
    "crisis",
    "fail",
    "провал",
    "кризис",
    "негатив",
    "жаман",
    "қауіп",
]

EMOTION_RULES: dict[str, list[str]] = {
    "joy": ["happy", "great", "қуаныш", "радость", "excellent"],
    "anger": ["angry", "rage", "злость", "ашу", "hate"],
    "sadness": ["sad", "loss", "печаль", "мұң", "depress"],
    "surprise": ["wow", "surprise", "неожидан", "таңғаларлық"],
    "fear": ["fear", "risk", "опасн", "қорқыныш", "threat"],
}

ENTITY_PATTERNS = [
    ("ORG", r"\b[A-Z][A-Za-z0-9&\-]{2,}\b"),
    ("URL", r"https?://[^\s]+"),
    ("HASHTAG", r"#[\w_]+"),
    ("MENTION", r"@[\w_]+"),
]


def normalize_text(text: str) -> str:
    text = re.sub(r"\s+", " ", text or "").strip().lower()
    text = re.sub(r"[^\w\sа-яәіңғүұқөһa-z0-9#@:/\.\-]", "", text)
    return text


def canonicalize_url(url: str) -> str:
    if not url:
        return ""
    raw = url.strip()
    parsed = urlparse(raw)
    # Keep only stable query params and drop tracking junk.
    drop_prefixes = ("utm_",)
    drop_exact = {"fbclid", "gclid", "yclid", "mc_cid", "mc_eid", "igshid", "ref", "ref_src"}
    clean_q = []
    for key, value in parse_qsl(parsed.query, keep_blank_values=False):
        k = key.lower()
        if k in drop_exact:
            continue
        if any(k.startswith(prefix) for prefix in drop_prefixes):
            continue
        clean_q.append((key, value))
    query = urlencode(clean_q, doseq=True)
    normalized_path = re.sub(r"/{2,}", "/", parsed.path or "/").rstrip("/") or "/"
    normalized = parsed._replace(
        scheme=(parsed.scheme or "https").lower(),
        netloc=(parsed.netloc or "").lower(),
        path=normalized_path,
        query=query,
        fragment="",
    )
    return urlunparse(normalized)


def detect_language(text: str, fallback: str = "ru") -> str:
    sample = (text or "").strip()
    if len(sample) < 15:
        return fallback
    try:
        return detect(sample)
    except Exception:
        return fallback


def score_sentiment(text: str) -> tuple[str, float]:
    sample = (text or "").lower()
    pos = sum(1 for token in POSITIVE_MARKERS if token in sample)
    neg = sum(1 for token in NEGATIVE_MARKERS if token in sample)
    if pos > neg:
        return "positive", min(1.0, round(0.2 + (pos - neg) * 0.15, 2))
    if neg > pos:
        return "negative", max(-1.0, round(-0.2 - (neg - pos) * 0.15, 2))
    return "neutral", 0.0


def emotion_scores(text: str) -> dict[str, float]:
    sample = (text or "").lower()
    scores: dict[str, float] = {}
    for emotion, markers in EMOTION_RULES.items():
        count = sum(1 for marker in markers if marker in sample)
        scores[emotion] = round(min(1.0, count / 3), 3)
    return scores


def extract_entities(text: str) -> list[dict]:
    entities: list[dict] = []
    for entity_type, pattern in ENTITY_PATTERNS:
        for match in re.finditer(pattern, text or ""):
            entities.append(
                {
                    "type": entity_type,
                    "value": match.group(0),
                    "start": match.start(),
                    "end": match.end(),
                    "confidence": 0.55 if entity_type == "ORG" else 0.8,
                }
            )
    return entities[:100]


def topic_tags(text: str, keywords: list[str]) -> list[str]:
    words = re.findall(r"[\w#@]{3,}", (text or "").lower())
    cnt = Counter(words)
    ranked = [w for w, _ in cnt.most_common(8)]
    kw = [k.lower() for k in keywords or [] if k]
    merged = []
    for token in ranked + kw:
        if token not in merged:
            merged.append(token)
    return merged[:12]

