from __future__ import annotations

import json
import logging
import re
from collections import Counter
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from langdetect import detect

from app.config import settings

logger = logging.getLogger(__name__)


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


def score_sentiment_gpt(text: str) -> tuple[str, float]:
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
        from openai import OpenAI

        client = OpenAI(api_key=api_key)
        # Sentiment scoring uses a cheap fast model regardless of the chat
        # model — quality of "positive/neutral/negative" doesn't justify gpt-4o
        # cost on every ingested article. Configurable via OPENAI_CHAT_MODEL
        # if the operator wants the same model everywhere.
        sentiment_model = settings.OPENAI_CHAT_MODEL or "gpt-4o-mini"
        response = client.chat.completions.create(
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

