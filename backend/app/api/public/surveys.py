from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_survey_session
from app.core.database import get_db
from app.models.survey import RespondentRole
from app.repositories.survey_repository import SurveyRepository
from app.schemas.survey import SurveyWithSectionsOut, SurveyTranslationOut

router = APIRouter(prefix="/surveys", tags=["public-surveys"])


@router.get("/{survey_slug}/overview")
def get_survey_overview(
    survey_slug: str,
    language: str = Query("en"),
    db: Session = Depends(get_db),
    session: dict = Depends(get_survey_session),
):
    repo = SurveyRepository(db)
    survey = repo.get_by_slug(survey_slug)
    if not survey or not survey.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Survey not found")

    translation = next(
        (t for t in survey.translations if t.language_code == language),
        next((t for t in survey.translations if t.language_code == "en"), None),
    )
    if not translation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Survey translation not found")

    return {
        "survey_id": survey.id,
        "slug": survey.slug,
        "title": translation.title,
        "description": translation.description,
        "instructions": translation.instructions,
    }


@router.get("/{survey_slug}/questions", response_model=SurveyWithSectionsOut)
def get_survey_questions(
    survey_slug: str,
    language: str = Query("en"),
    db: Session = Depends(get_db),
    session: dict = Depends(get_survey_session),
):
    role_str = session.get("role")
    try:
        role = RespondentRole(role_str)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role in session")

    repo = SurveyRepository(db)
    survey = repo.get_full(survey_slug)
    if not survey:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Survey not found")

    # Filter sections and questions by role
    filtered_sections = []
    for section in survey.sections:
        if not section.is_active:
            continue
        role_questions = [
            q for q in section.questions
            if q.is_active and role in [vr.role for vr in q.visibility_rules]
        ]
        if role_questions:
            section_copy = {
                "id": section.id,
                "survey_id": section.survey_id,
                "section_key": section.section_key,
                "display_order": section.display_order,
                "is_active": section.is_active,
                "translations": [
                    {"id": t.id, "language_code": t.language_code, "title": t.title, "description": t.description}
                    for t in section.translations
                ],
                "questions": [
                    {
                        "id": q.id,
                        "section_id": q.section_id,
                        "question_key": q.question_key,
                        "question_type": q.question_type,
                        "display_order": q.display_order,
                        "is_required": q.is_required,
                        "is_active": q.is_active,
                        "has_open_text_option": q.has_open_text_option,
                        "open_text_label_en": q.open_text_label_en,
                        "open_text_label_ar": q.open_text_label_ar,
                        "module": q.module,
                        "translations": [
                            {"id": t.id, "language_code": t.language_code, "text": t.text, "helper_text": t.helper_text}
                            for t in q.translations
                        ],
                        "options": [
                            {
                                "id": o.id,
                                "question_id": o.question_id,
                                "option_key": o.option_key,
                                "display_order": o.display_order,
                                "is_active": o.is_active,
                                "translations": [
                                    {"id": ot.id, "language_code": ot.language_code, "text": ot.text}
                                    for ot in o.translations
                                ],
                            }
                            for o in q.options if o.is_active
                        ],
                        "visibility_rules": [
                            {"id": vr.id, "role": vr.role}
                            for vr in q.visibility_rules
                        ],
                    }
                    for q in role_questions
                ],
            }
            filtered_sections.append(section_copy)

    return {
        "id": survey.id,
        "slug": survey.slug,
        "is_active": survey.is_active,
        "is_fs_only": survey.is_fs_only,
        "starts_at": survey.starts_at,
        "ends_at": survey.ends_at,
        "created_at": survey.created_at,
        "translations": [
            {"id": t.id, "language_code": t.language_code, "title": t.title, "description": t.description,
             "instructions": t.instructions, "thank_you_message": t.thank_you_message}
            for t in survey.translations
        ],
        "sections": filtered_sections,
    }
