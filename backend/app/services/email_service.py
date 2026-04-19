import logging
from email.message import EmailMessage
from typing import Iterable

import aiosmtplib

from app.config import settings

logger = logging.getLogger(__name__)


_HTML_TEMPLATE = """\
<!doctype html>
<html>
  <body style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; \
background:#0b0d12; padding:40px 20px; color:#e5e5e5;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" \
style="max-width:480px; margin:0 auto; background:#111418; border-radius:16px; \
border:1px solid #1f2937; padding:32px;">
      <tr>
        <td>
          <h1 style="margin:0 0 8px; font-size:22px; color:#ffffff;">SentiNews</h1>
          <p style="margin:0 0 24px; color:#9ca3af; font-size:14px;">
            Confirm your email to start using the platform.
          </p>
          <div style="background:#1f2937; border-radius:12px; padding:24px; text-align:center;">
            <div style="font-size:32px; letter-spacing:8px; font-weight:700; color:#ffffff;">{code}</div>
            <div style="margin-top:8px; color:#9ca3af; font-size:12px;">
              Code expires in 10 minutes.
            </div>
          </div>
          <p style="margin:24px 0 0; color:#6b7280; font-size:12px;">
            If you didn't request this, ignore this email — your account is safe.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>
"""


async def send_verification_code(to_email: str, code: str) -> bool:
    """Send a 6-digit verification code via SMTP.

    If SMTP is not configured (typical in local dev), logs the code instead
    and returns True so the registration flow can keep working without a
    mail server.
    """
    if not settings.SMTP_HOST or not settings.SMTP_USER:
        logger.warning(
            "SMTP not configured — verification code for %s: %s", to_email, code
        )
        return True

    msg = EmailMessage()
    msg["From"] = settings.SMTP_FROM_EMAIL or settings.SMTP_USER
    msg["To"] = to_email
    msg["Subject"] = f"SentiNews — Verification Code: {code}"
    msg.set_content(
        f"Your SentiNews verification code is: {code}\n"
        f"It expires in 10 minutes. If you didn't request this, ignore this message."
    )
    msg.add_alternative(_HTML_TEMPLATE.format(code=code), subtype="html")

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            use_tls=False,
            start_tls=True,
        )
        logger.info("Verification email sent to %s", to_email)
        return True
    except Exception as exc:
        logger.error("Failed to send verification email to %s: %s", to_email, exc)
        return False


# ---------------------------------------------------------------------------
# Report email (PDF attachment + KPI summary)
#
# The email template is intentionally inline-styled and table-based so it
# renders consistently in Gmail, Apple Mail, Outlook (incl. Outlook for
# Windows which is the strictest renderer in 2026).
# ---------------------------------------------------------------------------
_REPORT_HTML_TEMPLATE = """\
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{project_name} — SentiNews report</title>
  </head>
  <body style="margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; \
background:#f1f5f9; color:#0f172a;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" \
style="background:#f1f5f9; padding:32px 12px;">
      <tr><td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="600" \
style="max-width:600px; width:100%; background:#ffffff; border-radius:18px; \
overflow:hidden; box-shadow:0 24px 60px -32px rgba(15,23,42,0.18); border:1px solid #e2e8f0;">

          <!-- HERO -->
          <tr>
            <td style="background:linear-gradient(135deg, {accent} 0%, {accent_dark} 100%); \
padding:32px 32px 28px; color:#ffffff;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="font-size:13px; letter-spacing:1.5px; text-transform:uppercase; \
opacity:0.85; font-weight:600;">SentiNews · Media Intelligence</td>
                </tr>
                <tr>
                  <td style="padding-top:8px; font-size:24px; line-height:1.2; font-weight:700;">
                    {project_name}
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:6px; font-size:14px; opacity:0.92;">
                    {tagline}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- KPI TILES -->
          <tr>
            <td style="padding:24px 32px 8px; background:#ffffff;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  {kpi_cells}
                </tr>
              </table>
            </td>
          </tr>

          <!-- SENTIMENT BAR -->
          <tr>
            <td style="padding:8px 32px 4px; background:#ffffff;">
              <p style="margin:0 0 10px; font-size:12px; letter-spacing:1px; \
text-transform:uppercase; color:#64748b; font-weight:600;">Sentiment mix</p>
              {sentiment_bar}
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" \
style="margin-top:10px;">
                <tr>
                  <td style="font-size:12px; color:#475569;">
                    <span style="display:inline-block; width:8px; height:8px; border-radius:50%; \
background:#10b981; margin-right:6px;"></span>Positive {positive_pct}%
                    &nbsp;&nbsp;
                    <span style="display:inline-block; width:8px; height:8px; border-radius:50%; \
background:#94a3b8; margin-right:6px;"></span>Neutral {neutral_pct}%
                    &nbsp;&nbsp;
                    <span style="display:inline-block; width:8px; height:8px; border-radius:50%; \
background:#ef4444; margin-right:6px;"></span>Negative {negative_pct}%
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- TOP SOURCES -->
          {top_sources_block}

          <!-- ATTACHMENT NOTE -->
          <tr>
            <td style="padding:24px 32px 8px; background:#ffffff;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" \
style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:0;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0; font-size:13px; color:#0f172a; font-weight:600;">
                      Full PDF report attached
                    </p>
                    <p style="margin:6px 0 0; font-size:12px; color:#64748b; line-height:1.6;">
                      Contains charts, sentiment timeline, top sources, geographic and
                      emotion analysis, hot hours and the latest mentions. Open it on
                      any device — fonts include Cyrillic and Kazakh glyphs.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding:20px 32px 28px; background:#ffffff;">
              <p style="margin:0; color:#94a3b8; font-size:11px; line-height:1.6;">
                You're receiving this because email reports were enabled for
                <b>{project_name}</b>. To unsubscribe, open the project →
                Reports → Email and disable or delete the schedule.
              </p>
              <p style="margin:8px 0 0; color:#cbd5e1; font-size:10px;">
                © {year} SentiNews · Media monitoring · Bachelor diploma project,
                Astana IT University
              </p>
            </td>
          </tr>

        </table>
      </td></tr>
    </table>
  </body>
</html>
"""


