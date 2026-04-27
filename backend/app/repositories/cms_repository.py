from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select
from app.models.cms import CmsPage, CmsPageTranslation, EmailTemplate, EmailTemplateTranslation, BrandingSettings


class CmsRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_page_by_key(self, key: str) -> CmsPage | None:
        return self.db.execute(
            select(CmsPage)
            .where(CmsPage.page_key == key)
            .options(selectinload(CmsPage.translations))
        ).scalar_one_or_none()

    def list_pages(self) -> list[CmsPage]:
        return list(
            self.db.execute(
                select(CmsPage)
                .options(selectinload(CmsPage.translations))
                .order_by(CmsPage.page_key)
            ).scalars().all()
        )

    def upsert_page(self, key: str) -> CmsPage:
        page = self.get_page_by_key(key)
        if not page:
            page = CmsPage(page_key=key)
            self.db.add(page)
            self.db.flush()
        return page

    def upsert_page_translation(self, page_id: int, language_code: str, **kwargs) -> CmsPageTranslation:
        existing = self.db.execute(
            select(CmsPageTranslation).where(
                CmsPageTranslation.page_id == page_id,
                CmsPageTranslation.language_code == language_code,
            )
        ).scalar_one_or_none()
        if existing:
            for k, v in kwargs.items():
                setattr(existing, k, v)
            self.db.flush()
            return existing
        t = CmsPageTranslation(page_id=page_id, language_code=language_code, **kwargs)
        self.db.add(t)
        self.db.flush()
        return t

    def get_email_template(self, key: str) -> EmailTemplate | None:
        return self.db.execute(
            select(EmailTemplate)
            .where(EmailTemplate.template_key == key)
            .options(selectinload(EmailTemplate.translations))
        ).scalar_one_or_none()

    def get_branding(self, key: str) -> BrandingSettings | None:
        return self.db.execute(
            select(BrandingSettings).where(BrandingSettings.settings_key == key)
        ).scalar_one_or_none()

    def upsert_branding(self, key: str, value: dict | None) -> BrandingSettings:
        existing = self.get_branding(key)
        if existing:
            existing.value = value
            self.db.flush()
            return existing
        b = BrandingSettings(settings_key=key, value=value)
        self.db.add(b)
        self.db.flush()
        return b
