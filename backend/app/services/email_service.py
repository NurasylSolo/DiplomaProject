import logging
from email.message import EmailMessage

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