def _kpi_cell(label: str, value: str, accent: str) -> str:
    return (
        '<td align="center" valign="top" '
        'style="padding:0 4px;" width="25%">'
        '<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" '
        f'style="background:#f8fafc; border:1px solid #e2e8f0; border-top:3px solid {accent}; '
        'border-radius:10px;">'
        '<tr><td align="center" style="padding:14px 6px;">'
        f'<div style="font-size:20px; font-weight:700; color:#0f172a; line-height:1;">{value}</div>'
        f'<div style="font-size:11px; color:#64748b; margin-top:6px; letter-spacing:0.4px;">{label}</div>'
        "</td></tr></table>"
        "</td>"
    )


def _format_kpi_row(summary: dict, accent: str) -> str:
    """Build the four-cell HTML row from the summary dict produced by
    ``report_service._stats_to_summary``. Falls back to zeros if a key
    is missing so the email still renders."""
    cells = [
        _kpi_cell("Mentions", f"{int(summary.get('total_mentions') or 0):,}", accent),
        _kpi_cell("Reach", _compact_int(int(summary.get('total_reach') or 0)), accent),
        _kpi_cell("Positive", f"{int(summary.get('positive_pct') or 0)}%", accent),
        _kpi_cell("Negative", f"{int(summary.get('negative_pct') or 0)}%", accent),
    ]
    return '<td width="6"></td>'.join(cells)


def _format_sentiment_bar(positive: int, neutral: int, negative: int) -> str:
    """3-segment proportional bar; uses table widths so Outlook honours it."""
    total = max(1, positive + neutral + negative)
    pos_w = max(2, round(positive * 100 / total))
    neg_w = max(2, round(negative * 100 / total))
    neu_w = max(2, 100 - pos_w - neg_w)
    return (
        '<table role="presentation" cellspacing="0" cellpadding="0" border="0" '
        'width="100%" style="border-radius:999px; overflow:hidden;">'
        '<tr style="height:10px;">'
        f'<td width="{pos_w}%" style="background:#10b981;"></td>'
        f'<td width="{neu_w}%" style="background:#94a3b8;"></td>'
        f'<td width="{neg_w}%" style="background:#ef4444;"></td>'
        '</tr></table>'
    )


def _format_top_sources(top_sources: list, accent: str) -> str:
    """Compact list of the top 4 sources with a coloured rank pill."""
    if not top_sources:
        return ""
    rows = []
    for idx, src in enumerate(top_sources[:4], 1):
        name = str(src.get("name") or "—")[:50]
        mentions = int(src.get("mentions") or 0)
        rows.append(
            '<tr>'
            f'<td style="padding:10px 0; border-bottom:1px solid #f1f5f9;">'
            '<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">'
            '<tr>'
            f'<td width="28" style="vertical-align:top;">'
            f'<div style="display:inline-block; width:22px; height:22px; line-height:22px; '
            f'text-align:center; background:{accent}; color:#ffffff; border-radius:6px; '
            f'font-size:11px; font-weight:700;">{idx}</div></td>'
            f'<td style="font-size:13px; color:#0f172a; font-weight:500; padding-left:10px;">{name}</td>'
            f'<td align="right" style="font-size:13px; color:#64748b; font-variant-numeric:tabular-nums;">'
            f'{mentions:,}</td>'
            '</tr></table>'
            '</td></tr>'
        )
    return (
        '<tr><td style="padding:24px 32px 4px; background:#ffffff;">'
        '<p style="margin:0 0 10px; font-size:12px; letter-spacing:1px; '
        'text-transform:uppercase; color:#64748b; font-weight:600;">Top sources</p>'
        '<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">'
        + "".join(rows)
        + "</table></td></tr>"
    )


