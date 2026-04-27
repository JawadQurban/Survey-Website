from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_survey_session
from app.core.database import get_db
from app.repositories.organization_repository import ContactRepository
from app.schemas.submission import DraftSaveRequest, SubmissionOut, SubmitRequest
from app.services.submission_service import SubmissionService

router = APIRouter(prefix="/submissions", tags=["public-submissions"])


def _extract_session(session: dict) -> tuple[int, int, str, str]:
    return (
        int(session["sub"]),        # contact_id
        int(session["org_id"]),     # org_id
        str(session["role"]),       # role
        str(session["survey_slug"]),
    )


@router.post("/draft", response_model=SubmissionOut)
def save_draft(
    body: DraftSaveRequest,
    db: Session = Depends(get_db),
    session: dict = Depends(get_survey_session),
):
    contact_id, org_id, role, survey_slug = _extract_session(session)
    contact = ContactRepository(db).get_by_id(contact_id)
    email = contact.email if contact else ""

    svc = SubmissionService(db)
    submission = svc.save_draft(
        org_id=org_id,
        contact_id=contact_id,
        email=email,
        survey_slug=body.survey_slug,
        role=role,
        language=body.language,
        answers=body.answers,
    )
    return submission


@router.post("/submit", response_model=SubmissionOut)
def submit_survey(
    body: SubmitRequest,
    db: Session = Depends(get_db),
    session: dict = Depends(get_survey_session),
):
    contact_id, org_id, role, survey_slug = _extract_session(session)
    contact = ContactRepository(db).get_by_id(contact_id)
    email = contact.email if contact else ""

    svc = SubmissionService(db)
    submission = svc.submit(
        org_id=org_id,
        contact_id=contact_id,
        email=email,
        survey_slug=body.survey_slug,
        role=role,
        language=body.language,
        answers=body.answers,
    )
    return submission


@router.get("/my", response_model=SubmissionOut | None)
def get_my_submission(
    survey_slug: str,
    db: Session = Depends(get_db),
    session: dict = Depends(get_survey_session),
):
    contact_id = int(session["sub"])
    from app.repositories.survey_repository import SurveyRepository
    from app.repositories.submission_repository import SubmissionRepository

    survey = SurveyRepository(db).get_by_slug(survey_slug)
    if not survey:
        return None
    return SubmissionRepository(db).get_for_contact_survey(contact_id, survey.id)
