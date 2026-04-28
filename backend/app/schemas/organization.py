from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
from app.models.organization import RespondentRole


class OrganizationCreate(BaseModel):
    name_en: str = Field(min_length=1, max_length=255)
    name_ar: str | None = Field(None, max_length=255)
    slug: str | None = Field(None, max_length=128)
    sector: str | None = Field(None, max_length=64)
    notes: str | None = None


class OrganizationUpdate(BaseModel):
    name_en: str | None = Field(None, min_length=1, max_length=255)
    name_ar: str | None = Field(None, max_length=255)
    sector: str | None = Field(None, max_length=64)
    is_active: bool | None = None
    notes: str | None = None


class OrganizationOut(BaseModel):
    id: int
    name_en: str
    name_ar: str | None
    slug: str
    sector: str | None
    is_active: bool
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ContactCreate(BaseModel):
    organization_id: int
    email: EmailStr
    full_name: str | None = Field(None, max_length=255)
    role: RespondentRole
    survey_id: int | None = None
    notes: str | None = None


class ContactUpdate(BaseModel):
    full_name: str | None = Field(None, max_length=255)
    role: RespondentRole | None = None
    survey_id: int | None = None
    is_active: bool | None = None
    notes: str | None = None


class ContactOut(BaseModel):
    id: int
    organization_id: int
    email: str
    full_name: str | None
    role: RespondentRole
    survey_id: int | None
    is_active: bool
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
