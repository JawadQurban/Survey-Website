from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.core.database import get_db
from app.models.admin import AdminUser
from app.repositories.admin_repository import AdminRepository
from app.repositories.survey_repository import SurveyRepository
from app.schemas.survey import OptionCreate, OptionOut

router = APIRouter(prefix="/options", tags=["admin-options"])


@router.post("", response_model=OptionOut, status_code=status.HTTP_201_CREATED)
def create_option(
    body: OptionCreate,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
):
    repo = SurveyRepository(db)
    opt = repo.create_option(
        question_id=body.question_id,
        option_key=body.option_key,
        display_order=body.display_order,
    )
    for t in body.translations:
        repo.upsert_option_translation(opt.id, t.language_code, text=t.text)
    AdminRepository(db).log_action(current_admin.id, "option_created", "option", str(opt.id))
    db.commit()
    db.refresh(opt)
    return opt


@router.put("/{option_id}", response_model=OptionOut)
def update_option(
    option_id: int,
    body: OptionCreate,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
):
    from app.models.survey import QuestionOption
    repo = SurveyRepository(db)
    opt = db.get(QuestionOption, option_id)
    if not opt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Option not found")
    for t in body.translations:
        repo.upsert_option_translation(opt.id, t.language_code, text=t.text)
    AdminRepository(db).log_action(current_admin.id, "option_updated", "option", str(option_id))
    db.commit()
    db.refresh(opt)
    return opt


@router.delete("/{option_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_option(
    option_id: int,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
):
    from app.models.survey import QuestionOption
    opt = db.get(QuestionOption, option_id)
    if not opt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Option not found")
    db.delete(opt)
    AdminRepository(db).log_action(current_admin.id, "option_deleted", "option", str(option_id))
    db.commit()
