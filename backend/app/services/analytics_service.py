import re
from collections import Counter
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import case, select, func, and_, extract
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.mention import Mention
from app.models.topic import Topic
from app.models.source import Source
from app.services import nlp_service


def _safe_zone(name: str | None) -> str:
    """Validate IANA timezone string; fall back to UTC for unknown / empty
    inputs so we never blow up on a malformed query parameter."""
    candidate = (name or "UTC").strip() or "UTC"
    try:
        ZoneInfo(candidate)
        return candidate
    except (ZoneInfoNotFoundError, ValueError, KeyError):
        return "UTC"


def _parse_date(raw: str | None) -> datetime | None:
    """Parse ISO datetime, defaulting to UTC when no tz is present."""
    if not raw:
        return None
    raw = raw.strip().replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(raw)
    except ValueError:
        try:
            dt = datetime.strptime(raw[:19], "%Y-%m-%dT%H:%M:%S")
        except ValueError:
            return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def _date_window(query, date_from: str | None, date_to: str | None):
    """Apply optional date_from/date_to filters to a Mention query."""
    df = _parse_date(date_from)
    dt = _parse_date(date_to)
    if df is not None:
        query = query.where(Mention.published_at >= df)
    if dt is not None:
        query = query.where(Mention.published_at <= dt)
    return query


# ---------------------------------------------------------------------------
# Stop-word lists for keyword extraction. Kept short and project-agnostic
# so popular pronouns / prepositions in EN/RU/KZ don't dominate the cloud.
# ---------------------------------------------------------------------------
_STOPWORDS: set[str] = {
    # English
    "the", "and", "for", "are", "with", "you", "this", "that", "from", "have",
    "has", "had", "will", "can", "but", "not", "all", "your", "our", "they",
    "them", "their", "out", "into", "about", "more", "than", "then", "after",
    "before", "what", "when", "where", "who", "how", "why", "his", "her",
    "she", "him", "its", "was", "were", "been", "being", "also", "just",
    "any", "such", "some", "one", "two", "very", "much", "may", "should",
    "would", "could", "did", "does", "say", "said", "says", "now", "new",
    "yet", "via", "etc",
    # Russian
    "что", "как", "это", "для", "так", "его", "ему", "она", "они", "тот",
    "там", "тут", "вот", "уже", "ещё", "еще", "был", "была", "было", "быть",
    "при", "под", "над", "над", "без", "через", "также", "тоже", "очень",
    "если", "или", "либо", "либо", "там", "вон", "тогда", "потом", "почти",
    "будет", "будут", "будем", "может", "могут", "сейчас", "снова", "после",
    "перед", "между", "около", "нет", "да", "ещё", "ещё", "вся", "весь",
    "все", "всё", "всех", "всем", "всеми", "наш", "ваш", "мой", "твой",
    "его", "её", "их", "этот", "эта", "эти", "этих", "этим", "этой",
    "там", "здесь", "когда", "куда", "оттуда", "сегодня", "вчера", "завтра",
    "годе", "году", "дня", "лет", "год", "лет", "это", "эту", "этого",
    # Kazakh
    "және", "бірақ", "осы", "бұл", "бар", "жоқ", "болады", "болған", "болмайды",
    "сол", "сондай", "оның", "оған", "оны", "одан", "оған", "оның", "сол",
    "арқылы", "үшін", "емес", "тағы", "тек", "тағы", "немесе", "сондықтан",
}


def _extract_keywords(text: str) -> list[str]:
    """Return tokens from `text` that are not pure numbers, not stop-words,
    and length >= 4 (to avoid noise like 'kg', 'us', 'rt' etc)."""
    if not text:
        return []
    tokens = re.findall(r"[#\wа-яё\-]{4,30}", text.lower(), re.UNICODE)
    out: list[str] = []
    for tok in tokens:
        if tok.isdigit():
            continue
        if tok in _STOPWORDS:
            continue
        out.append(tok)
    return out


