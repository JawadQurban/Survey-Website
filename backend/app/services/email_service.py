import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import aiosmtplib

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    async def send(self, to_email: str, subject: str, body_html: str) -> None:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
        msg["To"] = to_email
        msg.attach(MIMEText(body_html, "html", "utf-8"))

        try:
            await aiosmtplib.send(
                msg,
                hostname=settings.SMTP_HOST,
                port=settings.SMTP_PORT,
                username=settings.SMTP_USER or None,
                password=settings.SMTP_PASSWORD or None,
                start_tls=settings.SMTP_TLS,
            )
            logger.info("[Email] Sent", extra={"to": to_email, "subject": subject})
        except Exception as exc:
            logger.error("[Email] Send failed", extra={"to": to_email, "error": str(exc)})
            raise
