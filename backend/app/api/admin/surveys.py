from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_admin
from app.core.database import get_db
from app.models.admin import AdminUser
from app.models.submission import Answer, Submission, SubmissionStatus
from app.models.survey import Question, QuestionOption, QuestionType, Survey, SurveySection
from app.repositories.admin_repository import AdminRepository
from app.repositories.survey_repository import SurveyRepository
from app.schemas.survey import SurveyCreate, SurveyOut, SurveyUpdate, SurveyWithSectionsOut

router = APIRouter(prefix="/surveys", tags=["admin-surveys"])


@router.get("", response_model=list[SurveyOut])
def list_surveys(
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_admin),
):
    return SurveyRepository(db).list_all()


@router.post("", response_model=SurveyOut, status_code=status.HTTP_201_CREATED)
def create_survey(
    body: SurveyCreate,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
):
    repo = SurveyRepository(db)
    if repo.get_by_slug(body.slug):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Survey slug already exists")
    survey = repo.create(
        slug=body.slug,
        is_active=body.is_active,
        is_fs_only=body.is_fs_only,
        starts_at=body.starts_at,
        ends_at=body.ends_at,
    )
    for t in body.translations:
        repo.upsert_translation(survey.id, t.language_code, title=t.title, description=t.description,
                                instructions=t.instructions, thank_you_message=t.thank_you_message)
    AdminRepository(db).log_action(current_admin.id, "survey_created", "survey", str(survey.id))
    db.commit()
    return repo.get_by_slug(survey.slug)


@router.get("/{survey_id}", response_model=SurveyWithSectionsOut)
def get_survey(
    survey_id: int,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_admin),
):
    repo = SurveyRepository(db)
    result = repo.get_full_admin(survey_id)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Survey not found")
    return result


@router.put("/{survey_id}", response_model=SurveyOut)
def update_survey(
    survey_id: int,
    body: SurveyUpdate,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
):
    repo = SurveyRepository(db)
    survey = repo.get_by_id(survey_id)
    if not survey:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Survey not found")

    from sqlalchemy.orm.attributes import flag_modified
    updates = body.model_dump(exclude_none=True, exclude={"translations"})
    for k, v in updates.items():
        setattr(survey, k, v)
        if k == "settings":
            flag_modified(survey, "settings")  # JSON columns need explicit dirty-marking

    if body.translations:
        for t in body.translations:
            repo.upsert_translation(survey_id, t.language_code, title=t.title, description=t.description,
                                    instructions=t.instructions, thank_you_message=t.thank_you_message)

    AdminRepository(db).log_action(current_admin.id, "survey_updated", "survey", str(survey_id))
    db.commit()
    return repo.get_by_slug(survey.slug)


@router.delete("/{survey_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_survey(
    survey_id: int,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
):
    repo = SurveyRepository(db)
    survey = repo.get_by_id(survey_id)
    if not survey:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Survey not found")
    db.delete(survey)
    AdminRepository(db).log_action(current_admin.id, "survey_deleted", "survey", str(survey_id))
    db.commit()