_COUNTRY_DISPLAY_NAMES: dict[str, str] = {
    "US": "United States", "GB": "United Kingdom", "DE": "Germany", "FR": "France",
    "ES": "Spain", "IT": "Italy", "RU": "Russia", "KZ": "Kazakhstan", "UA": "Ukraine",
    "BY": "Belarus", "UZ": "Uzbekistan", "KG": "Kyrgyzstan", "TJ": "Tajikistan",
    "CA": "Canada", "AU": "Australia", "JP": "Japan", "CN": "China", "IN": "India",
    "BR": "Brazil", "MX": "Mexico", "TR": "Turkey", "PL": "Poland", "NL": "Netherlands",
    "SE": "Sweden", "FI": "Finland", "NO": "Norway", "DK": "Denmark", "AT": "Austria",
    "BE": "Belgium", "CH": "Switzerland", "PT": "Portugal", "GR": "Greece",
    "IE": "Ireland", "KR": "South Korea", "HK": "Hong Kong", "SG": "Singapore",
    "MY": "Malaysia", "TH": "Thailand", "ID": "Indonesia", "PH": "Philippines",
    "VN": "Vietnam", "PK": "Pakistan", "IR": "Iran", "IQ": "Iraq", "SA": "Saudi Arabia",
    "AE": "United Arab Emirates", "QA": "Qatar", "EG": "Egypt", "MA": "Morocco",
    "NG": "Nigeria", "ZA": "South Africa", "KE": "Kenya", "AR": "Argentina",
    "CL": "Chile", "PE": "Peru", "CO": "Colombia", "NZ": "New Zealand",
    "IL": "Israel", "MN": "Mongolia", "GE": "Georgia", "MD": "Moldova",
    "AZ": "Azerbaijan", "AM": "Armenia",
}


async def get_geo_data(
    db: AsyncSession,
    project_id: str,
    date_from: str | None = None,
    date_to: str | None = None,
) -> list:
    """Aggregated mentions per ISO‑2 country.

    The DB column `Mention.country` is mostly already normalized, but in
    older rows it may still contain raw "USA" / "Россия" / "kz" — so we
    re‑normalize and merge counts here so the geo map / countries table
    never has duplicate rows for the same country.
    """
    base = (
        select(
            Mention.country,
            func.count(Mention.id).label("mentions"),
            func.coalesce(func.sum(Mention.reach), 0).label("reach"),
            func.count(Mention.id).filter(Mention.sentiment_label == "positive").label("positive"),
            func.count(Mention.id).filter(Mention.sentiment_label == "neutral").label("neutral"),
            func.count(Mention.id).filter(Mention.sentiment_label == "negative").label("negative"),
        )
        .where(Mention.project_id == project_id)
    )
    base = _date_window(base, date_from, date_to).group_by(Mention.country)
    result = await db.execute(base)
    rows = result.all()

    aggregated: dict[str, dict] = {}
    for row in rows:
        code = nlp_service.normalize_country(row.country)
        bucket = aggregated.setdefault(
            code,
            {
                "mentions": 0,
                "reach": 0,
                "positive": 0,
                "neutral": 0,
                "negative": 0,
            },
        )
        bucket["mentions"] += int(row.mentions or 0)
        bucket["reach"] += int(row.reach or 0)
        bucket["positive"] += int(row.positive or 0)
        bucket["neutral"] += int(row.neutral or 0)
        bucket["negative"] += int(row.negative or 0)

    output = []
    for code, agg in aggregated.items():
        if code == "XX":
            display = "Unknown"
        else:
            display = _COUNTRY_DISPLAY_NAMES.get(code, code)
        output.append(
            {
                "country": display,
                "country_code": code,
                "mentions": agg["mentions"],
                "reach": agg["reach"],
                "sentiment": {
                    "positive": agg["positive"],
                    "neutral": agg["neutral"],
                    "negative": agg["negative"],
                },
            }
        )

    output.sort(key=lambda x: x["mentions"], reverse=True)
    return output


