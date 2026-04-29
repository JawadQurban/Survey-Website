import uuid
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.repositories.survey_repository import SurveyRepository
from app.security.jwt import create_access_token

router = APIRouter(prefix="/surveys", tags=["public-survey-begin"])

VALID_SECTORS = {
    "banks", "insurance", "capital_market", "fintech",
    "financing", "regulatory", "non_financial", "government",
}

VALID_ORG_SIZES = {
    "lt_50", "50_249", "250_999", "1000_4999", "gte_5000",
}

VALID_ROLES = {"ceo", "chro", "ld"}

# These sectors do not have a financial regulator
SECTORS_NO_REGULATOR = {"government", "non_financial"}


class SurveyBeginRequest(BaseModel):
    org_name: str | None = None
    sector: str
    regulator: str | None = None
    org_size: str
    respondent_name: str | None = None
    respondent_email: str | None = None
    role: str

    @field_validator("sector")
    @classmethod
    def validate_sector(cls, v: str) -> str:
        if v not in VALID_SECTORS:
            raise ValueError(f"Invalid sector: {v}")
        return v

    @field_validator("org_size")
    @classmethod
    def validate_org_size(cls, v: str) -> str:
        if v not in VALID_ORG_SIZES:
            raise ValueError(f"Invalid org size: {v}")
        return v

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        if v not in VALID_ROLES:
            raise ValueError(f"Invalid role: {v}")
        return v


class SurveyBeginOut(BaseModel):
    survey_slug: str
    role: str
    sector: str


@router.post("/{survey_slug}/begin", response_model=SurveyBeginOut)
def begin_survey(
    survey_slug: str,
    body: SurveyBeginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    repo = SurveyRepository(db)
    survey = repo.get_by_slug(survey_slug)
    if not survey or not survey.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Survey not found or not currently active.",
        )

    if body.sector not in SECTORS_NO_REGULATOR and not body.regulator:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Please select your regulatory body for this sector.",
        )

    session_key = str(uuid.uuid4())
    token = create_access_token(
        subject=session_key,
        extra={
            "type": "survey_session",
            "survey_slug": survey_slug,
            "role": body.role,
            "sector": body.sector,
            "regulator": body.regulator,
            "org_size": body.org_size,
            "org_name": body.org_name,
            "respondent_name": body.respondent_name,
            "respondent_email": body.respondent_email or "",
            "session_key": session_key,
        },
    )

    response.set_cookie(
        key="survey_session_token",
        value=token,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        max_age=int(timedelta(hours=24).total_seconds()),
        path="/",
    )

    return SurveyBeginOut(survey_slug=survey_slug, role=body.role, sector=body.sector)
