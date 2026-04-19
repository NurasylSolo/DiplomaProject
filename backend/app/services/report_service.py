"""Premium PDF report generator.

Sections (toggleable from the UI):
  - kpi             — 4 KPI hero cards
  - sentiment       — donut + numeric breakdown
  - trend           — daily mentions bar chart (last 30 days)
  - sources         — table + horizontal bar
  - topics          — table with sentiment per topic
  - influencers     — top voices with reach
  - keywords        — trending keywords with delta
  - geo             — country breakdown + bar chart
  - emotions        — Plutchik 8-emotion radar + table
  - hot_hours       — 7×24 heatmap with peak callout
  - languages       — donut of language mix
  - recent          — paginated mentions table

Excel exports a multi-sheet workbook with the full row-level data per
section. Email schedules generate a PDF on the fly and attach it to a
premium HTML message with KPI tiles + top sources.

The default Helvetica family in reportlab only ships glyphs for Latin-1.
Cyrillic (Russian) and Kazakh-specific letters render as boxes. We
register DejaVu Sans (bundled with matplotlib so it's always present) for
PDF text and force matplotlib charts to use the same font for consistency
between body text and embedded chart labels.
"""
from __future__ import annotations

import io
import logging
import os
from datetime import datetime, timezone
from typing import Any

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    HRFlowable,
    Image,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.exceptions import NotFoundError