async def get_hot_hours(
    db: AsyncSession,
    project_id: str,
    *,
    timezone: str = "UTC",
    date_from: str | None = None,
    date_to: str | None = None,
) -> dict:
    """Per-(day-of-week, hour) aggregates with reach + sentiment, all
    bucketed in the caller's IANA timezone (defaults to UTC).

    Postgres expression: ``timezone(zone, ts_with_tz)`` returns a naive
    timestamp shifted into the requested zone, after which ``extract`` gives
    the right local day-of-week / hour. So the same UTC-stored mention
    appears in different cells depending on the caller's tz, which is what
    the user wants on the Hot Hours page.

    Returns:
        {
          "timezone": str,
          "total_mentions": int,
          "cells": [{day, hour, mentions, reach, avg_sentiment,
                     positive, neutral, negative}],
          "peak": {day, hour, mentions} | None,
          "top_cells": [...up to 5...],
          "active_days": [{day, mentions}]    # sorted desc, all 7 days
          "quietest_cells": [...3 lowest non-zero cells...]
        }
    """
    tz = _safe_zone(timezone)
    local_ts = func.timezone(tz, Mention.published_at)
    day_col = extract("dow", local_ts)
    hour_col = extract("hour", local_ts)

    pos_case = func.sum(case((Mention.sentiment_label == "positive", 1), else_=0))
    neu_case = func.sum(case((Mention.sentiment_label == "neutral", 1), else_=0))
    neg_case = func.sum(case((Mention.sentiment_label == "negative", 1), else_=0))

    query = (
        select(
            day_col.label("day"),
            hour_col.label("hour"),
            func.count(Mention.id).label("mentions"),
            func.coalesce(func.sum(Mention.reach), 0).label("reach"),
            func.coalesce(func.avg(Mention.sentiment_score), 0.0).label(
                "avg_sentiment"
            ),
            pos_case.label("positive"),
            neu_case.label("neutral"),
            neg_case.label("negative"),
        )
        .where(Mention.project_id == project_id)
        .group_by("day", "hour")
        .order_by("day", "hour")
    )
    query = _date_window(query, date_from, date_to)

    rows = (await db.execute(query)).all()

    cells = [
        {
            "day": int(r.day),
            "hour": int(r.hour),
            "mentions": int(r.mentions or 0),
            "reach": int(r.reach or 0),
            "avg_sentiment": round(float(r.avg_sentiment or 0.0), 3),
            "positive": int(r.positive or 0),
            "neutral": int(r.neutral or 0),
            "negative": int(r.negative or 0),
        }
        for r in rows
        if int(r.mentions or 0) > 0
    ]
    total = sum(c["mentions"] for c in cells)

    sorted_by_mentions = sorted(cells, key=lambda c: c["mentions"], reverse=True)
    peak = sorted_by_mentions[0] if sorted_by_mentions else None
    top_cells = sorted_by_mentions[:5]
    quietest = sorted(cells, key=lambda c: c["mentions"])[:3]

    # Sum mentions per day-of-week — show all 7 days even when zero so the
    # frontend doesn't have to gap-fill.
    per_day: dict[int, int] = {d: 0 for d in range(7)}
    for c in cells:
        per_day[c["day"]] += c["mentions"]
    active_days = sorted(
        [{"day": d, "mentions": m} for d, m in per_day.items()],
        key=lambda x: x["mentions"],
        reverse=True,
    )

    return {
        "timezone": tz,
        "total_mentions": total,
        "cells": cells,
        "peak": peak,
        "top_cells": top_cells,
        "active_days": active_days,
        "quietest_cells": quietest,
    }


async def get_emotions_data(db: AsyncSession, project_id: str) -> dict:
    result = await db.execute(
        select(Mention.emotions)
        .where(Mention.project_id == project_id, Mention.emotions.isnot(None))
    )
    rows = result.scalars().all()

    totals = {"joy": 0.0, "anger": 0.0, "sadness": 0.0, "surprise": 0.0, "fear": 0.0}
    count = len(rows)

    for emotions in rows:
        if isinstance(emotions, dict):
            for key in totals:
                totals[key] += emotions.get(key, 0.0)

    if count > 0:
        for key in totals:
            totals[key] = round(totals[key] / count, 3)

    return {"averages": totals, "total_analyzed": count}


