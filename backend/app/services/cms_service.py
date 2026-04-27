from sqlalchemy.orm import Session
from app.repositories.cms_repository import CmsRepository
from app.models.cms import CmsPage, EmailTemplate, BrandingSettings


class CmsService:
    def __init__(self, db: Session):
        self.repo = CmsRepository(db)
        self.db = db

    def list_pages(self) -> list[CmsPage]:
        return self.repo.list_pages()

    def get_page(self, key: str) -> CmsPage | None:
        return self.repo.get_page_by_key(key)

    def upsert_page(self, key: str, translations: list[dict]) -> CmsPage:
        page = self.repo.upsert_page(key)
        for t in translations:
            self.repo.upsert_page_translation(
                page_id=page.id,
                language_code=t["language_code"],
                title=t.get("title", ""),
                content=t.get("content"),
                meta_description=t.get("meta_description"),
            )
        self.db.commit()
        self.db.refresh(page)
        return page

    def get_email_template(self, key: str) -> EmailTemplate | None:
        return self.repo.get_email_template(key)

    def get_branding(self, key: str) -> BrandingSettings | None:
        return self.repo.get_branding(key)

    def upsert_branding(self, key: str, value: dict | None) -> BrandingSettings:
        result = self.repo.upsert_branding(key, value)
        self.db.commit()
        return result