from app.models.mention import Mention
from app.models.project import Project
from app.models.report import EmailReportSchedule, Report
from app.services import (
    analytics_service,
    email_service,
    emotion_service,
    influencer_service,
    mention_service,
    report_charts,
    topic_service,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Unicode fonts for reportlab
# ---------------------------------------------------------------------------
_PDF_FONT_REGULAR = "DejaVuSans"
_PDF_FONT_BOLD = "DejaVuSans-Bold"
_PDF_FONT_ITALIC = "DejaVuSans-Italic"
_FONTS_REGISTERED = False


def _register_pdf_fonts() -> None:
    """Register DejaVu Sans (Regular + Bold + Italic) with reportlab once.

    Safe to call multiple times — guards against re-registration. If the
    fonts cannot be located we silently fall back to Helvetica.
    """
    global _FONTS_REGISTERED, _PDF_FONT_REGULAR, _PDF_FONT_BOLD, _PDF_FONT_ITALIC
    if _FONTS_REGISTERED:
        return
    try:
        import matplotlib  # type: ignore

        font_dir = os.path.join(
            os.path.dirname(matplotlib.__file__), "mpl-data", "fonts", "ttf"
        )
        regular = os.path.join(font_dir, "DejaVuSans.ttf")
        bold = os.path.join(font_dir, "DejaVuSans-Bold.ttf")
        italic = os.path.join(font_dir, "DejaVuSans-Oblique.ttf")
        if os.path.isfile(regular):
            pdfmetrics.registerFont(TTFont(_PDF_FONT_REGULAR, regular))
        if os.path.isfile(bold):
            pdfmetrics.registerFont(TTFont(_PDF_FONT_BOLD, bold))
        if os.path.isfile(italic):
            pdfmetrics.registerFont(TTFont(_PDF_FONT_ITALIC, italic))
        from reportlab.pdfbase.pdfmetrics import registerFontFamily

        registerFontFamily(
            _PDF_FONT_REGULAR,
            normal=_PDF_FONT_REGULAR,
            bold=_PDF_FONT_BOLD,
            italic=_PDF_FONT_ITALIC if os.path.isfile(italic) else _PDF_FONT_REGULAR,
            boldItalic=_PDF_FONT_BOLD,
        )
        _FONTS_REGISTERED = True
    except Exception as exc:  # pragma: no cover — purely defensive.
        logger.warning(
            "Could not register DejaVu fonts (PDFs will use Helvetica and "
            "may not render Cyrillic): %s",
            exc,
        )
        _PDF_FONT_REGULAR = "Helvetica"
        _PDF_FONT_BOLD = "Helvetica-Bold"
        _PDF_FONT_ITALIC = "Helvetica-Oblique"
        _FONTS_REGISTERED = True


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
async def create_report(
    db: AsyncSession,
    project_id: str,
    report_type: str,
    name: str = "Report",
    config: dict | None = None,
) -> Report:
    """Persist a Report row immediately as ``completed``. The actual file
    is generated lazily on download — keeps the create endpoint snappy."""
    report = Report(
        project_id=project_id,
        name=name,
        type=report_type,
        config=config,
        status="processing",
    )
    db.add(report)
    await db.flush()

    report.status = "completed"
    report.completed_at = datetime.now(timezone.utc)
    report.file_url = f"/api/v1/projects/{project_id}/reports/{report.id}/download"
    await db.flush()
    await db.refresh(report)

    return report


async def get_report_file(
    db: AsyncSession, project_id: str, report_id: str
) -> tuple[bytes, str, str]:
    result = await db.execute(
        select(Report).where(Report.id == report_id, Report.project_id == project_id)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise NotFoundError("Report not found")

    if report.type == "excel":
        return await _generate_excel(db, project_id, report)
    return await _generate_pdf(db, project_id, report)


# ---------------------------------------------------------------------------
# PDF — multi-section
# ---------------------------------------------------------------------------
_HEADINGS = {
    "en": {
        "title": "Media Monitoring Report",
        "subtitle": "Mentions, sentiment, voices and reach across global media",
        "generated": "Generated",
        "page": "Page",
        "of": "of",
        "no_data": "No data available for this section.",
        "kpi": "Key Performance Indicators",
        "sentiment": "Sentiment Distribution",
        "trend": "Daily Mentions",
        "top_sources": "Top Sources",
        "recent": "Recent Mentions",
        "topics": "Top Topics",
        "influencers": "Top Voices",
        "keywords": "Trending Keywords",
        "geo": "Geographic Distribution",
        "emotions": "Emotion Analysis",
        "hot_hours": "Hot Hours",
        "languages": "Languages",
        "total_mentions": "Total Mentions",
        "total_reach": "Total Reach",
        "positive": "Positive",
        "negative": "Negative",
        "neutral": "Neutral",
        "score": "Presence Score",
        "country": "Country",
        "mentions": "Mentions",
        "reach": "Reach",
        "share": "Share",
        "language": "Language",
        "peak_hour": "Peak hour",
        "active_day": "Most active day",
        "tz": "Timezone",
        "title_col": "Title",
        "source": "Source",
        "date": "Date",
        "type": "Type",
        "voice": "Voice",
        "score_col": "Score",
        "delta": "Δ",
        "keyword": "Keyword",
        "topic": "Topic",
        "emotion": "Emotion",
        "average": "Average score",
        "top_mention": "Top mention",
        "emo_joy": "Joy",
        "emo_trust": "Trust",
        "emo_fear": "Fear",
        "emo_surprise": "Surprise",
        "emo_sadness": "Sadness",
        "emo_disgust": "Disgust",
        "emo_anger": "Anger",
        "emo_anticipation": "Anticipation",
        "day_mon": "Mon",
        "day_tue": "Tue",
        "day_wed": "Wed",
        "day_thu": "Thu",
        "day_fri": "Fri",
        "day_sat": "Sat",
        "day_sun": "Sun",
    },
    "ru": {
        "title": "Отчёт мониторинга медиа",
        "subtitle": "Упоминания, тональность, голоса и охват в мировых медиа",
        "generated": "Сгенерирован",
        "page": "Стр.",
        "of": "из",
        "no_data": "Данных для этого раздела нет.",
        "kpi": "Ключевые показатели",
        "sentiment": "Распределение тональности",
        "trend": "Упоминания по дням",
        "top_sources": "Топ источники",
        "recent": "Последние упоминания",
        "topics": "Топ темы",
        "influencers": "Топ голоса",
        "keywords": "Популярные ключевые слова",
        "geo": "Географическое распределение",
        "emotions": "Анализ эмоций",
        "hot_hours": "Горячие часы",
        "languages": "Языки",
        "total_mentions": "Всего упоминаний",
        "total_reach": "Общий охват",
        "positive": "Позитив",
        "negative": "Негатив",
        "neutral": "Нейтрал",
        "score": "Скор присутствия",
        "country": "Страна",
        "mentions": "Упоминания",
        "reach": "Охват",
        "share": "Доля",
        "language": "Язык",
        "peak_hour": "Пиковый час",
        "active_day": "Самый активный день",
        "tz": "Часовой пояс",
        "title_col": "Заголовок",
        "source": "Источник",
        "date": "Дата",
        "type": "Тип",
        "voice": "Голос",
        "score_col": "Скор",
        "delta": "Δ",
        "keyword": "Ключевое слово",
        "topic": "Тема",
        "emotion": "Эмоция",
        "average": "Средний скор",
        "top_mention": "Топ упоминание",
        "emo_joy": "Радость",
        "emo_trust": "Доверие",
        "emo_fear": "Страх",
        "emo_surprise": "Удивление",
        "emo_sadness": "Грусть",
        "emo_disgust": "Отвращение",
        "emo_anger": "Гнев",
        "emo_anticipation": "Ожидание",
        "day_mon": "Пн",
        "day_tue": "Вт",
        "day_wed": "Ср",
        "day_thu": "Чт",
        "day_fri": "Пт",
        "day_sat": "Сб",
        "day_sun": "Вс",
    },
    "kz": {
        "title": "Медиа мониторинг есебі",
        "subtitle": "Атаулар, тональдық, дауыстар және әлемдік медиадағы қамту",
        "generated": "Жасалды",
        "page": "Бет",
        "of": "/",
        "no_data": "Бұл бөлім үшін деректер жоқ.",
        "kpi": "Негізгі көрсеткіштер",
        "sentiment": "Тональдық бөлінісі",
        "trend": "Күнделікті атаулар",
        "top_sources": "Топ дереккөздер",
        "recent": "Соңғы атаулар",
        "topics": "Топ тақырыптар",
        "influencers": "Топ дауыстар",
        "keywords": "Танымал кілт сөздер",
        "geo": "Географиялық бөлініс",
        "emotions": "Эмоция талдауы",
        "hot_hours": "Ыстық сағаттар",
        "languages": "Тілдер",
        "total_mentions": "Барлық атаулар",
        "total_reach": "Жалпы қамту",
        "positive": "Позитив",
        "negative": "Негатив",
        "neutral": "Нейтрал",
        "score": "Қатысу скоры",
        "country": "Ел",
        "mentions": "Атаулар",
        "reach": "Қамту",
        "share": "Үлес",
        "language": "Тіл",
        "peak_hour": "Шарықтау сағаты",
        "active_day": "Ең белсенді күн",
        "tz": "Уақыт белдеуі",
        "title_col": "Тақырып",
        "source": "Дереккөз",
        "date": "Күн",
        "type": "Түр",
        "voice": "Дауыс",
        "score_col": "Балл",
        "delta": "Δ",
        "keyword": "Кілт сөз",
        "topic": "Тақырып",
        "emotion": "Эмоция",
        "average": "Орташа балл",
        "top_mention": "Топ атау",
        "emo_joy": "Қуаныш",
        "emo_trust": "Сенім",
        "emo_fear": "Қорқыныш",
        "emo_surprise": "Таңқалу",
        "emo_sadness": "Қайғы",
        "emo_disgust": "Жиркеніш",
        "emo_anger": "Ашу",
        "emo_anticipation": "Күту",
        "day_mon": "Дс",
        "day_tue": "Сс",
        "day_wed": "Ср",
        "day_thu": "Бс",
        "day_fri": "Жм",
        "day_sat": "Сб",
        "day_sun": "Жс",
    },
}

_EMOTION_KEYS_ORDERED = (
    "joy",
    "trust",
    "fear",
    "surprise",
    "sadness",
    "disgust",
    "anger",
    "anticipation",
)

_DAY_KEYS_MON_FIRST = (
    "day_mon",
    "day_tue",
    "day_wed",
    "day_thu",
    "day_fri",
    "day_sat",
    "day_sun",
)

# Section ids the UI sends. Multiple ids may map to the same renderer so
# the user can pick "Summary" or "Numeric Summary" interchangeably.
_SECTION_ALIASES = {
    "summary": "kpi",
    "executive_summary": "kpi",
    "numeric_summary": "kpi",
    "social_reach": "sentiment",
    "sentiment": "sentiment",
    "volume_chart": "trend",
    "volume_category": "trend",
    "influential_sites": "sources",
    "top_sources": "sources",
    "recent_mentions": "recent",
    "popular_mentions": "recent",
    "context": "recent",
    "trending_hashtags": "keywords",
    "keywords": "keywords",
    "top_profiles": "influencers",
    "active_profiles": "influencers",
    "topics": "topics",
    "geo": "geo",
    "geography": "geo",
    "countries": "geo",
    "emotions": "emotions",
    "emotion_analysis": "emotions",
    "hot_hours": "hot_hours",
    "peak_times": "hot_hours",
    "languages": "languages",
    "language_breakdown": "languages",
}

_DEFAULT_SECTION_ORDER = [
    "kpi",
    "sentiment",
    "trend",
    "geo",
    "emotions",
    "hot_hours",
    "languages",
    "topics",
    "sources",
    "influencers",
    "keywords",
    "recent",
]


def _resolve_sections(config_sections: list[str] | None) -> list[str]:
    """Translate the UI section ids into our internal renderer keys,
    preserving order and removing duplicates.

    If the config is empty, fall back to the full set so a default
    "Generate" click still produces a useful report.
    """
    if not config_sections:
        return list(_DEFAULT_SECTION_ORDER)
    out: list[str] = []
    seen: set[str] = set()
    for raw in config_sections:
        key = _SECTION_ALIASES.get(str(raw), str(raw))
        if key not in seen and key in _DEFAULT_SECTION_ORDER:
            seen.add(key)
            out.append(key)
    return out or list(_DEFAULT_SECTION_ORDER)


def _hex_to_color(hex_str: str | None, default: str = "#0d9488") -> colors.HexColor:
    raw = (hex_str or default).strip()
    if not raw.startswith("#"):
        raw = f"#{raw}"
    try:
        return colors.HexColor(raw)
    except (ValueError, AttributeError):
        return colors.HexColor(default)


def _accent_soft(accent_hex: str) -> colors.HexColor:
    """Lighter tint of the accent for hero / KPI backgrounds."""
    try:
        accent = colors.HexColor(accent_hex)
        # Mix 12% accent with 88% white.
        return colors.HexColor(
            "#"
            + "".join(
                f"{int(0.12 * c + 0.88 * 255):02x}"
                for c in (accent.red * 255, accent.green * 255, accent.blue * 255)
            )
        )
    except Exception:
        return colors.HexColor("#f1f5f9")


async def _generate_pdf(
    db: AsyncSession, project_id: str, report: Report
) -> tuple[bytes, str, str]:
    _register_pdf_fonts()

    config = report.config or {}
    accent_hex = config.get("accent_color") or "#0d9488"
    accent = _hex_to_color(accent_hex)
    soft_accent = _accent_soft(accent_hex)
    lang = (config.get("language") or "en").lower()
    if lang not in _HEADINGS:
        lang = "en"
    h = _HEADINGS[lang]
    sections = _resolve_sections(config.get("sections"))
    description = (config.get("description") or "").strip()

    project = (
        await db.execute(select(Project).where(Project.id == project_id))
    ).scalar_one_or_none()
    project_name = project.name if project else "Project"

    # Pre-fetch every dataset that any selected section needs. This keeps
    # the renderer below pure (no DB calls) and easy to follow.
    stats = (
        await mention_service.get_mentions_stats(db, project_id)
        if {"kpi", "sentiment"}.intersection(sections)
        else None
    )
    time_series = (
        await analytics_service.get_time_series(db, project_id, days=30)
        if "trend" in sections
        else []
    )
    sources_breakdown = (
        await analytics_service.get_sources_breakdown(db, project_id, limit=15)
        if "sources" in sections
        else []
    )
    topics_data = (
        await analytics_service.get_topics_data(db, project_id)
        if "topics" in sections
        else []
    )
    keywords = (
        await analytics_service.get_keywords(db, project_id, limit=15)
        if "keywords" in sections
        else []
    )
    influencers = (
        await influencer_service.get_influencers(db, project_id, limit=10)
        if "influencers" in sections
        else []
    )
    geo_data = (
        await analytics_service.get_geo_data(db, project_id)
        if "geo" in sections
        else []
    )
    emotions = (
        await emotion_service.aggregate_emotions(db, project_id)
        if "emotions" in sections
        else None
    )
    hot_hours = (
        await analytics_service.get_hot_hours(db, project_id)
        if "hot_hours" in sections
        else None
    )
    languages_breakdown = (
        await analytics_service.get_languages_breakdown(db, project_id)
        if "languages" in sections
        else []
    )

    recent_mentions: list[Mention] = []
    if "recent" in sections:
        recent_mentions = list(
            (
                await db.execute(
                    select(Mention)
                    .options(joinedload(Mention.source))
                    .where(Mention.project_id == project_id)
                    .order_by(Mention.published_at.desc())
                    .limit(50)
                )
            ).scalars().all()
        )

    # ── Build the document
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        title=report.name,
        author="SentiNews",
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "TitleHero",
        parent=styles["Title"],
        fontName=_PDF_FONT_BOLD,
        textColor=accent,
        fontSize=28,
        leading=32,
        spaceAfter=4,
    )
    project_style = ParagraphStyle(
        "ProjectName",
        parent=styles["Normal"],
        fontName=_PDF_FONT_BOLD,
        textColor=colors.HexColor("#0f172a"),
        fontSize=18,
        leading=22,
        spaceAfter=4,
    )
    subtitle_style = ParagraphStyle(
        "Subtitle",
        parent=styles["Normal"],
        fontName=_PDF_FONT_REGULAR,
        textColor=colors.HexColor("#64748b"),
        fontSize=10.5,
        leading=14,
    )
    h2_style = ParagraphStyle(
        "H2",
        parent=styles["Heading2"],
        fontName=_PDF_FONT_BOLD,
        textColor=colors.HexColor("#0f172a"),
        fontSize=15,
        spaceBefore=22,
        spaceAfter=10,
    )
    body_style = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontName=_PDF_FONT_REGULAR,
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#1f2937"),
    )
    caption_style = ParagraphStyle(
        "Caption",
        parent=styles["Normal"],
        fontName=_PDF_FONT_ITALIC,
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#6b7280"),
    )

    elements: list = []

    # ── Premium cover/header
    elements.append(_brand_strip(accent))
    elements.append(Spacer(1, 14))
    elements.append(Paragraph(h["title"], title_style))
    elements.append(Paragraph(project_name, project_style))
    elements.append(Paragraph(h["subtitle"], subtitle_style))
    elements.append(Spacer(1, 6))
    elements.append(
        Paragraph(
            f"<b>{h['generated']}:</b> {datetime.now().strftime('%Y-%m-%d %H:%M')}"
            f" &nbsp;·&nbsp; <b>SentiNews</b>",
            caption_style,
        )
    )
    if description:
        elements.append(Spacer(1, 10))
        elements.append(Paragraph(description, body_style))
    elements.append(Spacer(1, 12))
    elements.append(HRFlowable(width="100%", thickness=2, color=accent, spaceAfter=14))

    for sec in sections:
        if sec == "kpi":
            _add_kpi(elements, stats, accent, soft_accent, h, h2_style)
        elif sec == "sentiment":
            _add_sentiment(elements, stats, accent_hex, h, h2_style, body_style)
        elif sec == "trend":
            _add_trend(elements, time_series, accent_hex, h, h2_style, body_style)
        elif sec == "sources":
            _add_sources(elements, sources_breakdown, accent, h, h2_style, body_style)
        elif sec == "topics":
            _add_topics(elements, topics_data, accent, h, h2_style, body_style)
        elif sec == "influencers":
            _add_influencers(elements, influencers, accent, h, h2_style, body_style)
        elif sec == "keywords":
            _add_keywords(elements, keywords, accent, h, h2_style, body_style)
        elif sec == "geo":
            _add_geo(elements, geo_data, accent, accent_hex, h, h2_style, body_style)
        elif sec == "emotions":
            _add_emotions(elements, emotions, accent, accent_hex, h, h2_style, body_style)
        elif sec == "hot_hours":
            _add_hot_hours(
                elements, hot_hours, accent, accent_hex, h, h2_style, body_style, caption_style
            )
        elif sec == "languages":
            _add_languages(
                elements, languages_breakdown, accent, accent_hex, h, h2_style, body_style
            )
        elif sec == "recent":
            _add_recent(elements, recent_mentions, accent, h, h2_style, body_style)

    doc.build(elements, onFirstPage=_footer(h), onLaterPages=_footer(h))
    buffer.seek(0)
    safe_name = (report.name or "report").replace("/", "-")
    return buffer.getvalue(), "application/pdf", f"{safe_name}.pdf"