async def get_topics_data(
    db: AsyncSession,
    project_id: str,
    date_from: str | None = None,
    date_to: str | None = None,
) -> list:
    """Return per-topic aggregates (mentions, reach, sentiment split, SoV)
    for the project's topics over the optional date window.

    Implementation: three queries total, regardless of how many topics
    the project has —
      1. list of Topic rows (for name / description / created_at metadata),
      2. total mentions in the window (for share-of-voice denominator),
      3. one ``GROUP BY topic_id`` over ``mentions`` with conditional
         aggregates (``COUNT(*) FILTER (WHERE sentiment_label = ...)``).
    Previously this was ``2 + 5N`` queries — at 50 topics that's 252
    round-trips per Analysis page load.
    """
    topic_rows = (
        await db.execute(
            select(Topic)
            .where(Topic.project_id == project_id)
            .order_by(Topic.created_at.desc())
        )
    ).scalars().all()

    total_q = await db.execute(
        _date_window(
            select(func.count(Mention.id)).where(Mention.project_id == project_id),
            date_from,
            date_to,
        )
    )
    # Keep the previous semantics: when there are no mentions, divide by 1
    # to avoid ZeroDivisionError in share-of-voice. The actual displayed
    # SoV will still be 0% because every topic's mentions_count is also 0.
    total_mentions = int(total_q.scalar() or 0) or 1

    agg_q = (
        select(
            Mention.topic_id.label("topic_id"),
            func.count(Mention.id).label("mentions_count"),
            func.coalesce(func.sum(Mention.reach), 0).label("reach"),
            func.count(Mention.id)
                .filter(Mention.sentiment_label == "positive")
                .label("positive"),
            func.count(Mention.id)
                .filter(Mention.sentiment_label == "neutral")
                .label("neutral"),
            func.count(Mention.id)
                .filter(Mention.sentiment_label == "negative")
                .label("negative"),
        )
        .where(
            Mention.project_id == project_id,
            Mention.topic_id.is_not(None),
        )
        .group_by(Mention.topic_id)
    )
    agg_q = _date_window(agg_q, date_from, date_to)
    agg_rows = (await db.execute(agg_q)).all()

    # Map topic_id -> aggregates. Topics with no mentions in the window
    # simply won't appear here and get zero-filled below.
    agg_by_topic: dict[str, dict] = {
        r.topic_id: {
            "mentions_count": int(r.mentions_count or 0),
            "reach": int(r.reach or 0),
            "positive": int(r.positive or 0),
            "neutral": int(r.neutral or 0),
            "negative": int(r.negative or 0),
        }
        for r in agg_rows
    }

    topics_data: list[dict] = []
    for topic in topic_rows:
        agg = agg_by_topic.get(
            topic.id,
            {"mentions_count": 0, "reach": 0, "positive": 0, "neutral": 0, "negative": 0},
        )
        mentions_count = agg["mentions_count"]
        topics_data.append({
            "id": topic.id,
            "project_id": topic.project_id,
            "name": topic.name,
            "description": topic.description,
            "parent_topic_id": topic.parent_topic_id,
            "mentions_count": mentions_count,
            "reach": agg["reach"],
            "share_of_voice": (
                round((mentions_count / total_mentions) * 100, 1)
                if total_mentions
                else 0.0
            ),
            "sentiment_distribution": {
                "positive": agg["positive"],
                "neutral": agg["neutral"],
                "negative": agg["negative"],
            },
            "trend": [],
            "created_at": topic.created_at.isoformat() if topic.created_at else "",
        })

    return topics_data


