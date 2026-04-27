from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.core.database import get_db
from app.models.admin import AdminUser
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
    survey = repo.get_by_id(survey_id)
    if not survey:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Survey not found")
    return repo.get_full(survey.slug)


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

    updates = body.model_dump(exclude_none=True, exclude={"translations"})
    for k, v in updates.items():
        setattr(survey, k, v)

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