def _brand_strip(accent: colors.HexColor) -> Table:
    """Thin coloured strip used at the very top of page 1 for branding."""
    cell = Table([[""]], colWidths=[17 * cm], rowHeights=[0.18 * cm])
    cell.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), accent)]))
    return cell


def _footer(h: dict):
    def _draw(canvas, doc):
        canvas.saveState()
        canvas.setFont(_PDF_FONT_REGULAR, 8)
        canvas.setFillColor(colors.HexColor("#9ca3af"))
        canvas.drawRightString(
            A4[0] - 2 * cm,
            1.2 * cm,
            f"{h['page']} {doc.page}",
        )
        canvas.drawString(2 * cm, 1.2 * cm, "SentiNews · Media Intelligence")
        canvas.restoreState()
    return _draw


# ── PDF section renderers ────────────────────────────────────────────────
def _kpi_card(label: str, value: str, accent: colors.HexColor, soft: colors.HexColor) -> Table:
    """Premium colored KPI block — used 4-up in the summary section."""
    inner = Table(
        [
            [Paragraph(f"<b>{value}</b>", _kpi_value_style(accent))],
            [Paragraph(label, _kpi_label_style())],
        ],
        colWidths=[3.6 * cm],
        rowHeights=[1.05 * cm, 0.55 * cm],
    )
    inner.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), soft),
                ("BOX", (0, 0), (-1, -1), 0.4, colors.HexColor("#e5e7eb")),
                ("LINEABOVE", (0, 0), (-1, 0), 4, accent),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return inner