async def get_comparison(
    db: AsyncSession,
    project_id: str,
    comp_type: str,
    item_ids: list[str],
    date_from: str | None = None,
    date_to: str | None = None,
) -> dict:
    """Side-by-side comparison of multiple projects (or topics).

    For each ``item_id`` returns:
      - real project name (looked up from DB)
      - 8 numeric metrics (filter-aware): total_mentions, total_reach,
        positive_pct, neutral_pct, negative_pct, avg_influence,
        avg_sentiment, share_of_voice
      - per-item sentiment_distribution dict (positive/neutral/negative counts)
      - per-item time_series array (last 30 days, daily mentions)
    """
    from app.models.project import Project  # local import to avoid cycle

    if not item_ids:
        return {"type": comp_type, "items": [], "metrics": [], "time_series": []}

    df = _parse_date(date_from)
    dt = _parse_date(date_to)

    # Real project names in one query.
    name_rows = (
        await db.execute(
            select(Project.id, Project.name).where(Project.id.in_(item_ids))
        )
    ).all()
    name_map: dict[str, str] = {row.id: row.name for row in name_rows}

    metrics_data: dict[str, list] = {
        "total_mentions": [],
        "total_reach": [],
        "positive_pct": [],
        "neutral_pct": [],
        "negative_pct": [],
        "avg_influence": [],
        "avg_sentiment": [],
        "share_of_voice": [],
    }

    items: list[dict] = []
    sentiment_dist: list[dict] = []
    time_series_per_item: list[dict] = []

    # Helper that applies the same date window to every per-item query.
    def _apply_window(q):
        if df is not None:
            q = q.where(Mention.published_at >= df)
        if dt is not None:
            q = q.where(Mention.published_at <= dt)
        return q

    # Pre-compute total mentions across ALL compared items for share_of_voice.
    totals_per_item: dict[str, int] = {}
    for item_id in item_ids:
        q = _apply_window(
            select(func.count(Mention.id)).where(Mention.project_id == item_id)
        )
        totals_per_item[item_id] = int((await db.execute(q)).scalar() or 0)
    grand_total = sum(totals_per_item.values()) or 1

    # 30-day window for the per-item time-series chart.
    ts_start = df if df is not None else (datetime.now(timezone.utc) - timedelta(days=30))
    ts_end = dt

    for item_id in item_ids:
        total = totals_per_item.get(item_id, 0)

        reach = int(
            (
                await db.execute(
                    _apply_window(
                        select(func.coalesce(func.sum(Mention.reach), 0)).where(
                            Mention.project_id == item_id
                        )
                    )
                )
            ).scalar() or 0
        )
        pos = int(
            (
                await db.execute(
                    _apply_window(
                        select(func.count(Mention.id)).where(
                            Mention.project_id == item_id,
                            Mention.sentiment_label == "positive",
                        )
                    )
                )
            ).scalar() or 0
        )
        neu = int(
            (
                await db.execute(
                    _apply_window(
                        select(func.count(Mention.id)).where(
                            Mention.project_id == item_id,
                            Mention.sentiment_label == "neutral",
                        )
                    )
                )
            ).scalar() or 0
        )
        neg = int(
            (
                await db.execute(
                    _apply_window(
                        select(func.count(Mention.id)).where(
                            Mention.project_id == item_id,
                            Mention.sentiment_label == "negative",
                        )
                    )
                )
            ).scalar() or 0
        )
        avg_inf = float(
            (
                await db.execute(
                    _apply_window(
                        select(func.coalesce(func.avg(Mention.influence_score), 0)).where(
                            Mention.project_id == item_id
                        )
                    )
                )
            ).scalar() or 0
        )
        avg_sent = float(
            (
                await db.execute(
                    _apply_window(
                        select(func.coalesce(func.avg(Mention.sentiment_score), 0.0)).where(
                            Mention.project_id == item_id
                        )
                    )
                )
            ).scalar() or 0
        )

        # Per-item daily time series for the line chart.
        ts_q = (
            select(
                func.date(Mention.published_at).label("date"),
                func.count(Mention.id).label("count"),
            )
            .where(Mention.project_id == item_id)
        )
        ts_q = ts_q.where(Mention.published_at >= ts_start)
        if ts_end is not None:
            ts_q = ts_q.where(Mention.published_at <= ts_end)
        ts_q = ts_q.group_by(func.date(Mention.published_at)).order_by(
            func.date(Mention.published_at)
        )
        ts_rows = (await db.execute(ts_q)).all()
        series = [{"date": str(r.date), "mentions": int(r.count or 0)} for r in ts_rows]

        items.append({"id": item_id, "name": name_map.get(item_id, f"Project {item_id[:8]}")})

        metrics_data["total_mentions"].append({"itemId": item_id, "value": total})
        metrics_data["total_reach"].append({"itemId": item_id, "value": reach})
        metrics_data["positive_pct"].append(
            {"itemId": item_id, "value": round(pos / total * 100, 1) if total else 0.0}
        )
        metrics_data["neutral_pct"].append(
            {"itemId": item_id, "value": round(neu / total * 100, 1) if total else 0.0}
        )
        metrics_data["negative_pct"].append(
            {"itemId": item_id, "value": round(neg / total * 100, 1) if total else 0.0}
        )
        metrics_data["avg_influence"].append(
            {"itemId": item_id, "value": round(avg_inf, 2)}
        )
        metrics_data["avg_sentiment"].append(
            {"itemId": item_id, "value": round(avg_sent, 3)}
        )
        metrics_data["share_of_voice"].append(
            {"itemId": item_id, "value": round((total / grand_total) * 100, 1)}
        )

        sentiment_dist.append(
            {
                "itemId": item_id,
                "positive": pos,
                "neutral": neu,
                "negative": neg,
            }
        )

        time_series_per_item.append({"itemId": item_id, "series": series})

    metrics = [
        {"name": name, "values": values} for name, values in metrics_data.items()
    ]

    return {
        "type": comp_type,
        "items": items,
        "metrics": metrics,
        "sentiment_distribution": sentiment_dist,
        "time_series": time_series_per_item,
    }


