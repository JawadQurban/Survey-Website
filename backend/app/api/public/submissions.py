from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_survey_session
from app.core.database import get_db
from app.schemas.submission import DraftSaveRequest, SubmissionOut, SubmitRequest
from app.services.submission_service import SubmissionService

router = APIRouter(prefix="/submissions", tags=["public-submissions"])


def _session_ctx(session: dict) -> dict:
    """Extract all relevant fields from the survey session JWT."""
    return {
        "session_key": session.get("session_key", session.get("sub", "")),
        "role": str(session["role"]),
        "survey_slug": str(session["survey_slug"]),
        "email": session.get("respondent_email", ""),
        "org_name": session.get("org_name"),
        "sector": session.get("sector"),
        "regulator": session.get("regulator"),
        "org_size": session.get("org_size"),
        "respondent_name": session.get("respondent_name"),
    }


@router.post("/draft", response_model=SubmissionOut)
def save_draft(
    body: DraftSaveRequest,
    db: Session = Depends(get_db),
    session: dict = Depends(get_survey_session),
):
    ctx = _session_ctx(session)
    return SubmissionService(db).save_draft(
        session_key=ctx["session_key"],
        survey_slug=body.survey_slug,
        role=ctx["role"],
        language=body.language,
        answers=body.answers,
        email=ctx["email"],
        org_name=ctx["org_name"],
        sector=ctx["sector"],
        regulator=ctx["regulator"],
        org_size=ctx["org_size"],
        respondent_name=ctx["respondent_name"],
    )


@router.post("/submit", response_model=SubmissionOut)
def submit_survey(
    body: SubmitRequest,
    db: Session = Depends(get_db),
    session: dict = Depends(get_survey_session),
):
    ctx = _session_ctx(session)
    return SubmissionService(db).submit(
        session_key=ctx["session_key"],
        survey_slug=body.survey_slug,
        role=ctx["role"],
        language=body.language,
        answers=body.answers,
        email=ctx["email"],
        org_name=ctx["org_name"],
        sector=ctx["sector"],
        regulator=ctx["regulator"],
        org_size=ctx["org_size"],
        respondent_name=ctx["respondent_name"],
    )


@router.get("/my", response_model=SubmissionOut | None)
def get_my_submission(
    survey_slug: str,
    db: Session = Depends(get_db),
    session: dict = Depends(get_survey_session),
):
    session_key = session.get("session_key", session.get("sub", ""))
    from app.repositories.survey_repository import SurveyRepository
    from app.repositories.submission_repository import SubmissionRepository

    survey = SurveyRepository(db).get_by_slug(survey_slug)
    if not survey:
        return None
    return SubmissionRepository(db).get_by_session_key(session_key, survey.id)
