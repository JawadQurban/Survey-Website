from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.verification import VerificationAttempt


class VerificationRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_or_create_attempt(self, email: str, ip: str | None) -> VerificationAttempt:
        window_start = datetime.now(timezone.utc) - timedelta(hours=1)
        attempt = self.db.execute(
            select(VerificationAttempt).where(
                VerificationAttempt.email == email.lower(),
                VerificationAttempt.window_start >= window_start,
            )
        ).scalar_one_or_none()
        if attempt:
            attempt.attempt_count += 1
            self.db.flush()
        else:
            attempt = VerificationAttempt(email=email.lower(), ip_address=ip, attempt_count=1)
            self.db.add(attempt)
            self.db.flush()
        return attempt
