import logging
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.submission import SubmissionStatus
from app.models.survey import RespondentRole, QuestionType
from app.repositories.submission_repository import SubmissionRepository
from app.repositories.survey_repository import SurveyRepository
from app.schemas.submission import AnswerIn

logger = logging.getLogger(__name__)


class SubmissionService:
    def __init__(self, db: Session):
        self.submission_repo = SubmissionRepository(db)
        self.survey_repo = SurveyRepository(db)
        self.db = db

    def _get_or_create_submission(
        self,
        session_key: str,
        survey_id: int,
        role: str,
        language: str,
        email: str = "",
        org_name: str | None = None,
        sector: str | None = None,
        regulator: str | None = None,
        org_size: str | None = None,
        respondent_name: str | None = None,
    ):
        existing = self.submission_repo.get_by_session_key(session_key, survey_id)
        if existing and existing.status == SubmissionStatus.SUBMITTED:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Your survey has already been submitted. Contact an administrator to reopen it.",
            )
        if not existing:
            existing = self.submission_repo.create(
                session_key=session_key,
                survey_id=survey_id,
                respondent_role=role,
                respondent_email=email,
                language_used=language,
                status=SubmissionStatus.DRAFT,
                org_name_input=org_name,
                sector=sector,
                regulator=regulator,
                org_size=org_size,
                respondent_name=respondent_name,
            )
            self.submission_repo.add_event(existing.id, "draft_started", actor=email or "anonymous")
        return existing

    def _validate_and_save_answers(
        self, submission_id: int, survey_slug: str, role: str, answers: list[AnswerIn]
    ) -> None:
        role_enum = RespondentRole(role)
        allowed_questions = self.survey_repo.get_questions_for_role(survey_slug, role_enum)
        allowed_question_ids = {q.id for q in allowed_questions}

        for answer in answers:
            if answer.question_id not in allowed_question_ids:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Question {answer.question_id} is not allowed for this role",
                )

            question = next((q for q in allowed_questions if q.id == answer.question_id), None)
            if not question:
                continue

            if question.question_type == QuestionType.OPEN_TEXT:
                if question.is_required and not answer.open_text_value:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail=f"Question {answer.question_id} requires a text answer",
                    )

            if question.question_type == QuestionType.SINGLE_CHOICE:
                if question.is_required and not answer.selected_option_keys and not answer.open_text_value:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail=f"Question {answer.question_id} requires a selection",
                    )
                if answer.selected_option_keys and len(answer.selected_option_keys) > 1:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail=f"Question {answer.question_id} only allows one selection",
                    )
                if answer.selected_option_keys:
                    valid_keys = {opt.option_key for opt in question.options}
                    for key in answer.selected_option_keys:
                        if key != "__open_text__" and key not in valid_keys:
                            raise HTTPException(
                                status_code=status.HTTP_400_BAD_REQUEST,
                                detail=f"Invalid option key '{key}' for question {answer.question_id}",
                            )

            self.submission_repo.upsert_answer(
                submission_id=submission_id,
                question_id=answer.question_id,
                selected_option_keys=answer.selected_option_keys,
                open_text_value=answer.open_text_value,
                numeric_value=answer.numeric_value,
            )

    def save_draft(
        self,
        session_key: str,
        survey_slug: str,
        role: str,
        language: str,
        answers: list[AnswerIn],
        email: str = "",
        org_name: str | None = None,
        sector: str | None = None,
        regulator: str | None = None,
        org_size: str | None = None,
        respondent_name: str | None = None,
    ):
        survey = self.survey_repo.get_by_slug(survey_slug)
        if not survey:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Survey not found")

        submission = self._get_or_create_submission(
            session_key=session_key,
            survey_id=survey.id,
            role=role,
            language=language,
            email=email,
            org_name=org_name,
            sector=sector,
            regulator=regulator,
            org_size=org_size,
            respondent_name=respondent_name,
        )
        self._validate_and_save_answers(submission.id, survey_slug, role, answers)
        self.db.commit()
        return submission

    def submit(
        self,
        session_key: str,
        survey_slug: str,
        role: str,
        language: str,
        answers: list[AnswerIn],
        email: str = "",
        org_name: str | None = None,
        sector: str | None = None,
        regulator: str | None = None,
        org_size: str | None = None,
        respondent_name: str | None = None,
    ):
        survey = self.survey_repo.get_by_slug(survey_slug)
        if not survey:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Survey not found")

        submission = self._get_or_create_submission(
            session_key=session_key,
            survey_id=survey.id,
            role=role,
            language=language,
            email=email,
            org_name=org_name,
            sector=sector,
            regulator=regulator,
            org_size=org_size,
            respondent_name=respondent_name,
        )
        self._validate_and_save_answers(submission.id, survey_slug, role, answers)
        self.submission_repo.mark_submitted(submission)
        self.submission_repo.add_event(submission.id, "submitted", actor=email or "anonymous")
        self.db.commit()
        logger.info("[Submission] Survey submitted", extra={"submission_id": submission.id, "role": role})
        return submission

    def reopen(self, submission_id: int, admin_email: str, reason: str | None = None):
        submission = self.submission_repo.get_by_id(submission_id)
        if not submission:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
        if submission.status != SubmissionStatus.SUBMITTED:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only submitted surveys can be reopened")
        self.submission_repo.mark_reopened(submission)
        self.submission_repo.add_event(submission.id, "reopened", actor=admin_email, detail=reason)
        self.db.commit()
        return submission
