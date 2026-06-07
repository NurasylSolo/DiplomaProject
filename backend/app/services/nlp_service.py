from __future__ import annotations

import asyncio
import json
import logging
import re
from collections import Counter
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from langdetect import detect

from app.config import settings

logger = logging.getLogger(__name__)

# Process-wide cap on concurrent OpenAI chat calls. Ingestion can run many
# projects/steps at once (scheduler refreshes every project); without a GLOBAL
# bound, hundreds of simultaneous gpt-4o requests saturate the OpenAI rate
# limit and every call balloons from ~1s to 10-85s. This semaphore bounds the
# total in-flight calls across ALL jobs in this process.
_OPENAI_MAX_CONCURRENCY = 5
_openai_semaphore: asyncio.Semaphore | None = None


def _get_openai_semaphore() -> asyncio.Semaphore:
    # Created lazily so it binds to the running event loop.
    global _openai_semaphore
    if _openai_semaphore is None:
        _openai_semaphore = asyncio.Semaphore(_OPENAI_MAX_CONCURRENCY)
    return _openai_semaphore


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

# Plutchik's 8 primary emotions. The keyword lists are intentionally short
# — they're a *fallback* used only when GPT is unreachable (no API key, rate
# limit, network error). Real classification happens in
# ``score_emotions_gpt`` below. Each list mixes English / Russian / Kazakh
# triggers since news sources use any of those.
EMOTION_RULES: dict[str, list[str]] = {
    "joy": ["happy", "joy", "great", "win", "celebrate", "excellent",
            "радость", "счастье", "победа", "праздник", "восторг",
            "қуаныш", "жеңіс", "бақыт"],
    "trust": ["trust", "reliable", "honest", "support", "partnership",
              "доверие", "надёжн", "поддержка", "сотруднич",
              "сенім", "серіктестік"],
    "fear": ["fear", "risk", "threat", "danger", "warn", "anxious",
             "страх", "опасн", "угроза", "тревога", "риск",
             "қорқыныш", "қауіп"],
    "surprise": ["wow", "surprise", "unexpected", "shock", "amaz",
                 "удивлен", "неожидан", "шок",
                 "таңғаларлық", "күтпеген"],
    "sadness": ["sad", "loss", "tragic", "grief", "mourn", "cry",
                "печаль", "грусть", "потеря", "трагед", "скорб",
                "мұң", "қайғы"],
    "disgust": ["disgust", "awful", "shameful", "scandal", "outrage",
                "отвращение", "позор", "скандал", "возмущ",
                "жек көру", "жиренішті"],
    "anger": ["angry", "rage", "hate", "furious", "outrag", "attack",
              "злость", "ярость", "гнев", "ненавист", "конфликт",
              "ашу", "ыза"],
    "anticipation": ["expect", "anticipate", "upcoming", "soon", "future",
                     "ожидание", "надежд", "будущ", "скор", "новинк",
                     "болашақ", "жақында"],
}

# Authoritative list — used everywhere we need "all 8 keys with default 0".
PLUTCHIK_EMOTIONS: tuple[str, ...] = tuple(EMOTION_RULES.keys())


def _empty_emotion_scores() -> dict[str, float]:
    return {emotion: 0.0 for emotion in PLUTCHIK_EMOTIONS}


def _normalise_emotion_dict(raw: dict | None) -> dict[str, float]:
    """Coerce arbitrary emotion payload (from old rule-based runs or a
    flaky GPT response) into a stable 8-key float dict in [0, 1]."""
    out = _empty_emotion_scores()
    if not isinstance(raw, dict):
        return out
    for key in PLUTCHIK_EMOTIONS:
        try:
            value = float(raw.get(key, 0.0))
        except (TypeError, ValueError):
            value = 0.0
        out[key] = max(0.0, min(1.0, round(value, 3)))
    return out

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
    """Cheap rule-based sentiment used as a fallback when OpenAI is unavailable."""
    sample = (text or "").lower()
    pos = sum(1 for token in POSITIVE_MARKERS if token in sample)
    neg = sum(1 for token in NEGATIVE_MARKERS if token in sample)
    if pos > neg:
        return "positive", min(1.0, round(0.2 + (pos - neg) * 0.15, 2))
    if neg > pos:
        return "negative", max(-1.0, round(-0.2 - (neg - pos) * 0.15, 2))
    return "neutral", 0.0


