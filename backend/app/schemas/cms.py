from datetime import datetime
from pydantic import BaseModel, Field


class CmsPageTranslationIn(BaseModel):
    language_code: str = Field(min_length=2, max_length=8)
    title: str = Field(min_length=1, max_length=512)
    content: str | None = None
    meta_description: str | None = Field(None, max_length=512)


class CmsPageTranslationOut(CmsPageTranslationIn):
    id: int
    model_config = {"from_attributes": True}


class CmsPageCreate(BaseModel):
    page_key: str = Field(min_length=1, max_length=64)
    translations: list[CmsPageTranslationIn] = Field(min_length=1)


class CmsPageUpdate(BaseModel):
    is_active: bool | None = None
    translations: list[CmsPageTranslationIn] | None = None


class CmsPageOut(BaseModel):
    id: int
    page_key: str
    is_active: bool
    updated_at: datetime
    translations: list[CmsPageTranslationOut] = []

    model_config = {"from_attributes": True}


class EmailTemplateTranslationIn(BaseModel):
    language_code: str = Field(min_length=2, max_length=8)
    subject: str = Field(min_length=1, max_length=512)
    body_html: str | None = None
    body_text: str | None = None


class EmailTemplateTranslationOut(EmailTemplateTranslationIn):
    id: int
    model_config = {"from_attributes": True}


class EmailTemplateOut(BaseModel):
    id: int
    template_key: str
    is_active: bool
    translations: list[EmailTemplateTranslationOut] = []

    model_config = {"from_attributes": True}


class BrandingSettingsIn(BaseModel):
    settings_key: str = Field(min_length=1, max_length=64)
    value: dict | None = None


class BrandingSettingsOut(BaseModel):
    settings_key: str
    value: dict | None
    updated_at: datetime

    model_config = {"from_attributes": True}