@router.get("/{survey_id}/analytics")
def get_survey_analytics(
    survey_id: int,
    role: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_admin),
):
    survey = db.execute(
        select(Survey)
        .where(Survey.id == survey_id)
        .options(
            selectinload(Survey.translations),
            selectinload(Survey.sections).selectinload(SurveySection.translations),
            selectinload(Survey.sections)
                .selectinload(SurveySection.questions)
                .selectinload(Question.translations),
            selectinload(Survey.sections)
                .selectinload(SurveySection.questions)
                .selectinload(Question.options)
                .selectinload(QuestionOption.translations),
        )
    ).scalar_one_or_none()

    if not survey:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Survey not found")

    sub_filters = [
        Submission.survey_id == survey_id,
        Submission.status == SubmissionStatus.SUBMITTED,
    ]
    if role:
        sub_filters.append(Submission.respondent_role == role)
    if date_from:
        sub_filters.append(Submission.submitted_at >= date_from)
    if date_to:
        sub_filters.append(Submission.submitted_at <= date_to)

    submission_ids = [
        row[0]
        for row in db.execute(select(Submission.id).where(and_(*sub_filters))).all()
    ]
    total_submissions = len(submission_ids)

    answer_map: dict[int, list[Answer]] = {}
    if submission_ids:
        for a in db.execute(
            select(Answer).where(Answer.submission_id.in_(submission_ids))
        ).scalars():
            answer_map.setdefault(a.question_id, []).append(a)

    def _t(translations, lang: str, fallback: str) -> str:
        return next((t.text if hasattr(t, "text") else t.title for t in translations if t.language_code == lang), fallback)

    title_en = _t(survey.translations, "en", survey.slug)
    title_ar = next((t.title for t in survey.translations if t.language_code == "ar"), None)

    # Per-role submission counts from the already-fetched submissions
    role_counts: dict[str, int] = {}
    if submission_ids:
        from sqlalchemy import func
        rows = db.execute(
            select(Submission.respondent_role, func.count())
            .where(and_(*sub_filters))
            .group_by(Submission.respondent_role)
        ).all()
        role_counts = {str(r[0]): r[1] for r in rows}

    questions_data = []
    for section in sorted(survey.sections, key=lambda s: s.display_order):
        if not section.is_active:
            continue
        sec_title_en = next((t.title for t in section.translations if t.language_code == "en"), section.section_key)
        sec_title_ar = next((t.title for t in section.translations if t.language_code == "ar"), None)

        for q in sorted(section.questions, key=lambda q: q.display_order):
            if not q.is_active:
                continue

            q_text_en = next((t.text for t in q.translations if t.language_code == "en"), q.question_key)
            q_text_ar = next((t.text for t in q.translations if t.language_code == "ar"), None)

            q_answers = answer_map.get(q.id, [])
            response_count = len(q_answers)

            options_data = None
            open_text_responses = None

            if q.question_type in (QuestionType.SINGLE_CHOICE, QuestionType.MULTIPLE_CHOICE):
                option_counts: dict[str, int] = {}
                for a in q_answers:
                    for key in (a.selected_option_keys or []):
                        option_counts[key] = option_counts.get(key, 0) + 1

                options_data = []
                for opt in sorted(q.options, key=lambda o: o.display_order):
                    if not opt.is_active:
                        continue
                    count = option_counts.get(opt.option_key, 0)
                    opt_text_en = next((t.text for t in opt.translations if t.language_code == "en"), opt.option_key)
                    opt_text_ar = next((t.text for t in opt.translations if t.language_code == "ar"), None)
                    options_data.append({
                        "option_key": opt.option_key,
                        "text_en": opt_text_en,
                        "text_ar": opt_text_ar,
                        "count": count,
                        "percentage": round(count / response_count * 100, 1) if response_count else 0.0,
                    })

                if q.has_open_text_option:
                    open_text_responses = [
                        a.open_text_value for a in q_answers
                        if a.open_text_value and a.open_text_value.strip()
                    ][:100]

            elif q.question_type in (QuestionType.OPEN_TEXT, QuestionType.TEXTAREA):
                open_text_responses = [
                    a.open_text_value for a in q_answers
                    if a.open_text_value and a.open_text_value.strip()
                ][:100]

            questions_data.append({
                "question_id": q.id,
                "question_key": q.question_key,
                "question_text_en": q_text_en,
                "question_text_ar": q_text_ar,
                "question_type": str(q.question_type),
                "is_intro": q.is_intro,
                "section_title_en": sec_title_en,
                "section_title_ar": sec_title_ar,
                "response_count": response_count,
                "options": options_data,
                "open_text_responses": open_text_responses,
            })

    return {
        "survey": {"id": survey.id, "slug": survey.slug, "title_en": title_en, "title_ar": title_ar},
        "total_submissions": total_submissions,
        "role_counts": role_counts,
        "questions": questions_data,
    }