_SENTIMENT_PROMPT = (
    "You are a multilingual news sentiment classifier. "
    "Read the article (title + body) and classify overall sentiment. "
    'Reply with strict JSON only: {"label": "positive"|"neutral"|"negative", "score": number_between_-1_and_1}. '
    "Do not include any other text."
)


async def score_sentiment_gpt(text: str) -> tuple[str, float]:
    """GPT-based sentiment scoring with safe fallback to rule-based.

    Returns (label, score), where score is in [-1, 1]. If OPENAI_API_KEY is
    not configured or the API call fails, falls back to score_sentiment().
    """
    sample = (text or "").strip()
    if not sample:
        return "neutral", 0.0

    api_key = (settings.OPENAI_API_KEY or "").strip()
    if not api_key:
        return score_sentiment(sample)

    try:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=api_key)
        # Sentiment scoring uses a cheap fast model regardless of the chat
        # model — quality of "positive/neutral/negative" doesn't justify gpt-4o
        # cost on every ingested article.
        sentiment_model = settings.OPENAI_SENTIMENT_MODEL or "gpt-4o-mini"
        response = await client.chat.completions.create(
            model=sentiment_model,
            messages=[
                {"role": "system", "content": _SENTIMENT_PROMPT},
                {"role": "user", "content": sample[:4000]},
            ],
            temperature=0.0,
            max_tokens=60,
            response_format={"type": "json_object"},
        )
        content = (response.choices[0].message.content or "").strip()
        data = json.loads(content)
        label = str(data.get("label") or "neutral").strip().lower()
        if label not in {"positive", "neutral", "negative"}:
            label = "neutral"
        try:
            score = float(data.get("score", 0.0))
        except (TypeError, ValueError):
            score = 0.0
        score = max(-1.0, min(1.0, score))
        # Coerce small magnitudes to neutral so the chart isn't noisy.
        if -0.1 <= score <= 0.1 and label != "neutral":
            label = "neutral"
        return label, round(score, 3)
    except Exception as exc:
        logger.warning("GPT sentiment failed, falling back to rule-based: %s", exc)
        return score_sentiment(sample)


def emotion_scores(text: str) -> dict[str, float]:
    """Rule-based emotion scoring — kept as a deterministic fallback when
    GPT is not available. Always returns all 8 Plutchik keys."""
    sample = (text or "").lower()
    scores = _empty_emotion_scores()
    for emotion, markers in EMOTION_RULES.items():
        count = sum(1 for marker in markers if marker in sample)
        # Saturate at 1.0 once we hit ~3 distinct markers — keeps the
        # heuristic monotone without overshooting on long articles.
        scores[emotion] = round(min(1.0, count / 3), 3)
    return scores


_EMOTIONS_PROMPT = (
    "You are an expert emotion analyst for news articles. Score the dominant "
    "emotions expressed BY the article (the tone of the writing) and emotions "
    "the article would likely EVOKE in a typical reader. Use Plutchik's eight "
    "primary emotions. Output STRICT JSON with this exact schema and nothing "
    "else:\n"
    '{"joy": 0.0, "trust": 0.0, "fear": 0.0, "surprise": 0.0, '
    '"sadness": 0.0, "disgust": 0.0, "anger": 0.0, "anticipation": 0.0}\n'
    "Each value MUST be a float in [0.0, 1.0] reflecting the strength of that "
    "emotion (0 = absent, 1 = overwhelming). Multiple emotions can be high. "
    "Match the article's language; the schema keys stay in English."
)


