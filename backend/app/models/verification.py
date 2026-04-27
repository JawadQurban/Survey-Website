from datetime import datetime, timezone
from sqlalchemy import BigInteger, DateTime, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class VerificationAttempt(Base):
    """Tracks email verification attempts per hour for rate limiting."""
    __tablename__ = "verification_attempts"
    __table_args__ = (Index("ix_verification_attempts_email", "email"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    ip_address: Mapped[str | None] = mapped_column(String(45))
    attempt_count: Mapped[int] = mapped_column(Integer, default=1)
    window_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