async def get_time_series(
    db: AsyncSession,
    project_id: str,
    days: int = 30,
    date_from: str | None = None,
    date_to: str | None = None,
) -> list:
    """Daily time-series. Explicit date_from/date_to wins over `days`."""
    base = (
        select(
            func.date(Mention.published_at).label("date"),
            func.count(Mention.id).label("mentions"),
            func.coalesce(func.sum(Mention.reach), 0).label("reach"),
            func.count(Mention.id).filter(Mention.sentiment_label == "positive").label("positive"),
            func.count(Mention.id).filter(Mention.sentiment_label == "neutral").label("neutral"),
            func.count(Mention.id).filter(Mention.sentiment_label == "negative").label("negative"),
        )
        .where(Mention.project_id == project_id)
    )

    df = _parse_date(date_from)
    dt = _parse_date(date_to)
    if df is None and dt is None:
        df = datetime.now(timezone.utc) - timedelta(days=days)

    if df is not None:
        base = base.where(Mention.published_at >= df)
    if dt is not None:
        base = base.where(Mention.published_at <= dt)

    base = base.group_by(func.date(Mention.published_at)).order_by(func.date(Mention.published_at))
    rows = (await db.execute(base)).all()

    return [
        {
            "date": str(row.date),
            "mentions": row.mentions,
            "reach": row.reach,
            "positive": row.positive,
            "neutral": row.neutral,
            "negative": row.negative,
        }
        for row in rows
    ]


async def get_anomaly_events(
    db: AsyncSession, project_id: str, days: int = 30, z_threshold: float = 2.0
) -> list:
    series = await get_time_series(db, project_id, days=days)
    values = [point["mentions"] for point in series]
    if len(values) < 5:
        return []
    mean = sum(values) / len(values)
    variance = sum((v - mean) ** 2 for v in values) / max(len(values), 1)
    std = variance ** 0.5
    if std == 0:
        return []

    events = []
    for point in series:
        z = (point["mentions"] - mean) / std
        if abs(z) >= z_threshold:
            events.append(
                {
                    "date": point["date"],
                    "mentions": point["mentions"],
                    "z_score": round(z, 2),
                    "type": "spike" if z > 0 else "drop",
                }
            )
    return events


# ---------------------------------------------------------------------------
# Sources breakdown (filter-aware) — used by Analysis › Overview/Sources tabs
# ---------------------------------------------------------------------------
async def get_sources_breakdown(
    db: AsyncSession,
    project_id: str,
    date_from: str | None = None,
    date_to: str | None = None,
    limit: int = 50,
) -> list[dict]:
    base = (
        select(
            Mention.source_id,
            func.count(Mention.id).label("mentions_count"),
            func.coalesce(func.sum(Mention.reach), 0).label("reach"),
            func.coalesce(func.avg(Mention.sentiment_score), 0.0).label("avg_sentiment"),
            func.max(Mention.published_at).label("last_published_at"),
        )
        .where(Mention.project_id == project_id)
    )
    base = _date_window(base, date_from, date_to).group_by(Mention.source_id)
    rows = (await db.execute(base)).all()

    if not rows:
        return []

    # Look up source metadata in one query.
    source_ids = [r.source_id for r in rows if r.source_id]
    sources_map: dict[str, Source] = {}
    if source_ids:
        srcs = (
            await db.execute(select(Source).where(Source.id.in_(source_ids)))
        ).scalars().all()
        sources_map = {s.id: s for s in srcs}

    total = sum(int(r.mentions_count or 0) for r in rows) or 1

    items: list[dict] = []
    for row in rows:
        src = sources_map.get(row.source_id)
        items.append({
            "source_id": row.source_id,
            "name": src.name if src else "Unknown",
            "type": src.type if src else "news",
            "base_url": src.base_url if src else "",
            "icon": src.icon if src else None,
            "country": src.country if src else None,
            "language": src.language if src else None,
            "mentions_count": int(row.mentions_count or 0),
            "reach": int(row.reach or 0),
            "share_pct": round((int(row.mentions_count or 0) / total) * 100, 1),
            "avg_sentiment": round(float(row.avg_sentiment or 0.0), 3),
            "last_published_at": row.last_published_at.isoformat() if row.last_published_at else None,
        })

    items.sort(key=lambda x: x["mentions_count"], reverse=True)
    return items[:limit]