_SENTIMENT_AND_EMOTIONS_PROMPT = (
    "You are a multilingual news analyst. For the given article (title + body) "
    "produce BOTH overall sentiment AND Plutchik's 8 primary emotions in a "
    "single response. Reply with STRICT JSON only, this exact schema and no "
    "other text:\n"
    '{"sentiment": {"label": "positive"|"neutral"|"negative", '
    '"score": number_between_-1_and_1}, '
    '"emotions": {"joy": 0.0, "trust": 0.0, "fear": 0.0, "surprise": 0.0, '
    '"sadness": 0.0, "disgust": 0.0, "anger": 0.0, "anticipation": 0.0}}\n'
    "Sentiment score is in [-1, 1] (negative..positive). Each emotion is in "
    "[0, 1] (0 = absent, 1 = overwhelming); multiple may be high. Match the "
    "article's language; schema keys stay in English."
)


async def score_sentiment_and_emotions_gpt(
    text: str,
) -> tuple[str, float, dict[str, float]]:
    """Single GPT call that returns BOTH sentiment and emotions.

    Halves the per-article OpenAI cost vs. calling ``score_sentiment_gpt`` and
    ``score_emotions_gpt`` separately. Falls back to the rule-based scorers
    for both fields if the API key is missing or the call fails.
    """
    sample = (text or "").strip()
    if not sample:
        return "neutral", 0.0, _empty_emotion_scores()

    api_key = (settings.OPENAI_API_KEY or "").strip()
    if not api_key:
        label, score = score_sentiment(sample)
        return label, score, emotion_scores(sample)

    try:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=api_key)
        # Use the lightweight sentiment model (gpt-4o-mini by default): this
        # runs once PER ARTICLE, so the heavy chat model would make ingestion
        # extremely slow and expensive.
        model = settings.OPENAI_SENTIMENT_MODEL or "gpt-4o-mini"
        async with _get_openai_semaphore():
            response = await client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": _SENTIMENT_AND_EMOTIONS_PROMPT},
                    {"role": "user", "content": sample[:4000]},
                ],
                temperature=0.0,
                max_tokens=200,
                response_format={"type": "json_object"},
                timeout=30,
            )
        content = (response.choices[0].message.content or "").strip()
        data = json.loads(content)

        sent = data.get("sentiment") or {}
        label = str(sent.get("label") or "neutral").strip().lower()
        if label not in {"positive", "neutral", "negative"}:
            label = "neutral"
        try:
            score = float(sent.get("score", 0.0))
        except (TypeError, ValueError):
            score = 0.0
        score = max(-1.0, min(1.0, score))
        if -0.1 <= score <= 0.1 and label != "neutral":
            label = "neutral"

        emotions = _normalise_emotion_dict(data.get("emotions"))
        return label, round(score, 3), emotions
    except Exception as exc:
        logger.warning(
            "GPT combined sentiment+emotions failed, falling back to rule-based: %s",
            exc,
        )
        label, score = score_sentiment(sample)
        return label, score, emotion_scores(sample)


async def score_emotions_gpt(text: str) -> dict[str, float]:
    """GPT classification of all 8 Plutchik emotions for a single text.

    - Returns a stable 8-key dict of floats in ``[0, 1]``.
    - Falls back to :func:`emotion_scores` (rule-based) if the OpenAI key
      is missing or the call fails — callers therefore never have to
      handle ``None``.
    - Uses the same lightweight ``gpt-4o-mini``-class model as the
      sentiment scorer, so per-mention cost stays minimal.
    """
    sample = (text or "").strip()
    if not sample:
        return _empty_emotion_scores()

    api_key = (settings.OPENAI_API_KEY or "").strip()
    if not api_key:
        return emotion_scores(sample)

    try:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=api_key)
        emo_model = settings.OPENAI_SENTIMENT_MODEL or "gpt-4o-mini"
        response = await client.chat.completions.create(
            model=emo_model,
            messages=[
                {"role": "system", "content": _EMOTIONS_PROMPT},
                {"role": "user", "content": sample[:4000]},
            ],
            temperature=0.0,
            max_tokens=140,
            response_format={"type": "json_object"},
        )
        content = (response.choices[0].message.content or "").strip()
        data = json.loads(content)
        return _normalise_emotion_dict(data)
    except Exception as exc:
        logger.warning(
            "GPT emotion classification failed, falling back to rule-based: %s",
            exc,
        )
        return emotion_scores(sample)


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


