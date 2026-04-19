"""Pure matplotlib chart renderers used by the PDF generator.

All functions return raw PNG bytes so they can be embedded into the PDF
via reportlab's ``Image(BytesIO(...))``. We force the headless ``Agg``
backend before pyplot is imported so the worker can run without a display.
"""
from __future__ import annotations

import io
import logging
import math
from typing import Iterable, Sequence

import matplotlib

matplotlib.use("Agg")  # noqa: E402  must be set before pyplot import

import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
from matplotlib.colors import LinearSegmentedColormap  # noqa: E402

# Force DejaVu Sans for every chart — it's matplotlib's default font, but
# pinning it explicitly guarantees Cyrillic / Kazakh labels (e.g. when the
# UI passes localized strings to the renderers) come out without missing
# glyphs.
plt.rcParams["font.family"] = "DejaVu Sans"
plt.rcParams["axes.unicode_minus"] = False
plt.rcParams["axes.edgecolor"] = "#d4d4d8"
plt.rcParams["axes.labelcolor"] = "#374151"
plt.rcParams["xtick.color"] = "#374151"
plt.rcParams["ytick.color"] = "#374151"

logger = logging.getLogger(__name__)


_DEFAULT_ACCENT = "#0d9488"  # teal-600 — matches our brand
_NEUTRAL = "#9ca3af"
_POSITIVE = "#10b981"
_NEGATIVE = "#ef4444"
_BG_SOFT = "#f8fafc"

# 8 Plutchik emotions colour palette — each emotion has a distinct, accessible
# colour so the radar / bar charts read clearly without a legend.
_EMOTION_PALETTE: dict[str, str] = {
    "joy": "#fbbf24",          # amber
    "trust": "#10b981",        # emerald
    "fear": "#7c3aed",         # violet
    "surprise": "#06b6d4",     # cyan
    "sadness": "#3b82f6",      # blue
    "disgust": "#84cc16",      # lime
    "anger": "#ef4444",        # red
    "anticipation": "#f97316", # orange
}


def _save_current_figure(fig) -> bytes:
    buf = io.BytesIO()
    try:
        fig.savefig(
            buf,
            format="png",
            dpi=160,
            bbox_inches="tight",
            facecolor="white",
        )
        buf.seek(0)
        return buf.getvalue()
    finally:
        plt.close(fig)


def _safe_color(value: str | None) -> str:
    """Validate hex colour, fall back to brand teal on bad input."""
    if not value:
        return _DEFAULT_ACCENT
    s = value.strip()
    if s.startswith("#") and len(s) in (4, 7):
        return s
    return _DEFAULT_ACCENT


def _gradient_cmap(accent: str) -> LinearSegmentedColormap:
    """Two-stop gradient from a soft tint of accent into accent itself.
    Used to fill bars / heatmap cells with depth instead of flat colour."""
    return LinearSegmentedColormap.from_list(
        "accent_gradient",
        [(0, "#ffffff"), (0.25, _BG_SOFT), (1, accent)],
    )


# ---------------------------------------------------------------------------
# Sentiment donut
# ---------------------------------------------------------------------------
def render_sentiment_donut(
    positive: int,
    neutral: int,
    negative: int,
    accent_color: str | None = None,
) -> bytes | None:
    """Donut showing sentiment mix. Returns None if there are no mentions
    (caller should skip the section instead of embedding an empty chart).
    """
    total = (positive or 0) + (neutral or 0) + (negative or 0)
    if total <= 0:
        return None

    accent = _safe_color(accent_color)
    fig, ax = plt.subplots(figsize=(5.6, 3.6), dpi=160)
    sizes = [positive or 0, neutral or 0, negative or 0]
    colors = [_POSITIVE, _NEUTRAL, _NEGATIVE]

    def _pct(value: int) -> str:
        return f"{round(100 * value / total)}%"

    labels = [
        f"Positive  {positive}  ·  {_pct(positive)}",
        f"Neutral   {neutral}  ·  {_pct(neutral)}",
        f"Negative  {negative}  ·  {_pct(negative)}",
    ]
    wedges, _texts = ax.pie(
        sizes,
        colors=colors,
        startangle=90,
        wedgeprops={"width": 0.36, "edgecolor": "white", "linewidth": 3},
    )
    ax.text(
        0,
        0.10,
        f"{total:,}",
        ha="center",
        va="center",
        fontsize=22,
        fontweight="bold",
        color=accent,
    )
    ax.text(
        0,
        -0.20,
        "mentions",
        ha="center",
        va="center",
        fontsize=10,
        color="#6b7280",
    )
    ax.legend(
        wedges,
        labels,
        loc="center left",
        bbox_to_anchor=(1.0, 0.5),
        frameon=False,
        fontsize=9,
    )
    ax.set_aspect("equal")
    ax.axis("off")
    return _save_current_figure(fig)