# ---------------------------------------------------------------------------
# Top keywords from mention text — for the Analysis › Keywords word cloud.
# ---------------------------------------------------------------------------
async def get_keywords(
    db: AsyncSession,
    project_id: str,
    date_from: str | None = None,
    date_to: str | None = None,
    limit: int = 50,
) -> list[dict]:
    base = select(Mention.title, Mention.body).where(Mention.project_id == project_id)
    base = _date_window(base, date_from, date_to)
    rows = (await db.execute(base)).all()

    counter: Counter[str] = Counter()
    for title, body in rows:
        for word in _extract_keywords(f"{title or ''} {body or ''}"):
            counter[word] += 1

    if not counter:
        return []

    # Compare with previous window of same length when an explicit range was given.
    prev_counter: Counter[str] = Counter()
    df = _parse_date(date_from)
    dt = _parse_date(date_to)
    if df is not None and dt is not None and dt > df:
        window = dt - df
        prev_from = df - window
        prev_to = df
        prev_rows = (
            await db.execute(
                select(Mention.title, Mention.body)
                .where(
                    Mention.project_id == project_id,
                    Mention.published_at >= prev_from,
                    Mention.published_at < prev_to,
                )
            )
        ).all()
        for title, body in prev_rows:
            for word in _extract_keywords(f"{title or ''} {body or ''}"):
                prev_counter[word] += 1

    out: list[dict] = []
    for word, count in counter.most_common(limit):
        prev = prev_counter.get(word, 0)
        if prev == 0:
            change_pct = 100.0 if count > 0 else 0.0
        else:
            change_pct = round(((count - prev) / prev) * 100, 1)
        out.append({
            "word": word,
            "count": count,
            "is_hashtag": word.startswith("#"),
            "change_pct": change_pct,
        })
    return out


# ---------------------------------------------------------------------------
# Top cited links — for the Analysis › Keywords › Top Links section.
# ---------------------------------------------------------------------------
async def get_top_links(
    db: AsyncSession,
    project_id: str,
    date_from: str | None = None,
    date_to: str | None = None,
    limit: int = 20,
) -> list[dict]:
    base = (
        select(
            Mention.url,
            func.count(Mention.id).label("count"),
            func.coalesce(func.sum(Mention.reach), 0).label("reach"),
            func.max(Mention.published_at).label("last_seen"),
        )
        .where(Mention.project_id == project_id)
    )
    base = _date_window(base, date_from, date_to).group_by(Mention.url)
    rows = (await db.execute(base.order_by(func.count(Mention.id).desc()).limit(limit))).all()

    items: list[dict] = []
    for row in rows:
        domain = ""
        try:
            parsed = urlparse(row.url)
            domain = parsed.netloc.replace("www.", "")
        except Exception:
            domain = ""
        items.append({
            "url": row.url,
            "domain": domain,
            "count": int(row.count or 0),
            "reach": int(row.reach or 0),
            "last_seen": row.last_seen.isoformat() if row.last_seen else None,
        })
    return items


# ---------------------------------------------------------------------------
# Languages breakdown — for the Analysis › Geo & Languages tab.
# ---------------------------------------------------------------------------
_LANG_DISPLAY: dict[str, str] = {
    "en": "English",
    "ru": "Russian",
    "kk": "Kazakh",
    "kz": "Kazakh",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "tr": "Turkish",
    "uk": "Ukrainian",
    "zh": "Chinese",
    "ja": "Japanese",
    "ar": "Arabic",
}


async def get_languages_breakdown(
    db: AsyncSession,
    project_id: str,
    date_from: str | None = None,
    date_to: str | None = None,
) -> list[dict]:
    base = (
        select(Mention.language, func.count(Mention.id).label("count"))
        .where(Mention.project_id == project_id)
    )
    base = _date_window(base, date_from, date_to).group_by(Mention.language)
    rows = (await db.execute(base)).all()

    aggregated: dict[str, int] = {}
    for row in rows:
        code = (row.language or "other").lower().strip()
        if code in {"kz", "kk"}:
            code = "kk"  # canonical Kazakh ISO
        if code not in _LANG_DISPLAY and code != "other":
            code = "other"
        aggregated[code] = aggregated.get(code, 0) + int(row.count or 0)

    total = sum(aggregated.values()) or 1
    out = [
        {
            "language": code,
            "name": _LANG_DISPLAY.get(code, "Other"),
            "count": count,
            "share_pct": round((count / total) * 100, 1),
        }
        for code, count in aggregated.items()
    ]
    out.sort(key=lambda x: x["count"], reverse=True)
    return out
