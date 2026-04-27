import logging

from fastapi import HTTPException, Request, status
from sqlalchemy.orm import Session

from app.repositories.organization_repository import ContactRepository
from app.repositories.verification_repository import VerificationRepository
from app.repositories.survey_repository import SurveyRepository
from app.security.jwt import create_access_token

logger = logging.getLogger(__name__)

RATE_LIMIT_PER_HOUR = 10


class VerificationService:
    def __init__(self, db: Session):
        self.contact_repo = ContactRepository(db)
        self.verify_repo = VerificationRepository(db)
        self.survey_repo = SurveyRepository(db)
        self.db = db

    def verify_email(self, email: str, request: Request | None = None) -> dict:
        ip = request.client.host if request and request.client else None

        attempt = self.verify_repo.get_or_create_attempt(email.lower(), ip)
        if attempt.attempt_count > RATE_LIMIT_PER_HOUR:
            logger.warning("[Verify] Rate limit hit", extra={"ip": ip})
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many attempts. Please try again later.")

        contact = self.contact_repo.get_by_email(email)
        if not contact or not contact.is_active:
            self.db.commit()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email not recognized. Please check your email address and try again.")

        active_surveys = self.survey_repo.list_active()
        if not active_surveys:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active survey found.")

        survey = active_surveys[0]

        session_token = create_access_token(
            contact.id,
            extra={
                "type": "survey_session",
                "org_id": contact.organization_id,
                "role": contact.role.value,
                "survey_slug": survey.slug,
            },
        )
        self.db.commit()

        org = contact.organization
        logger.info("[Verify] Session created", extra={"contact_id": contact.id, "role": contact.role.value})

        return {
            "session_token": session_token,
            "organization_id": org.id,
            "organization_name": org.name_en,
            "respondent_role": contact.role.value,
            "survey_slug": survey.slug,
        }