# ---------------------------------------------------------------------------
# Country normalisation — ISO 3166‑1 alpha‑2 codes for everything that ships
# from APIs / domain heuristics in any language (EN/RU/KZ + few more).
# ---------------------------------------------------------------------------

_COUNTRY_NORMALIZE: dict[str, str] = {
    # ISO‑2 passthrough (both upper and lower covered automatically below)
    "US": "US", "GB": "GB", "UK": "GB", "RU": "RU", "KZ": "KZ", "DE": "DE",
    "FR": "FR", "ES": "ES", "IT": "IT", "CA": "CA", "AU": "AU", "JP": "JP",
    "CN": "CN", "IN": "IN", "BR": "BR", "MX": "MX", "TR": "TR", "UA": "UA",
    "BY": "BY", "UZ": "UZ", "KG": "KG", "TJ": "TJ", "AZ": "AZ", "AM": "AM",
    "PL": "PL", "CZ": "CZ", "NL": "NL", "SE": "SE", "FI": "FI", "NO": "NO",
    "DK": "DK", "AT": "AT", "BE": "BE", "CH": "CH", "PT": "PT", "GR": "GR",
    "IE": "IE", "RO": "RO", "HU": "HU", "BG": "BG", "RS": "RS", "HR": "HR",
    "SK": "SK", "SI": "SI", "EE": "EE", "LT": "LT", "LV": "LV", "IS": "IS",
    "KR": "KR", "KP": "KP", "TW": "TW", "HK": "HK", "SG": "SG", "MY": "MY",
    "TH": "TH", "ID": "ID", "PH": "PH", "VN": "VN", "PK": "PK", "BD": "BD",
    "IR": "IR", "IQ": "IQ", "SA": "SA", "AE": "AE", "QA": "QA", "KW": "KW",
    "OM": "OM", "BH": "BH", "JO": "JO", "LB": "LB", "SY": "SY", "YE": "YE",
    "EG": "EG", "MA": "MA", "DZ": "DZ", "TN": "TN", "LY": "LY",
    "NG": "NG", "ZA": "ZA", "KE": "KE", "ET": "ET", "GH": "GH",
    "AR": "AR", "CL": "CL", "PE": "PE", "CO": "CO", "VE": "VE", "EC": "EC",
    "NZ": "NZ", "IL": "IL", "MN": "MN", "GE": "GE", "MD": "MD",
    # English names
    "united states": "US", "united states of america": "US", "usa": "US",
    "united kingdom": "GB", "great britain": "GB", "britain": "GB",
    "england": "GB", "scotland": "GB", "wales": "GB",
    "russia": "RU", "russian federation": "RU",
    "kazakhstan": "KZ", "republic of kazakhstan": "KZ",
    "germany": "DE", "deutschland": "DE",
    "france": "FR", "spain": "ES", "italy": "IT", "canada": "CA",
    "australia": "AU", "japan": "JP", "china": "CN", "india": "IN",
    "brazil": "BR", "mexico": "MX", "turkey": "TR", "ukraine": "UA",
    "belarus": "BY", "uzbekistan": "UZ", "kyrgyzstan": "KG",
    "tajikistan": "TJ", "azerbaijan": "AZ", "armenia": "AM",
    "poland": "PL", "czech republic": "CZ", "czechia": "CZ",
    "netherlands": "NL", "sweden": "SE", "finland": "FI", "norway": "NO",
    "denmark": "DK", "austria": "AT", "belgium": "BE", "switzerland": "CH",
    "portugal": "PT", "greece": "GR", "ireland": "IE",
    "south korea": "KR", "korea": "KR", "republic of korea": "KR",
    "north korea": "KP", "taiwan": "TW", "hong kong": "HK",
    "singapore": "SG", "malaysia": "MY", "thailand": "TH",
    "indonesia": "ID", "philippines": "PH", "vietnam": "VN",
    "pakistan": "PK", "bangladesh": "BD", "iran": "IR", "iraq": "IQ",
    "saudi arabia": "SA", "uae": "AE", "united arab emirates": "AE",
    "qatar": "QA", "kuwait": "KW", "egypt": "EG",
    "morocco": "MA", "nigeria": "NG", "south africa": "ZA",
    "kenya": "KE", "ethiopia": "ET", "argentina": "AR", "chile": "CL",
    "peru": "PE", "colombia": "CO", "venezuela": "VE",
    "new zealand": "NZ", "israel": "IL", "mongolia": "MN",
    "georgia": "GE", "moldova": "MD",
    # Russian names
    "сша": "US", "соединенные штаты": "US", "соединённые штаты": "US",
    "великобритания": "GB", "англия": "GB", "британия": "GB",
    "россия": "RU", "российская федерация": "RU",
    "казахстан": "KZ", "республика казахстан": "KZ",
    "германия": "DE", "франция": "FR", "испания": "ES", "италия": "IT",
    "канада": "CA", "австралия": "AU", "япония": "JP", "китай": "CN",
    "индия": "IN", "бразилия": "BR", "мексика": "MX", "турция": "TR",
    "украина": "UA", "беларусь": "BY", "белоруссия": "BY",
    "узбекистан": "UZ", "киргизия": "KG", "кыргызстан": "KG",
    "таджикистан": "TJ", "азербайджан": "AZ", "армения": "AM",
    "польша": "PL", "чехия": "CZ", "нидерланды": "NL", "голландия": "NL",
    "швеция": "SE", "финляндия": "FI", "норвегия": "NO", "дания": "DK",
    "австрия": "AT", "бельгия": "BE", "швейцария": "CH",
    "португалия": "PT", "греция": "GR", "ирландия": "IE",
    "южная корея": "KR", "корея": "KR", "северная корея": "KP",
    "тайвань": "TW", "гонконг": "HK", "сингапур": "SG",
    "малайзия": "MY", "таиланд": "TH", "индонезия": "ID",
    "филиппины": "PH", "вьетнам": "VN", "пакистан": "PK",
    "бангладеш": "BD", "иран": "IR", "ирак": "IQ",
    "саудовская аравия": "SA", "оаэ": "AE", "катар": "QA", "кувейт": "KW",
    "египет": "EG", "марокко": "MA", "нигерия": "NG",
    "юар": "ZA", "южная африка": "ZA", "кения": "KE", "эфиопия": "ET",
    "аргентина": "AR", "чили": "CL", "перу": "PE", "колумбия": "CO",
    "венесуэла": "VE", "новая зеландия": "NZ", "израиль": "IL",
    "монголия": "MN", "грузия": "GE", "молдова": "MD",
    # Kazakh names
    "қазақстан": "KZ", "ресей": "RU", "ақш": "US", "қытай": "CN",
    "германия": "DE", "ұлыбритания": "GB", "франция": "FR",
    "түркия": "TR", "жапония": "JP", "үндістан": "IN",
    "өзбекстан": "UZ", "қырғызстан": "KG", "тәжікстан": "TJ",
}


def normalize_country(raw: str | None) -> str:
    """Return ISO 3166‑1 alpha‑2 country code, or "XX" if unknown.

    Accepts ISO codes (any case), full English/Russian/Kazakh names,
    and common variants. Used everywhere so a single value flows through
    ingestion → analytics → frontend.
    """
    if not raw:
        return "XX"
    cleaned = str(raw).strip()
    if not cleaned:
        return "XX"
    upper = cleaned.upper()
    if upper in _COUNTRY_NORMALIZE:
        return _COUNTRY_NORMALIZE[upper]
    lower = cleaned.lower()
    if lower in _COUNTRY_NORMALIZE:
        return _COUNTRY_NORMALIZE[lower]
    # Two‑letter unknown? assume already an ISO code.
    if len(cleaned) == 2 and cleaned.isalpha():
        return upper
    return "XX"