def _kpi_value_style(accent: colors.HexColor) -> ParagraphStyle:
    return ParagraphStyle(
        "KpiValue",
        fontName=_PDF_FONT_BOLD,
        fontSize=20,
        alignment=1,
        textColor=accent,
        leading=24,
    )


def _kpi_label_style() -> ParagraphStyle:
    return ParagraphStyle(
        "KpiLabel",
        fontName=_PDF_FONT_REGULAR,
        fontSize=8.5,
        alignment=1,
        textColor=colors.HexColor("#6b7280"),
    )


def _add_kpi(elements, stats, accent, soft, h, h2_style):
    elements.append(Paragraph(h["kpi"], h2_style))
    s = stats or {}
    if isinstance(s, dict):
        total_mentions = s.get("total_mentions", 0)
        total_reach = s.get("total_reach", 0)
        pos_pct = s.get("positive_percentage", 0)
        neg_pct = s.get("negative_percentage", 0)
    else:
        total_mentions = getattr(s, "total_mentions", 0)
        total_reach = getattr(s, "total_reach", 0)
        pos_pct = getattr(s, "positive_percentage", 0)
        neg_pct = getattr(s, "negative_percentage", 0)
    cards = [
        _kpi_card(h["total_mentions"], f"{int(total_mentions or 0):,}", accent, soft),
        _kpi_card(h["total_reach"], _compact(total_reach), accent, soft),
        _kpi_card(h["positive"], f"{round(pos_pct or 0)}%", accent, soft),
        _kpi_card(h["negative"], f"{round(neg_pct or 0)}%", accent, soft),
    ]
    grid = Table([cards], colWidths=[4.0 * cm] * 4)
    grid.setStyle(
        TableStyle(
            [
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    elements.append(grid)


def _add_sentiment(elements, stats, accent_hex, h, h2_style, body_style):
    elements.append(Paragraph(h["sentiment"], h2_style))
    s = stats or {}
    if isinstance(s, dict):
        positive = int(s.get("positive_count", 0) or 0)
        neutral = int(s.get("neutral_count", 0) or 0)
        negative = int(s.get("negative_count", 0) or 0)
    else:
        positive = int(getattr(s, "positive_count", 0) or 0)
        neutral = int(getattr(s, "neutral_count", 0) or 0)
        negative = int(getattr(s, "negative_count", 0) or 0)
    png = report_charts.render_sentiment_donut(positive, neutral, negative, accent_hex)
    if png:
        elements.append(Image(io.BytesIO(png), width=14 * cm, height=8 * cm))
    else:
        elements.append(Paragraph(h["no_data"], body_style))


def _add_trend(elements, time_series, accent_hex, h, h2_style, body_style):
    elements.append(Paragraph(h["trend"], h2_style))
    png = report_charts.render_mentions_trend_bar(time_series, accent_hex)
    if png:
        elements.append(Image(io.BytesIO(png), width=16 * cm, height=6 * cm))
    else:
        elements.append(Paragraph(h["no_data"], body_style))


def _add_sources(elements, sources_breakdown, accent, h, h2_style, body_style):
    elements.append(Paragraph(h["top_sources"], h2_style))
    items = sources_breakdown or []
    if not items:
        elements.append(Paragraph(h["no_data"], body_style))
        return
    data: list[list[Any]] = [
        ["#", h["source"], h["type"], h["mentions"], h["reach"], h["share"]]
    ]
    for i, s in enumerate(items[:15], 1):
        data.append([
            str(i),
            (s.get("name") or "—")[:36],
            (s.get("type") or "—")[:14],
            f"{int(s.get('mentions_count') or 0):,}",
            _compact(s.get("reach")),
            f"{float(s.get('share_pct') or 0):.1f}%",
        ])
    table = Table(
        data,
        colWidths=[0.8 * cm, 6.4 * cm, 2.2 * cm, 2.2 * cm, 2.0 * cm, 2.0 * cm],
    )
    _style_table(table, accent)
    elements.append(table)


def _add_topics(elements, topics_data, accent, h, h2_style, body_style):
    elements.append(Paragraph(h["topics"], h2_style))
    items = list(topics_data or [])
    if not items:
        elements.append(Paragraph(h["no_data"], body_style))
        return
    data: list[list[Any]] = [
        ["#", h["topic"], h["mentions"], h["positive"], h["neutral"], h["negative"]]
    ]
    for i, t in enumerate(items[:10], 1):
        sd = t.get("sentiment_distribution") if isinstance(t, dict) else None
        sd = sd or {}
        data.append([
            str(i),
            (t.get("name") if isinstance(t, dict) else "—")[:40],
            str(int(t.get("mentions_count") or t.get("mentions") or 0)),
            str(int(sd.get("positive") or 0)),
            str(int(sd.get("neutral") or 0)),
            str(int(sd.get("negative") or 0)),
        ])
    table = Table(
        data,
        colWidths=[0.8 * cm, 7.0 * cm, 2.0 * cm, 1.8 * cm, 1.8 * cm, 1.8 * cm],
    )
    _style_table(table, accent)
    elements.append(table)


def _add_influencers(elements, influencers, accent, h, h2_style, body_style):
    elements.append(Paragraph(h["influencers"], h2_style))
    items = list(influencers or [])
    if not items:
        elements.append(Paragraph(h["no_data"], body_style))
        return
    data: list[list[Any]] = [
        ["#", h["voice"], h["type"], h["mentions"], h["reach"], h["score_col"]]
    ]
    for i, inf in enumerate(items[:10], 1):
        data.append([
            str(i),
            (inf.get("display_name") or inf.get("handle") or "—")[:32],
            (inf.get("platform") or "—")[:10],
            str(int(inf.get("mentions_count") or 0)),
            _compact(inf.get("reach")),
            f"{float(inf.get('influence_score') or 0):.1f}",
        ])
    table = Table(
        data,
        colWidths=[0.8 * cm, 6.0 * cm, 2.0 * cm, 2.2 * cm, 2.0 * cm, 2.0 * cm],
    )
    _style_table(table, accent)
    elements.append(table)


def _add_keywords(elements, keywords, accent, h, h2_style, body_style):
    elements.append(Paragraph(h["keywords"], h2_style))
    items = list(keywords or [])
    if not items:
        elements.append(Paragraph(h["no_data"], body_style))
        return
    data: list[list[Any]] = [
        ["#", h["keyword"], h["mentions"], h["delta"]]
    ]
    for i, k in enumerate(items[:15], 1):
        data.append([
            str(i),
            (k.get("word") or "—")[:40],
            str(int(k.get("count") or 0)),
            f"{float(k.get('change_pct') or 0):+.1f}%",
        ])
    table = Table(
        data,
        colWidths=[0.8 * cm, 8.0 * cm, 2.0 * cm, 2.4 * cm],
    )
    _style_table(table, accent)
    elements.append(table)


def _add_geo(elements, geo_data, accent, accent_hex, h, h2_style, body_style):
    elements.append(Paragraph(h["geo"], h2_style))
    items = [
        g for g in (geo_data or []) if g and (g.get("country_code") or "XX") != "XX"
    ]
    if not items:
        elements.append(Paragraph(h["no_data"], body_style))
        return
    items.sort(key=lambda g: int(g.get("mentions") or 0), reverse=True)

    png = report_charts.render_geo_bar(items, accent_hex, top_n=8)
    if png:
        elements.append(Image(io.BytesIO(png), width=16 * cm, height=6.5 * cm))
        elements.append(Spacer(1, 6))

    data: list[list[Any]] = [
        ["#", h["country"], h["mentions"], h["reach"], h["positive"], h["neutral"], h["negative"]]
    ]
    for i, g in enumerate(items[:12], 1):
        sd = g.get("sentiment") or {}
        data.append([
            str(i),
            (g.get("country") or g.get("country_code") or "—")[:30],
            f"{int(g.get('mentions') or 0):,}",
            _compact(g.get("reach")),
            str(int(sd.get("positive") or 0)),
            str(int(sd.get("neutral") or 0)),
            str(int(sd.get("negative") or 0)),
        ])
    table = Table(
        data,
        colWidths=[0.8 * cm, 5.6 * cm, 2.0 * cm, 2.0 * cm, 1.7 * cm, 1.7 * cm, 1.7 * cm],
    )
    _style_table(table, accent)
    elements.append(table)


def _add_emotions(elements, emotions, accent, accent_hex, h, h2_style, body_style):
    elements.append(Paragraph(h["emotions"], h2_style))
    if not emotions or not isinstance(emotions, dict):
        elements.append(Paragraph(h["no_data"], body_style))
        return
    averages = emotions.get("averages") or {}
    total_analyzed = int(emotions.get("total_analyzed") or 0)

    if not any(float(averages.get(k) or 0) > 0 for k in _EMOTION_KEYS_ORDERED):
        elements.append(Paragraph(h["no_data"], body_style))
        return

    labels = [h.get(f"emo_{key}", key.title()) for key in _EMOTION_KEYS_ORDERED]
    png = report_charts.render_emotion_radar(averages, accent_hex, labels=labels)
    if png:
        elements.append(Image(io.BytesIO(png), width=12 * cm, height=10 * cm))
        elements.append(Spacer(1, 6))

    elements.append(
        Paragraph(
            f"<i>{h['total_mentions']}: {total_analyzed:,}</i>",
            body_style,
        )
    )
    data: list[list[Any]] = [[h["emotion"], h["average"], h["top_mention"]]]
    top_per_emotion = emotions.get("top_per_emotion") or {}
    for key in _EMOTION_KEYS_ORDERED:
        avg = float(averages.get(key) or 0)
        top_list = top_per_emotion.get(key) or []
        top = top_list[0] if top_list else None
        top_label = (top.get("title") if isinstance(top, dict) else None) or "—"
        data.append([
            h.get(f"emo_{key}", key.title()),
            f"{round(avg * 100)}%",
            Paragraph(top_label[:80], _wrap_style()),
        ])
    table = Table(data, colWidths=[3.6 * cm, 2.2 * cm, 11.0 * cm])
    _style_table(table, accent)
    elements.append(table)


def _add_hot_hours(
    elements, hot_hours, accent, accent_hex, h, h2_style, body_style, caption_style
):
    elements.append(Paragraph(h["hot_hours"], h2_style))
    if not hot_hours or not isinstance(hot_hours, dict):
        elements.append(Paragraph(h["no_data"], body_style))
        return
    cells = hot_hours.get("cells") or []
    if not cells:
        elements.append(Paragraph(h["no_data"], body_style))
        return

    day_labels = [h[k] for k in _DAY_KEYS_MON_FIRST]
    png = report_charts.render_hot_hours_heatmap(cells, accent_hex, day_labels=day_labels)
    if png:
        elements.append(Image(io.BytesIO(png), width=16 * cm, height=7 * cm))
        elements.append(Spacer(1, 4))

    peak = hot_hours.get("peak") or {}
    tz_name = hot_hours.get("timezone") or "UTC"
    if peak:
        # PG day-of-week: 0=Sun, 1=Mon, … 6=Sat. Map back to label.
        dow = int(peak.get("day", 0))
        # Convert PG dow → Monday-first index for label lookup.
        mon_first_idx = (dow - 1) % 7
        day_label = day_labels[mon_first_idx]
        peak_msg = (
            f"<b>{h['peak_hour']}:</b> {day_label}, {int(peak.get('hour', 0)):02d}:00"
            f" — {int(peak.get('mentions') or 0)} {h['mentions'].lower()}"
            f" &nbsp;·&nbsp; <b>{h['tz']}:</b> {tz_name}"
        )
        elements.append(Paragraph(peak_msg, caption_style))


def _add_languages(elements, languages, accent, accent_hex, h, h2_style, body_style):
    elements.append(Paragraph(h["languages"], h2_style))
    items = [
        l
        for l in (languages or [])
        if l and int(l.get("count") or 0) > 0
    ]
    if not items:
        elements.append(Paragraph(h["no_data"], body_style))
        return

    png = report_charts.render_languages_donut(items, accent_hex)
    if png:
        elements.append(Image(io.BytesIO(png), width=14 * cm, height=8 * cm))
        elements.append(Spacer(1, 6))

    data: list[list[Any]] = [["#", h["language"], h["mentions"], h["share"]]]
    for i, l in enumerate(items[:8], 1):
        data.append([
            str(i),
            str(l.get("language") or "—").upper(),
            f"{int(l.get('count') or 0):,}",
            f"{float(l.get('share_pct') or 0):.1f}%",
        ])
    table = Table(data, colWidths=[0.8 * cm, 6.0 * cm, 4.0 * cm, 2.4 * cm])
    _style_table(table, accent)
    elements.append(table)


def _add_recent(elements, recent_mentions, accent, h, h2_style, body_style):
    if not recent_mentions:
        elements.append(Paragraph(h["recent"], h2_style))
        elements.append(Paragraph(h["no_data"], body_style))
        return
    elements.append(PageBreak())
    elements.append(Paragraph(h["recent"], h2_style))
    data: list[list[Any]] = [
        [h["title_col"], h["source"], h["sentiment"], h["date"]]
    ]
    for m in recent_mentions[:50]:
        data.append([
            Paragraph((m.title or "")[:120], _wrap_style()),
            (m.source.name if m.source else "—")[:24],
            (m.sentiment_label or "neutral")[:10],
            m.published_at.strftime("%Y-%m-%d") if m.published_at else "—",
        ])
    table = Table(
        data,
        colWidths=[8.0 * cm, 4.0 * cm, 2.4 * cm, 2.0 * cm],
    )
    _style_table(table, accent, sentiment_col=2)
    elements.append(table)


def _wrap_style() -> ParagraphStyle:
    return ParagraphStyle(
        "Wrap",
        fontName=_PDF_FONT_REGULAR,
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#1f2937"),
    )


def _style_table(
    table: Table, accent: colors.HexColor, sentiment_col: int | None = None
) -> None:
    style = TableStyle(
        [
            ("BACKGROUND", (0, 0), (-1, 0), accent),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), _PDF_FONT_BOLD),
            ("FONTNAME", (0, 1), (-1, -1), _PDF_FONT_REGULAR),
            ("FONTSIZE", (0, 0), (-1, 0), 9),
            ("FONTSIZE", (0, 1), (-1, -1), 8),
            ("ALIGN", (0, 0), (-1, 0), "LEFT"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
            ("TOPPADDING", (0, 0), (-1, 0), 6),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f9fafb")]),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#e5e7eb")),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ]
    )
    if sentiment_col is not None:
        style.add(
            "TEXTCOLOR",
            (sentiment_col, 1),
            (sentiment_col, -1),
            colors.HexColor("#6b7280"),
        )
    table.setStyle(style)


