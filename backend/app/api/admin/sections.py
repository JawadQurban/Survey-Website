from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.core.database import get_db
from app.models.admin import AdminUser
from app.repositories.admin_repository import AdminRepository
from app.repositories.survey_repository import SurveyRepository
from app.schemas.survey import SectionCreate, SectionOut

router = APIRouter(prefix="/sections", tags=["admin-sections"])


@router.post("", response_model=SectionOut, status_code=status.HTTP_201_CREATED)
def create_section(
    body: SectionCreate,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
):
    repo = SurveyRepository(db)
    section = repo.create_section(
        survey_id=body.survey_id,
        section_key=body.section_key,
        display_order=body.display_order,
    )
    for t in body.translations:
        repo.upsert_section_translation(section.id, t.language_code, title=t.title, description=t.description)
    AdminRepository(db).log_action(current_admin.id, "section_created", "section", str(section.id))
    db.commit()
    db.refresh(section)
    return section


@router.delete("/{section_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_section(
    section_id: int,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
):
    from app.models.survey import SurveySection
    section = db.get(SurveySection, section_id)
    if not section:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Section not found")
    db.delete(section)
    AdminRepository(db).log_action(current_admin.id, "section_deleted", "section", str(section_id))
    db.commit()
