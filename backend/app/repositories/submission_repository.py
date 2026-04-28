from datetime import datetime, timezone
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import select, func
from app.models.submission import Submission, Answer, SubmissionEvent, SubmissionStatus
from app.models.organization import Organization


class SubmissionRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, submission_id: int) -> Submission | None:
        return self.db.execute(
            select(Submission)
            .where(Submission.id == submission_id)
            .options(
                joinedload(Submission.organization),
                selectinload(Submission.answers),
            )
        ).scalar_one_or_none()

    def get_for_org_role_survey(
        self, org_id: int, survey_id: int, role: str
    ) -> Submission | None:
        return self.db.execute(
            select(Submission).where(
                Submission.organization_id == org_id,
                Submission.survey_id == survey_id,
                Submission.respondent_role == role,
            )
        ).scalar_one_or_none()

    def get_for_contact_survey(
        self, contact_id: int, survey_id: int
    ) -> Submission | None:
        return self.db.execute(
            select(Submission).where(
                Submission.contact_id == contact_id,
                Submission.survey_id == survey_id,
            )
        ).scalar_one_or_none()

    def create(self, **kwargs) -> Submission:
        submission = Submission(**kwargs)
        self.db.add(submission)
        self.db.flush()
        return submission

    def upsert_answer(
        self,
        submission_id: int,
        question_id: int,
        selected_option_keys: list[str] | None,
        open_text_value: str | None,
        numeric_value: float | None,
    ) -> Answer:
        existing = self.db.execute(
            select(Answer).where(
                Answer.submission_id == submission_id,
                Answer.question_id == question_id,
            )
        ).scalar_one_or_none()
        if existing:
            existing.selected_option_keys = selected_option_keys
            existing.open_text_value = open_text_value
            existing.numeric_value = numeric_value
            self.db.flush()
            return existing
        answer = Answer(
            submission_id=submission_id,
            question_id=question_id,
            selected_option_keys=selected_option_keys,
            open_text_value=open_text_value,
            numeric_value=numeric_value,
        )
        self.db.add(answer)
        self.db.flush()
        return answer

    def mark_submitted(self, submission: Submission) -> None:
        submission.status = SubmissionStatus.SUBMITTED
        submission.submitted_at = datetime.now(timezone.utc)
        self.db.flush()

    def mark_reopened(self, submission: Submission) -> None:
        submission.status = SubmissionStatus.REOPENED
        self.db.flush()

    def add_event(
        self,
        submission_id: int,
        event_type: str,
        actor: str | None = None,
        detail: str | None = None,
    ) -> None:
        event = SubmissionEvent(
            submission_id=submission_id,
            event_type=event_type,
            actor=actor,
            detail=detail,
        )
        self.db.add(event)
        self.db.flush()

    def list_with_filters(
        self,
        org_id: int | None = None,
        survey_id: int | None = None,
        role: str | None = None,
        status: SubmissionStatus | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[Submission], int]:
        base = select(Submission).options(joinedload(Submission.organization))

        if org_id:
            base = base.where(Submission.organization_id == org_id)
        if survey_id:
            base = base.where(Submission.survey_id == survey_id)
        if role:
            base = base.where(Submission.respondent_role == role)
        if status:
            base = base.where(Submission.status == status)

        total_q = select(func.count()).select_from(base.subquery())
        total = self.db.execute(total_q).scalar_one()

        rows = list(
            self.db.execute(
                base.order_by(Submission.created_at.desc()).offset(skip).limit(limit)
            ).scalars().all()
        )
        return rows, total

    def count_by_status(self) -> dict[str, int]:
        rows = self.db.execute(
            select(Submission.status, func.count()).group_by(Submission.status)
        ).all()
        return {str(row[0]): row[1] for row in rows}

    def count_completed_by_org(self) -> dict[int, dict[str, bool]]:
        rows = self.db.execute(
            select(
                Submission.organization_id,
                Submission.respondent_role,
                Submission.status,
            ).where(Submission.status == SubmissionStatus.SUBMITTED)
        ).all()
        result: dict[int, dict[str, bool]] = {}
        for org_id, role, _ in rows:
            if org_id not in result:
                result[org_id] = {}
            result[org_id][role] = True
        return result