def _compact(n: Any) -> str:
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


# ---------------------------------------------------------------------------
# Excel — multi-sheet
# ---------------------------------------------------------------------------
async def _generate_excel(
    db: AsyncSession, project_id: str, report: Report
) -> tuple[bytes, str, str]:
    config = report.config or {}
    sections = config.get("sections") or [
        "mentions",
        "sources",
        "sentiment",
        "influencers",
        "trends",
        "daily_stats",
    ]
    accent_hex = (config.get("accent_color") or "#0d9488").lstrip("#")

    wb = Workbook()
    wb.remove(wb.active)

    sentiment_data = (
        await analytics_service.get_time_series(db, project_id, days=30)
        if "sentiment" in sections or "daily_stats" in sections
        else []
    )

    if "mentions" in sections:
        mentions = list(
            (
                await db.execute(
                    select(Mention)
                    .options(joinedload(Mention.source))
                    .where(Mention.project_id == project_id)
                    .order_by(Mention.published_at.desc())
                )
            ).scalars().all()
        )
        ws = wb.create_sheet("Mentions")
        _write_sheet(
            ws,
            ["Title", "Source", "Sentiment", "Sentiment score", "Reach", "Date",
             "Country", "Language", "URL"],
            [[
                m.title,
                m.source.name if m.source else "",
                m.sentiment_label,
                round(float(m.sentiment_score or 0), 3),
                m.reach,
                m.published_at.strftime("%Y-%m-%d %H:%M") if m.published_at else "",
                m.country,
                m.language,
                m.url,
            ] for m in mentions],
            accent_hex,
        )

    if "sources" in sections:
        sources = await analytics_service.get_sources_breakdown(db, project_id, limit=500)
        ws = wb.create_sheet("Sources")
        _write_sheet(
            ws,
            ["Source", "Type", "Mentions", "Reach", "Share %", "Avg sentiment",
             "Country", "Language", "Last published"],
            [[
                s.get("name"),
                s.get("type"),
                int(s.get("mentions_count") or 0),
                int(s.get("reach") or 0),
                float(s.get("share_pct") or 0),
                round(float(s.get("avg_sentiment") or 0), 3),
                s.get("country") or "",
                s.get("language") or "",
                s.get("last_published_at") or "",
            ] for s in sources],
            accent_hex,
        )

    if "sentiment" in sections:
        ws = wb.create_sheet("Sentiment")
        _write_sheet(
            ws,
            ["Date", "Total mentions", "Positive", "Neutral", "Negative", "Reach"],
            [[
                d.get("date"),
                int(d.get("mentions") or 0),
                int(d.get("positive") or 0),
                int(d.get("neutral") or 0),
                int(d.get("negative") or 0),
                int(d.get("reach") or 0),
            ] for d in sentiment_data],
            accent_hex,
        )

    if "influencers" in sections:
        influencers = await influencer_service.get_influencers(db, project_id, limit=200)
        ws = wb.create_sheet("Influencers")
        _write_sheet(
            ws,
            ["Voice", "Handle", "Platform", "Mentions", "Reach", "Share %",
             "Influence score", "Avg sentiment", "Country", "Last seen"],
            [[
                i.get("display_name"),
                i.get("handle"),
                i.get("platform"),
                int(i.get("mentions_count") or 0),
                int(i.get("reach") or 0),
                float(i.get("share_of_voice") or 0),
                float(i.get("influence_score") or 0),
                round(float(i.get("avg_sentiment") or 0), 3),
                i.get("country") or "",
                i.get("last_seen") or "",
            ] for i in influencers],
            accent_hex,
        )

    if "trends" in sections:
        topic_stats = await topic_service.aggregate_topic_stats(db, project_id)
        topics = await topic_service.list_topics(db, project_id)
        ws = wb.create_sheet("Trends")
        rows = []
        for t in topics:
            agg = topic_stats.get(t.id) or {}
            sd = agg.get("sentiment_distribution") or {}
            rows.append([
                t.name,
                int(agg.get("mentions_count") or 0),
                int(agg.get("total_reach") or 0),
                int(sd.get("positive") or 0),
                int(sd.get("neutral") or 0),
                int(sd.get("negative") or 0),
                ", ".join((t.keywords or [])[:8]),
            ])
        _write_sheet(
            ws,
            ["Topic", "Mentions", "Reach", "Positive", "Neutral", "Negative", "Keywords"],
            rows,
            accent_hex,
        )

    if "daily_stats" in sections:
        ws = wb.create_sheet("Daily Statistics")
        _write_sheet(
            ws,
            ["Date", "Mentions", "Reach"],
            [[
                d.get("date"),
                int(d.get("mentions") or 0),
                int(d.get("reach") or 0),
            ] for d in sentiment_data],
            accent_hex,
        )

    if "geo" in sections:
        geo = await analytics_service.get_geo_data(db, project_id)
        ws = wb.create_sheet("Geo")
        _write_sheet(
            ws,
            ["Country", "Country code", "Mentions", "Reach", "Positive", "Neutral", "Negative"],
            [[
                g.get("country") or g.get("country_code") or "",
                g.get("country_code") or "",
                int(g.get("mentions") or 0),
                int(g.get("reach") or 0),
                int((g.get("sentiment") or {}).get("positive") or 0),
                int((g.get("sentiment") or {}).get("neutral") or 0),
                int((g.get("sentiment") or {}).get("negative") or 0),
            ] for g in (geo or [])],
            accent_hex,
        )

    if "emotions" in sections:
        emotions = await emotion_service.aggregate_emotions(db, project_id)
        averages = (emotions or {}).get("averages") or {}
        ws = wb.create_sheet("Emotions")
        _write_sheet(
            ws,
            ["Emotion", "Average score (0..1)", "Average score (%)"],
            [
                [k.title(), round(float(averages.get(k) or 0), 4),
                 round(float(averages.get(k) or 0) * 100, 1)]
                for k in _EMOTION_KEYS_ORDERED
            ],
            accent_hex,
        )

    if "hot_hours" in sections:
        hot = await analytics_service.get_hot_hours(db, project_id)
        cells = (hot or {}).get("cells") or []
        ws = wb.create_sheet("Hot Hours")
        _write_sheet(
            ws,
            ["Day (PG dow)", "Hour", "Mentions", "Reach", "Avg sentiment",
             "Positive", "Neutral", "Negative"],
            [[
                int(c.get("day") or 0),
                int(c.get("hour") or 0),
                int(c.get("mentions") or 0),
                int(c.get("reach") or 0),
                round(float(c.get("avg_sentiment") or 0), 3),
                int(c.get("positive") or 0),
                int(c.get("neutral") or 0),
                int(c.get("negative") or 0),
            ] for c in cells],
            accent_hex,
        )

    if "languages" in sections:
        langs = await analytics_service.get_languages_breakdown(db, project_id)
        ws = wb.create_sheet("Languages")
        _write_sheet(
            ws,
            ["Language", "Mentions", "Share %"],
            [[
                str(l.get("language") or "").upper(),
                int(l.get("count") or 0),
                round(float(l.get("share_pct") or 0), 2),
            ] for l in (langs or [])],
            accent_hex,
        )

    if not wb.sheetnames:
        ws = wb.create_sheet("Empty")
        ws["A1"] = "No sections selected."

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    safe_name = (report.name or "report").replace("/", "-")
    return (
        buffer.getvalue(),
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        f"{safe_name}.xlsx",
    )


