from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.core.database import get_db
from app.models.admin import AdminUser
from app.repositories.admin_repository import AdminRepository
from app.repositories.survey_repository import SurveyRepository
from app.schemas.survey import QuestionCreate, QuestionOut

router = APIRouter(prefix="/questions", tags=["admin-questions"])


@router.post("", response_model=QuestionOut, status_code=status.HTTP_201_CREATED)
def create_question(
    body: QuestionCreate,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
):
    repo = SurveyRepository(db)
    question = repo.create_question(
        section_id=body.section_id,
        question_key=body.question_key,
        question_type=body.question_type,
        display_order=body.display_order,
        is_required=body.is_required,
        has_open_text_option=body.has_open_text_option,
        open_text_label_en=body.open_text_label_en,
        open_text_label_ar=body.open_text_label_ar,
        module=body.module,
    )
    for t in body.translations:
        repo.upsert_question_translation(question.id, t.language_code, text=t.text, helper_text=t.helper_text)
    repo.set_visibility_rules(question.id, body.visible_to_roles)
    AdminRepository(db).log_action(current_admin.id, "question_created", "question", str(question.id))
    db.commit()
    db.refresh(question)
    return question


@router.put("/{question_id}", response_model=QuestionOut)
def update_question(
    question_id: int,
    body: QuestionCreate,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
):
    repo = SurveyRepository(db)
    from app.models.survey import Question
    question = db.get(Question, question_id)
    if not question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

    question.question_type        = body.question_type.value
    question.display_order        = body.display_order
    question.is_required          = body.is_required
    question.has_open_text_option = body.has_open_text_option
    question.open_text_label_en   = body.open_text_label_en
    question.open_text_label_ar   = body.open_text_label_ar
    question.module               = body.module

    for t in body.translations:
        repo.upsert_question_translation(question_id, t.language_code, text=t.text, helper_text=t.helper_text)
    repo.set_visibility_rules(question_id, body.visible_to_roles)

    AdminRepository(db).log_action(current_admin.id, "question_updated", "question", str(question_id))
    db.commit()
    db.refresh(question)
    return question


@router.delete("/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
):
    from app.models.survey import Question
    question = db.get(Question, question_id)
    if not question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
    db.delete(question)
    AdminRepository(db).log_action(current_admin.id, "question_deleted", "question", str(question_id))
    db.commit()
