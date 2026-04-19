"""Emotion classification service.

Two responsibilities:

1. **Backfill** — re-classify mentions that don't yet have meaningful
   ``mention.emotions`` (NULL or rule-based zeros). The endpoint is
   triggered manually from the UI so the user controls when to spend
   GPT tokens.

2. **Aggregate** — turn the ``mention.emotions`` JSON column into the
   shape the Emotions page needs: 8-key averages, per-day timeline and
   the top mentions per emotion. All operations honour an optional
   date range.
"""
from __future__ import annotations

import logging
from collections import defaultdict
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.mention import Mention
from app.services import nlp_service
from app.services.analytics_service import _date_window
from app.services.nlp_service import (
    PLUTCHIK_EMOTIONS,
    _empty_emotion_scores,
    _normalise_emotion_dict,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Aggregation
# ---------------------------------------------------------------------------
async def aggregate_emotions(
    db: AsyncSession,
    project_id: str,
    *,
    date_from: str | None = None,
    date_to: str | None = None,
    top_per_emotion_limit: int = 5,
) -> dict[str, Any]:
    """Return everything the Emotions page needs in a single round-trip.

    Shape::

        {
          "averages": {joy: 0.0, ..., anticipation: 0.0},
          "total_analyzed": <int>,
          "daily_timeline": [
              {date: "2024-12-01", joy: 0.31, trust: 0.12, ...},
              ...
          ],
          "top_per_emotion": {
              "joy": [{id, title, url, source, score, sentiment_label,
                       published_at, language, country}, ...],
              ...
          },
        }
    """
    base_q = (
        select(Mention)
        .options(joinedload(Mention.source))
        .where(Mention.project_id == project_id, Mention.emotions.isnot(None))
    )
    base_q = _date_window(base_q, date_from, date_to)
    rows = (await db.execute(base_q)).scalars().all()

    averages = _empty_emotion_scores()
    daily: dict[str, dict[str, list[float]]] = defaultdict(
        lambda: {key: [] for key in PLUTCHIK_EMOTIONS}
    )
    per_emotion_top: dict[str, list[dict]] = {key: [] for key in PLUTCHIK_EMOTIONS}

    sums = _empty_emotion_scores()
    counted = 0
    for mention in rows:
        scores = _normalise_emotion_dict(mention.emotions)
        # Skip mentions where every score is exactly 0 — they almost
        # certainly come from the legacy rule-based scorer that didn't
        # find any of its keywords. Including them would dilute the
        # averages towards zero.
        if not any(scores.values()):
            continue
        counted += 1
        for key, value in scores.items():
            sums[key] += value
        # Bucket by ISO date for the timeline.
        if mention.published_at:
            day = mention.published_at.date().isoformat()
            for key, value in scores.items():
                daily[day][key].append(value)
        # Track candidates for top_per_emotion. We collect them all here
        # and pick the top-N at the end so we don't have to keep a
        # heap per emotion.
        for key, value in scores.items():
            if value > 0:
                per_emotion_top[key].append(
                    {
                        "id": mention.id,
                        "title": mention.title or "",
                        "url": mention.url or "",
                        "source": (mention.source.name if mention.source else None),
                        "score": value,
                        "sentiment_label": mention.sentiment_label,
                        "sentiment_score": float(mention.sentiment_score or 0.0),
                        "published_at": (
                            mention.published_at.isoformat()
                            if mention.published_at
                            else None
                        ),
                        "language": mention.language,
                        "country": mention.country,
                        "reach": int(mention.reach or 0),
                    }
                )

    if counted > 0:
        for key in averages:
            averages[key] = round(sums[key] / counted, 3)

    timeline = []
    for date in sorted(daily.keys()):
        bucket = daily[date]
        row = {"date": date}
        for key in PLUTCHIK_EMOTIONS:
            values = bucket[key]
            row[key] = round(sum(values) / len(values), 3) if values else 0.0
        timeline.append(row)

    top: dict[str, list[dict]] = {}
    for key in PLUTCHIK_EMOTIONS:
        items = per_emotion_top[key]
        items.sort(key=lambda x: x["score"], reverse=True)
        top[key] = items[:top_per_emotion_limit]

    return {
        "averages": averages,
        "total_analyzed": counted,
        "daily_timeline": timeline,
        "top_per_emotion": top,
    }


# ---------------------------------------------------------------------------
# Backfill
# ---------------------------------------------------------------------------
def _emotions_need_backfill(value: dict | None) -> bool:
    """``True`` when the stored emotions look "empty" — either NULL,
    not a dict, missing all 8 Plutchik keys, or all values are ~zero
    (typical leftover from the old rule-based scorer)."""
    if not isinstance(value, dict):
        return True
    # Did we even get the new 8-key shape?
    if not all(key in value for key in PLUTCHIK_EMOTIONS):
        return True
    total = 0.0
    for key in PLUTCHIK_EMOTIONS:
        try:
            total += float(value.get(key) or 0.0)
        except (TypeError, ValueError):
            total += 0.0
    return total < 0.05


async def backfill_project(
    db: AsyncSession,
    project_id: str,
    *,
    batch_size: int = 20,
    limit: int | None = None,
) -> dict[str, int]:
    """Re-classify mentions whose emotions look empty/legacy.

    Commits in batches to keep memory bounded and so a partial run still
    leaves real progress in the database. ``limit`` caps the total work
    so a user can dry-run on the first N candidates from the UI before
    spending tokens on the entire backlog.
    """
    rows = list(
        (
            await db.execute(
                select(Mention).where(Mention.project_id == project_id)
            )
        ).scalars().all()
    )

    candidates = [m for m in rows if _emotions_need_backfill(m.emotions)]
    if limit is not None:
        candidates = candidates[: max(0, int(limit))]

    processed = 0
    updated = 0
    skipped = 0

    for index, mention in enumerate(candidates, 1):
        text = f"{mention.title or ''}\n{mention.body or ''}".strip()
        if not text:
            skipped += 1
            continue
        try:
            scores = nlp_service.score_emotions_gpt(text)
        except Exception as exc:
            logger.warning("emotion backfill failed for %s: %s", mention.id, exc)
            scores = nlp_service.emotion_scores(text)
        mention.emotions = scores
        processed += 1
        if any(scores.values()):
            updated += 1

        # Commit every ``batch_size`` mentions to free up memory and
        # checkpoint progress.
        if index % batch_size == 0:
            try:
                await db.commit()
            except Exception:
                await db.rollback()

    try:
        await db.commit()
    except Exception:
        await db.rollback()

    return {
        "candidates": len(candidates),
        "processed": processed,
        "updated": updated,
        "skipped": skipped,
        "total_in_project": len(rows),
    }