def _write_sheet(ws, headers: list[str], rows: list[list[Any]], accent_hex: str) -> None:
    """Write a sheet with bold colored header row + auto-sized columns."""
    accent_fill = PatternFill("solid", fgColor=accent_hex)
    white_bold = Font(bold=True, color="FFFFFF")
    centered = Alignment(horizontal="left", vertical="center")

    ws.append(headers)
    for col_idx in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=col_idx)
        cell.fill = accent_fill
        cell.font = white_bold
        cell.alignment = centered

    for row in rows:
        ws.append(row)

    for col_idx in range(1, len(headers) + 1):
        max_len = len(str(headers[col_idx - 1]))
        for row in rows:
            value = row[col_idx - 1] if col_idx - 1 < len(row) else ""
            max_len = max(max_len, len(str(value or "")))
        ws.column_dimensions[get_column_letter(col_idx)].width = min(max_len + 2, 60)
    ws.freeze_panes = "A2"


# ---------------------------------------------------------------------------
# Email schedules CRUD
# ---------------------------------------------------------------------------
async def create_email_schedule(
    db: AsyncSession, project_id: str, data: dict
) -> EmailReportSchedule:
    schedule = EmailReportSchedule(project_id=project_id, **data)
    db.add(schedule)
    await db.flush()
    await db.refresh(schedule)
    return schedule


