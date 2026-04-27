from datetime import datetime, timezone
from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class CmsPage(Base):
    __tablename__ = "cms_pages"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    page_key: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    translations: Mapped[list["CmsPageTranslation"]] = relationship(back_populates="page", cascade="all, delete-orphan")


class CmsPageTranslation(Base):
    __tablename__ = "cms_page_translations"
    __table_args__ = (UniqueConstraint("page_id", "language_code"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    page_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("cms_pages.id", ondelete="CASCADE"))
    language_code: Mapped[str] = mapped_column(String(8), nullable=False)
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    content: Mapped[str | None] = mapped_column(Text)
    meta_description: Mapped[str | None] = mapped_column(String(512))

    page: Mapped["CmsPage"] = relationship(back_populates="translations")


class EmailTemplate(Base):
    __tablename__ = "email_templates"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    template_key: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    translations: Mapped[list["EmailTemplateTranslation"]] = relationship(back_populates="template", cascade="all, delete-orphan")


class EmailTemplateTranslation(Base):
    __tablename__ = "email_template_translations"
    __table_args__ = (UniqueConstraint("template_id", "language_code"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    template_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("email_templates.id", ondelete="CASCADE"))
    language_code: Mapped[str] = mapped_column(String(8), nullable=False)
    subject: Mapped[str] = mapped_column(String(512), nullable=False)
    body_html: Mapped[str | None] = mapped_column(Text)
    body_text: Mapped[str | None] = mapped_column(Text)

    template: Mapped["EmailTemplate"] = relationship(back_populates="translations")


class BrandingSettings(Base):
    __tablename__ = "branding_settings"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    settings_key: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    value: Mapped[dict | None] = mapped_column(JSON)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)