# ---------------------------------------------------------------------------
# Daily mentions trend
# ---------------------------------------------------------------------------
def render_mentions_trend_bar(
    time_series: Iterable[dict],
    accent_color: str | None = None,
) -> bytes | None:
    """Vertical bars: mentions per day. ``time_series`` is the response from
    ``analytics_service.get_time_series`` — each item has ``date`` and
    ``mentions``."""
    data = [
        (str(item.get("date") or ""), int(item.get("mentions") or 0))
        for item in (time_series or [])
        if item
    ]
    if not data:
        return None

    accent = _safe_color(accent_color)
    fig, ax = plt.subplots(figsize=(8.2, 3.0), dpi=160)
    dates = [d for d, _ in data]
    values = [v for _, v in data]

    # Gradient fill: peak day is darkest, lower days lighter.
    max_v = max(values) or 1
    cmap = _gradient_cmap(accent)
    bar_colors = [cmap(0.25 + 0.75 * (v / max_v)) for v in values]
    ax.bar(range(len(values)), values, color=bar_colors, width=0.7)

    # Show only every Nth label so the axis doesn't get crowded.
    step = max(1, len(dates) // 8)
    ax.set_xticks(range(0, len(dates), step))
    ax.set_xticklabels(
        [dates[i][5:] for i in range(0, len(dates), step)],  # MM-DD
        rotation=0,
        fontsize=8,
    )
    ax.set_yticks([])
    for spine in ("top", "right", "left"):
        ax.spines[spine].set_visible(False)
    ax.spines["bottom"].set_color("#d4d4d8")

    # Annotate bars > 0 with their value, right above the bar.
    for i, v in enumerate(values):
        if v > 0:
            ax.text(
                i,
                v,
                str(v),
                ha="center",
                va="bottom",
                fontsize=7.5,
                color="#374151",
            )

    return _save_current_figure(fig)


# ---------------------------------------------------------------------------
# Top sources horizontal bar
# ---------------------------------------------------------------------------
def render_top_sources_bar(
    sources: Iterable[dict],
    accent_color: str | None = None,
    top_n: int = 10,
) -> bytes | None:
    """Horizontal bars: top sources by mentions. ``sources`` is the response
    from ``analytics_service.get_sources_breakdown``."""
    items = sorted(
        (s for s in (sources or []) if s),
        key=lambda s: int(s.get("mentions_count") or 0),
        reverse=True,
    )[:top_n]
    if not items:
        return None

    accent = _safe_color(accent_color)
    names = [str(s.get("name") or s.get("base_url") or "—")[:40] for s in items]
    values = [int(s.get("mentions_count") or 0) for s in items]

    fig, ax = plt.subplots(figsize=(8.2, max(2.5, 0.45 * len(items) + 1)), dpi=160)
    y = list(range(len(items)))
    max_v = max(values) or 1
    cmap = _gradient_cmap(accent)
    colors = [cmap(0.30 + 0.70 * (v / max_v)) for v in values]
    bars = ax.barh(y, values, color=colors, height=0.62)
    ax.invert_yaxis()
    ax.set_yticks(y)
    ax.set_yticklabels(names, fontsize=9)
    ax.set_xticks([])
    for spine in ("top", "right", "bottom"):
        ax.spines[spine].set_visible(False)
    ax.spines["left"].set_color("#d4d4d8")
    for bar, v in zip(bars, values):
        ax.text(
            bar.get_width() + max(values) * 0.01,
            bar.get_y() + bar.get_height() / 2,
            str(v),
            va="center",
            fontsize=8,
            color="#374151",
        )
    return _save_current_figure(fig)


# ---------------------------------------------------------------------------
# Geo top countries — horizontal bar (mentions + reach)
# ---------------------------------------------------------------------------
def render_geo_bar(
    geo_data: Iterable[dict],
    accent_color: str | None = None,
    top_n: int = 8,
) -> bytes | None:
    """Top countries by mention count, with reach annotation per bar.
    ``geo_data`` is the response from ``analytics_service.get_geo_data``.
    Items with code ``XX`` (Unknown) are excluded so the chart focuses on
    real geographies.
    """
    items = [
        g
        for g in (geo_data or [])
        if g and str(g.get("country_code") or "").upper() != "XX"
    ]
    items.sort(key=lambda g: int(g.get("mentions") or 0), reverse=True)
    items = items[:top_n]
    if not items:
        return None

    accent = _safe_color(accent_color)
    names = [str(g.get("country") or g.get("country_code") or "—")[:30] for g in items]
    values = [int(g.get("mentions") or 0) for g in items]
    reach = [int(g.get("reach") or 0) for g in items]

    fig, ax = plt.subplots(figsize=(8.2, max(2.5, 0.5 * len(items) + 1)), dpi=160)
    y = list(range(len(items)))
    max_v = max(values) or 1
    cmap = _gradient_cmap(accent)
    colors = [cmap(0.30 + 0.70 * (v / max_v)) for v in values]
    bars = ax.barh(y, values, color=colors, height=0.62)
    ax.invert_yaxis()
    ax.set_yticks(y)
    ax.set_yticklabels(names, fontsize=9)
    ax.set_xticks([])
    for spine in ("top", "right", "bottom"):
        ax.spines[spine].set_visible(False)
    ax.spines["left"].set_color("#d4d4d8")
    for bar, v, r in zip(bars, values, reach):
        ax.text(
            bar.get_width() + max(values) * 0.012,
            bar.get_y() + bar.get_height() / 2,
            f"{v}  ·  {_compact(r)} reach",
            va="center",
            fontsize=8,
            color="#374151",
        )
    return _save_current_figure(fig)


# ---------------------------------------------------------------------------
# Plutchik 8 emotions radar
# ---------------------------------------------------------------------------
_PLUTCHIK_ORDER: tuple[str, ...] = (
    "joy",
    "trust",
    "fear",
    "surprise",
    "sadness",
    "disgust",
    "anger",
    "anticipation",
)


def render_emotion_radar(
    averages: dict,
    accent_color: str | None = None,
    labels: Sequence[str] | None = None,
) -> bytes | None:
    """Polar radar chart of the 8 Plutchik emotions.

    ``averages`` is ``aggregate_emotions(...).averages`` — a mapping with
    eight float scores in the [0..1] range. If every value is zero we return
    None so the caller skips the section instead of embedding an empty radar.

    ``labels`` is an optional list of localized emotion names (must be in
    the same order as ``_PLUTCHIK_ORDER``).
    """
    if not isinstance(averages, dict):
        return None
    values = [float(averages.get(key) or 0) for key in _PLUTCHIK_ORDER]
    if not any(v > 0 for v in values):
        return None

    accent = _safe_color(accent_color)
    angles = np.linspace(0, 2 * math.pi, len(_PLUTCHIK_ORDER), endpoint=False).tolist()
    closed_values = values + [values[0]]
    closed_angles = angles + [angles[0]]
    label_text = list(labels) if labels else [k.title() for k in _PLUTCHIK_ORDER]

    fig, ax = plt.subplots(
        figsize=(6.2, 5.2), dpi=160, subplot_kw={"projection": "polar"}
    )
    ax.set_theta_offset(math.pi / 2)
    ax.set_theta_direction(-1)

    ax.fill(closed_angles, closed_values, color=accent, alpha=0.22)
    ax.plot(closed_angles, closed_values, color=accent, linewidth=2.2)

    # Per-axis points coloured by emotion palette so the radar carries
    # information even at small print sizes.
    for ang, val, key in zip(angles, values, _PLUTCHIK_ORDER):
        ax.scatter(
            [ang],
            [val],
            color=_EMOTION_PALETTE.get(key, accent),
            s=70,
            zorder=4,
            edgecolors="white",
            linewidths=1.5,
        )

    ax.set_xticks(angles)
    ax.set_xticklabels(label_text, fontsize=10)
    ax.tick_params(axis="x", pad=8)

    max_v = max(values + [0.05])
    upper = max(0.2, math.ceil(max_v * 10) / 10)
    ticks = np.linspace(0, upper, 4)
    ax.set_yticks(ticks)
    ax.set_yticklabels([f"{int(round(v * 100))}%" for v in ticks], fontsize=8, color="#9ca3af")
    ax.set_ylim(0, upper)
    ax.spines["polar"].set_color("#e5e7eb")
    ax.grid(color="#e5e7eb", linewidth=0.8)

    return _save_current_figure(fig)


# ---------------------------------------------------------------------------
# Hot Hours — 7×24 heatmap of mentions
# ---------------------------------------------------------------------------
def render_hot_hours_heatmap(
    cells: Iterable[dict],
    accent_color: str | None = None,
    day_labels: Sequence[str] | None = None,
) -> bytes | None:
    """Mon→Sun by 0..23 grid, coloured by mention volume per cell.

    ``cells`` is ``analytics_service.get_hot_hours(...).cells`` — each item
    is ``{day, hour, mentions, …}``. Postgres day-of-week is 0=Sunday so we
    rotate the rows so Monday starts the grid (more familiar to users).
    """
    grid = np.zeros((7, 24), dtype=float)
    has_data = False
    for c in cells or []:
        try:
            d = int(c.get("day", 0))  # 0=Sunday in PG
            h = int(c.get("hour", 0))
            v = int(c.get("mentions") or 0)
        except (TypeError, ValueError):
            continue
        # Rotate so row 0 is Monday: PG day 1=Mon, ..., 6=Sat, 0=Sun→6
        row = (d - 1) % 7
        if 0 <= h <= 23 and v > 0:
            grid[row, h] = v
            has_data = True
    if not has_data:
        return None

    accent = _safe_color(accent_color)
    cmap = _gradient_cmap(accent)
    fig, ax = plt.subplots(figsize=(8.2, 3.6), dpi=160)
    im = ax.imshow(grid, aspect="auto", cmap=cmap)

    days = list(day_labels) if day_labels else [
        "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"
    ]
    ax.set_yticks(range(7))
    ax.set_yticklabels(days, fontsize=9)
    ax.set_xticks(list(range(0, 24, 3)))
    ax.set_xticklabels([f"{h:02d}:00" for h in range(0, 24, 3)], fontsize=8)
    for spine in ax.spines.values():
        spine.set_visible(False)
    ax.tick_params(left=False, bottom=False)

    cbar = fig.colorbar(im, ax=ax, fraction=0.025, pad=0.02)
    cbar.outline.set_visible(False)
    cbar.ax.tick_params(labelsize=8)
    return _save_current_figure(fig)


# ---------------------------------------------------------------------------
# Languages distribution donut
# ---------------------------------------------------------------------------
def render_languages_donut(
    languages: Iterable[dict],
    accent_color: str | None = None,
    top_n: int = 6,
) -> bytes | None:
    """Donut of top languages by mention count.

    ``languages`` shape (from ``analytics_service.get_languages_breakdown``):
    each item ``{language, count, share_pct}``.
    """
    items = sorted(
        (
            l
            for l in (languages or [])
            if l and int(l.get("count") or 0) > 0
        ),
        key=lambda l: int(l.get("count") or 0),
        reverse=True,
    )[:top_n]
    if not items:
        return None

    accent = _safe_color(accent_color)
    labels = [
        f"{(l.get('language') or '?').upper()}  {int(l.get('count') or 0)}"
        for l in items
    ]
    sizes = [int(l.get("count") or 0) for l in items]

    # Generate a consistent palette derived from the accent (HSV rotations).
    cmap = plt.get_cmap("Set2")
    palette = [accent] + [cmap(i % cmap.N) for i in range(len(items) - 1)]

    fig, ax = plt.subplots(figsize=(5.6, 3.6), dpi=160)
    wedges, _texts = ax.pie(
        sizes,
        colors=palette,
        startangle=90,
        wedgeprops={"width": 0.36, "edgecolor": "white", "linewidth": 3},
    )
    total = sum(sizes)
    ax.text(0, 0.10, f"{total:,}", ha="center", va="center", fontsize=20,
            fontweight="bold", color=accent)
    ax.text(0, -0.20, "mentions", ha="center", va="center", fontsize=10, color="#6b7280")
    ax.legend(wedges, labels, loc="center left", bbox_to_anchor=(1.0, 0.5),
              frameon=False, fontsize=9)
    ax.set_aspect("equal")
    ax.axis("off")
    return _save_current_figure(fig)


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------
def _compact(n) -> str:
    try:
        v = float(n or 0)
    except (TypeError, ValueError):
        return "0"
    abs_v = abs(v)
    if abs_v >= 1_000_000:
        return f"{v / 1_000_000:.1f}M"
    if abs_v >= 1_000:
        return f"{v / 1_000:.1f}K"
    return f"{int(v):,}"