def _compact_int(n: int) -> str:
    if abs(n) >= 1_000_000:
        return f"{n / 1_000_000:.1f}M"
    if abs(n) >= 1_000:
        return f"{n / 1_000:.1f}K"
    return f"{n:,}"


def _darken_hex(hex_color: str, factor: float = 0.78) -> str:
    """Return a slightly darker variant of `hex_color` for the gradient hero.
    Defensive: returns the original on any parse error so the template still
    renders in production."""
    try:
        s = (hex_color or "").lstrip("#")
        if len(s) == 3:
            s = "".join(ch * 2 for ch in s)
        if len(s) != 6:
            return hex_color
        r = int(s[0:2], 16)
        g = int(s[2:4], 16)
        b = int(s[4:6], 16)
        r = max(0, int(r * factor))
        g = max(0, int(g * factor))
        b = max(0, int(b * factor))
        return f"#{r:02x}{g:02x}{b:02x}"
    except Exception:
        return hex_color


async def send_report_email(
    to_emails: Iterable[str],
    subject: str,
    summary: dict,
    pdf_bytes: bytes,
    pdf_filename: str = "report.pdf",
    project_name: str = "Project",
    accent_color: str = "#0d9488",
) -> dict:
    """Send a premium HTML report email with the PDF attached.

    Returns ``{success: bool, reason?: str, sent_count?: int, error?: str}``
    so the caller can surface a useful toast in the UI without raising.
    Multiple recipients are batched into one message (To: header) which
    is fine for the small recipient lists this app uses.
    """
    from datetime import datetime

    recipients = [r for r in (to_emails or []) if r and "@" in r]
    if not recipients:
        return {"success": False, "reason": "no_valid_recipients"}

    if not settings.SMTP_HOST or not settings.SMTP_USER:
        logger.warning(
            "SMTP not configured — would have sent report email to %s",
            ", ".join(recipients),
        )
        return {"success": False, "reason": "smtp_not_configured"}

    msg = EmailMessage()
    msg["From"] = settings.SMTP_FROM_EMAIL or settings.SMTP_USER
    msg["To"] = ", ".join(recipients)
    msg["Subject"] = subject

    accent = accent_color if (accent_color or "").startswith("#") else f"#{accent_color}"
    accent_dark = _darken_hex(accent, 0.74)
    pos_pct = int(summary.get("positive_pct") or 0)
    neg_pct = int(summary.get("negative_pct") or 0)
    neu_pct = max(0, 100 - pos_pct - neg_pct)
    if "neutral_pct" in summary and summary.get("neutral_pct"):
        neu_pct = int(summary["neutral_pct"])

    html = _REPORT_HTML_TEMPLATE.format(
        project_name=project_name,
        tagline="Your latest media-monitoring report",
        accent=accent,
        accent_dark=accent_dark,
        kpi_cells=_format_kpi_row(summary or {}, accent),
        sentiment_bar=_format_sentiment_bar(pos_pct, neu_pct, neg_pct),
        positive_pct=pos_pct,
        neutral_pct=neu_pct,
        negative_pct=neg_pct,
        top_sources_block=_format_top_sources(summary.get("top_sources") or [], accent),
        year=datetime.utcnow().year,
    )

    msg.set_content(
        f"{project_name} — media monitoring report.\n\n"
        f"Mentions: {summary.get('total_mentions', 0)} · "
        f"Reach: {_compact_int(int(summary.get('total_reach') or 0))} · "
        f"Positive: {summary.get('positive_pct', 0)}% · "
        f"Negative: {summary.get('negative_pct', 0)}%\n\n"
        f"The full PDF report is attached. It includes geographic distribution,\n"
        f"emotion analysis, hot hours, top sources and recent mentions.\n"
    )
    msg.add_alternative(html, subtype="html")
    msg.add_attachment(
        pdf_bytes,
        maintype="application",
        subtype="pdf",
        filename=pdf_filename,
    )

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            use_tls=False,
            start_tls=True,
        )
        logger.info(
            "Report email sent to %d recipient(s): %s",
            len(recipients),
            ", ".join(recipients),
        )
        return {"success": True, "sent_count": len(recipients)}
    except Exception as exc:
        logger.error("Failed to send report email: %s", exc)
        return {"success": False, "reason": "smtp_error", "error": str(exc)}
