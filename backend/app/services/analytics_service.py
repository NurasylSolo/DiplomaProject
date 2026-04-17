from datetime import datetime, timedelta, timezone
from sqlalchemy import select, func, and_, extract
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.mention import Mention
from app.models.topic import Topic
from app.models.source import Source
from app.services import nlp_service


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


async def get_geo_data(db: AsyncSession, project_id: str) -> list:
    """Aggregated mentions per ISO‑2 country.

    The DB column `Mention.country` is mostly already normalized, but in
    older rows it may still contain raw "USA" / "Россия" / "kz" — so we
    re‑normalize and merge counts here so the geo map / countries table
    never has duplicate rows for the same country.
    """
    result = await db.execute(
        select(
            Mention.country,
            func.count(Mention.id).label("mentions"),
            func.coalesce(func.sum(Mention.reach), 0).label("reach"),
            func.count(Mention.id).filter(Mention.sentiment_label == "positive").label("positive"),
            func.count(Mention.id).filter(Mention.sentiment_label == "neutral").label("neutral"),
            func.count(Mention.id).filter(Mention.sentiment_label == "negative").label("negative"),
        )
        .where(Mention.project_id == project_id)
        .group_by(Mention.country)
    )
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


async def get_hot_hours(db: AsyncSession, project_id: str) -> list:
    result = await db.execute(
        select(
            extract("dow", Mention.published_at).label("day"),
            extract("hour", Mention.published_at).label("hour"),
            func.count(Mention.id).label("mentions"),
        )
        .where(Mention.project_id == project_id)
        .group_by("day", "hour")
        .order_by("day", "hour")
    )
    rows = result.all()
    return [
        {"day": int(row.day), "hour": int(row.hour), "mentions": row.mentions}
        for row in rows
    ]


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


async def get_topics_data(db: AsyncSession, project_id: str) -> list:
    result = await db.execute(
        select(Topic).where(Topic.project_id == project_id).order_by(Topic.created_at.desc())
    )
    topics = result.scalars().all()

    total_q = await db.execute(
        select(func.count(Mention.id)).where(Mention.project_id == project_id)
    )
    total_mentions = total_q.scalar() or 1

    topics_data = []
    for topic in topics:
        count_q = await db.execute(
            select(func.count(Mention.id)).where(Mention.topic_id == topic.id)
        )
        mentions_count = count_q.scalar() or 0

        reach_q = await db.execute(
            select(func.coalesce(func.sum(Mention.reach), 0)).where(Mention.topic_id == topic.id)
        )
        reach = reach_q.scalar() or 0

        topics_data.append({
            "id": topic.id,
            "project_id": topic.project_id,
            "name": topic.name,
            "description": topic.description,
            "parent_topic_id": topic.parent_topic_id,
            "mentions_count": mentions_count,
            "reach": reach,
            "share_of_voice": round((mentions_count / total_mentions) * 100, 1),
            "sentiment_distribution": topic.sentiment_distribution,
            "trend": [],
            "created_at": topic.created_at.isoformat() if topic.created_at else "",
        })

    return topics_data


async def get_comparison(
    db: AsyncSession,
    project_id: str,
    comp_type: str,
    item_ids: list,
    date_from: str | None = None,
    date_to: str | None = None,
) -> dict:
    items = []
    metrics_data = {
        "total_mentions": [],
        "total_reach": [],
        "positive_pct": [],
        "negative_pct": [],
        "avg_influence": [],
    }

    for item_id in item_ids:
        query = select(Mention).where(Mention.project_id == item_id)
        if date_from:
            query = query.where(Mention.published_at >= datetime.fromisoformat(date_from))
        if date_to:
            query = query.where(Mention.published_at <= datetime.fromisoformat(date_to))

        count_q = await db.execute(
            select(func.count(Mention.id)).select_from(query.subquery())
        )
        total = count_q.scalar() or 0

        reach_q = await db.execute(
            select(func.coalesce(func.sum(Mention.reach), 0)).where(Mention.project_id == item_id)
        )
        reach = reach_q.scalar() or 0

        pos_q = await db.execute(
            select(func.count(Mention.id)).where(
                Mention.project_id == item_id, Mention.sentiment_label == "positive"
            )
        )
        pos = pos_q.scalar() or 0

        neg_q = await db.execute(
            select(func.count(Mention.id)).where(
                Mention.project_id == item_id, Mention.sentiment_label == "negative"
            )
        )
        neg = neg_q.scalar() or 0

        avg_q = await db.execute(
            select(func.coalesce(func.avg(Mention.influence_score), 0)).where(
                Mention.project_id == item_id
            )
        )
        avg_inf = avg_q.scalar() or 0

        items.append({"id": item_id, "name": f"Project {item_id[:8]}"})
        metrics_data["total_mentions"].append({"itemId": item_id, "value": total})
        metrics_data["total_reach"].append({"itemId": item_id, "value": reach})
        metrics_data["positive_pct"].append({"itemId": item_id, "value": round(pos / total * 100, 1) if total else 0})
        metrics_data["negative_pct"].append({"itemId": item_id, "value": round(neg / total * 100, 1) if total else 0})
        metrics_data["avg_influence"].append({"itemId": item_id, "value": round(float(avg_inf), 2)})

    metrics = [
        {"name": name, "values": values}
        for name, values in metrics_data.items()
    ]

    return {"type": comp_type, "items": items, "metrics": metrics}


async def get_time_series(
    db: AsyncSession, project_id: str, days: int = 30
) -> list:
    start_date = datetime.now(timezone.utc) - timedelta(days=days)

    result = await db.execute(
        select(
            func.date(Mention.published_at).label("date"),
            func.count(Mention.id).label("mentions"),
            func.coalesce(func.sum(Mention.reach), 0).label("reach"),
            func.count(Mention.id).filter(Mention.sentiment_label == "positive").label("positive"),
            func.count(Mention.id).filter(Mention.sentiment_label == "neutral").label("neutral"),
            func.count(Mention.id).filter(Mention.sentiment_label == "negative").label("negative"),
        )
        .where(Mention.project_id == project_id, Mention.published_at >= start_date)
        .group_by(func.date(Mention.published_at))
        .order_by(func.date(Mention.published_at))
    )
    rows = result.all()

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