async def get_email_schedules(db: AsyncSession, project_id: str) -> list:
    result = await db.execute(
        select(EmailReportSchedule).where(EmailReportSchedule.project_id == project_id)
    )
    return list(result.scalars().all())


async def update_email_schedule(
    db: AsyncSession, project_id: str, schedule_id: str, data: dict
) -> EmailReportSchedule:
    result = await db.execute(
        select(EmailReportSchedule).where(
            EmailReportSchedule.project_id == project_id,
            EmailReportSchedule.id == schedule_id,
        )
    )
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise NotFoundError("Email schedule not found")
    for key, value in data.items():
        if value is not None and hasattr(schedule, key):
            setattr(schedule, key, value)
    await db.flush()
    await db.refresh(schedule)
    return schedule


async def delete_email_schedule(db: AsyncSession, project_id: str, schedule_id: str) -> None:
    result = await db.execute(
        select(EmailReportSchedule).where(
            EmailReportSchedule.project_id == project_id,
            EmailReportSchedule.id == schedule_id,
        )
    )
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise NotFoundError("Email schedule not found")
    await db.delete(schedule)


# ---------------------------------------------------------------------------
# Send Now
# ---------------------------------------------------------------------------
async def send_email_schedule_now(
    db: AsyncSession, project_id: str, schedule_id: str
) -> dict:
    result = await db.execute(
        select(EmailReportSchedule).where(
            EmailReportSchedule.project_id == project_id,
            EmailReportSchedule.id == schedule_id,
        )
    )
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise NotFoundError("Email schedule not found")

    project = (
        await db.execute(select(Project).where(Project.id == project_id))
    ).scalar_one_or_none()
    project_name = project.name if project else "Project"

    report = await create_report(
        db=db,
        project_id=project_id,
        report_type="pdf",
        name=f"{project_name} {schedule.frequency} report",
        config=schedule.config or {},
    )
    pdf_bytes, _content_type, filename = await _generate_pdf(db, project_id, report)

    stats = await mention_service.get_mentions_stats(db, project_id)
    summary = _stats_to_summary(stats)
    # Top sources for the email body — small list, no large images.
    top_sources = await analytics_service.get_sources_breakdown(db, project_id, limit=4)
    summary["top_sources"] = [
        {
            "name": (s.get("name") or "—")[:48],
            "mentions": int(s.get("mentions_count") or 0),
        }
        for s in (top_sources or [])
    ]
    accent_color = (
        (schedule.config or {}).get("accent_color") if schedule.config else None
    ) or "#0d9488"

    recipients = list(schedule.recipients or [])
    result_email = await email_service.send_report_email(
        to_emails=recipients,
        subject=f"{project_name} — {schedule.frequency} report",
        summary=summary,
        pdf_bytes=pdf_bytes,
        pdf_filename=filename,
        project_name=project_name,
        accent_color=accent_color,
    )

    now = datetime.now(timezone.utc)
    if result_email.get("success"):
        schedule.last_sent_at = now
        await db.flush()

    return {
        "schedule_id": schedule.id,
        "report_id": report.id,
        "recipients_count": len(recipients),
        "success": bool(result_email.get("success")),
        "error": result_email.get("reason") or result_email.get("error"),
        "last_sent_at": schedule.last_sent_at.isoformat() if schedule.last_sent_at else None,
    }


