from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.core.database import get_db
from app.models.admin import AdminUser
from app.repositories.cms_repository import CmsRepository
from app.schemas.cms import BrandingSettingsIn, BrandingSettingsOut, CmsPageCreate, CmsPageOut, CmsPageUpdate

router = APIRouter(prefix="/cms", tags=["admin-cms"])


@router.get("/pages", response_model=list[CmsPageOut])
def list_pages(db: Session = Depends(get_db), _: AdminUser = Depends(get_current_admin)):
    return CmsRepository(db).list_pages()


@router.post("/pages", response_model=CmsPageOut, status_code=status.HTTP_201_CREATED)
def create_page(
    body: CmsPageCreate,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_admin),
):
    repo = CmsRepository(db)
    page = repo.upsert_page(body.page_key)
    for t in body.translations:
        repo.upsert_page_translation(page.id, t.language_code, title=t.title, content=t.content,
                                     meta_description=t.meta_description)
    db.commit()
    return repo.get_page_by_key(body.page_key)


@router.get("/pages/{page_key}", response_model=CmsPageOut)
def get_page(page_key: str, db: Session = Depends(get_db), _: AdminUser = Depends(get_current_admin)):
    page = CmsRepository(db).get_page_by_key(page_key)
    if not page:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")
    return page


@router.put("/pages/{page_key}", response_model=CmsPageOut)
def update_page(
    page_key: str,
    body: CmsPageUpdate,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_admin),
):
    repo = CmsRepository(db)
    page = repo.upsert_page(page_key)
    if body.is_active is not None:
        page.is_active = body.is_active
    if body.translations:
        for t in body.translations:
            repo.upsert_page_translation(page.id, t.language_code, title=t.title, content=t.content,
                                         meta_description=t.meta_description)
    db.commit()
    return repo.get_page_by_key(page_key)


@router.get("/branding", response_model=list[BrandingSettingsOut])
def get_branding(db: Session = Depends(get_db), _: AdminUser = Depends(get_current_admin)):
    from sqlalchemy import select
    from app.models.cms import BrandingSettings
    return list(db.execute(select(BrandingSettings)).scalars().all())


@router.put("/branding", response_model=BrandingSettingsOut)
def update_branding(
    body: BrandingSettingsIn,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_admin),
):
    b = CmsRepository(db).upsert_branding(body.settings_key, body.value)
    db.commit()
    return b