def _stats_to_summary(stats: Any) -> dict[str, Any]:
    """Normalise mentions stats (object or dict) into the email-friendly dict."""
    if isinstance(stats, dict):
        get = stats.get
    else:
        get = lambda k, d=None: getattr(stats, k, d)  # noqa: E731
    return {
        "total_mentions": int(get("total_mentions", 0) or 0),
        "total_reach": int(get("total_reach", 0) or 0),
        "positive_pct": round(float(get("positive_percentage", 0) or 0)),
        "negative_pct": round(float(get("negative_percentage", 0) or 0)),
        "neutral_pct": round(float(get("neutral_percentage", 0) or 0))
        if not isinstance(stats, dict)
        else round(float(stats.get("neutral_percentage", 0) or 0)),
    }


# ---------------------------------------------------------------------------
# Lightweight preview JSON for the frontend preview-card / infographic
# ---------------------------------------------------------------------------
async def get_report_preview(db: AsyncSession, project_id: str) -> dict:
    """Single endpoint that gathers KPI + section samples so PDF / Email /
    Infographic pages can render an accurate preview without firing five
    separate analytics queries.
    """
    stats = await mention_service.get_mentions_stats(db, project_id)
    summary = _stats_to_summary(stats)
    sentiment = {
        "positive_count": int(getattr(stats, "positive_count", 0) or 0)
        if not isinstance(stats, dict)
        else int(stats.get("positive_count", 0) or 0),
        "neutral_count": int(getattr(stats, "neutral_count", 0) or 0)
        if not isinstance(stats, dict)
        else int(stats.get("neutral_count", 0) or 0),
        "negative_count": int(getattr(stats, "negative_count", 0) or 0)
        if not isinstance(stats, dict)
        else int(stats.get("negative_count", 0) or 0),
    }
    top_sources = await analytics_service.get_sources_breakdown(db, project_id, limit=5)
    topics_data = await analytics_service.get_topics_data(db, project_id)
    time_series = await analytics_service.get_time_series(db, project_id, days=30)

    # New: emotions, hot hours, languages, geo for the infographic & email
    emotions = await emotion_service.aggregate_emotions(db, project_id)
    hot_hours = await analytics_service.get_hot_hours(db, project_id)
    languages = await analytics_service.get_languages_breakdown(db, project_id)
    geo = await analytics_service.get_geo_data(db, project_id)

    project = (
        await db.execute(select(Project).where(Project.id == project_id))
    ).scalar_one_or_none()

    averages = (emotions or {}).get("averages") or {}
    top_emotion_key = (
        max(averages.items(), key=lambda kv: float(kv[1] or 0))[0]
        if averages and any(float(v or 0) > 0 for v in averages.values())
        else None
    )

    return {
        "project_name": project.name if project else "Project",
        "kpi": summary,
        "sentiment": sentiment,
        "top_sources": top_sources[:5] if top_sources else [],
        "top_topics": [
            {
                "name": (t.get("name") if isinstance(t, dict) else None) or "—",
                "mentions": int(
                    (t.get("mentions_count") if isinstance(t, dict) else 0)
                    or (t.get("mentions") if isinstance(t, dict) else 0)
                    or 0
                ),
            }
            for t in (topics_data or [])[:5]
        ],
        "time_series": time_series or [],
        "emotions": {
            "averages": averages,
            "total_analyzed": int((emotions or {}).get("total_analyzed") or 0),
            "top_emotion": top_emotion_key,
        },
        "hot_hours": {
            "peak": (hot_hours or {}).get("peak"),
            "timezone": (hot_hours or {}).get("timezone"),
            "active_days": (hot_hours or {}).get("active_days") or [],
        },
        "languages": [
            {
                "language": (l.get("language") or "").upper(),
                "count": int(l.get("count") or 0),
                "share_pct": float(l.get("share_pct") or 0),
            }
            for l in (languages or [])[:6]
        ],
        "geo": [
            {
                "country": g.get("country") or g.get("country_code") or "—",
                "country_code": (g.get("country_code") or "").upper(),
                "mentions": int(g.get("mentions") or 0),
                "reach": int(g.get("reach") or 0),
            }
            for g in sorted(
                (g for g in (geo or []) if (g.get("country_code") or "") != "XX"),
                key=lambda g: int(g.get("mentions") or 0),
                reverse=True,
            )[:6]
        ],
    }
