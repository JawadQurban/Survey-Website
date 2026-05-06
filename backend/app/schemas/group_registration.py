from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, field_validator
import re


# ── Course catalog ─────────────────────────────────────────────────────────────

class TrainingCourseOut(BaseModel):
    id:             int
    sector:         str
    functional_area: str
    course_code:    str
    course_title:   str
    duration_days:  int | None
    capacity:       int
    is_active:      bool

    model_config = {"from_attributes": True}


# ── Nomination row (one row in the repeating table) ───────────────────────────

class NominationRow(BaseModel):
    sector:             str = Field(min_length=1, max_length=64)
    functional_area:    str = Field(min_length=1, max_length=128)
    course_code:        str = Field(min_length=1, max_length=32)
    course_title:       str = Field(min_length=1, max_length=256)
    delivery_mode:      str = Field(min_length=1, max_length=32)
    preferred_quarters: list[int] = Field(min_length=1)
    num_nominations:    int = Field(ge=1, le=500)

    @field_validator("preferred_quarters")
    @classmethod
    def validate_quarters(cls, v: list[int]) -> list[int]:
        if not all(q in (1, 2, 3, 4) for q in v):
            raise ValueError("Quarters must be 1, 2, 3, or 4")
        return sorted(set(v))

    @field_validator("delivery_mode")
    @classmethod
    def validate_delivery_mode(cls, v: str) -> str:
        allowed = {"Blended", "In-Person", "Virtual"}
        if v not in allowed:
            raise ValueError(f"delivery_mode must be one of: {', '.join(allowed)}")
        return v


# ── Public submission ─────────────────────────────────────────────────────────

class GroupRegistrationCreate(BaseModel):
    # Section 1
    organization_name:    str = Field(min_length=1, max_length=255)
    department:           str | None = Field(None, max_length=255)
    focal_point_name:     str = Field(min_length=1, max_length=255)
    focal_point_position: str | None = Field(None, max_length=255)
    email:                EmailStr
    mobile:               str | None = Field(None, max_length=32)

    # Section 2
    selected_sectors:          list[str] = Field(default_factory=list)
    selected_functional_areas: list[str] = Field(default_factory=list)

    # Section 3 — at least one nomination required
    nominations: list[NominationRow] = Field(min_length=1)

    # Section 4
    special_requests: str | None = Field(None, max_length=4000)

    # Section 5
    submitted_by:    str | None = Field(None, max_length=255)
    pdpl_authorized: bool

    language_used: str = Field(default="en", max_length=8)

    @field_validator("pdpl_authorized")
    @classmethod
    def must_authorize(cls, v: bool) -> bool:
        if not v:
            raise ValueError("PDPL authorization is required to submit")
        return v

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, v: str | None) -> str | None:
        if v is None:
            return v
        cleaned = re.sub(r"\s+", "", v)
        if not re.match(r"^(\+966|00966|0)5\d{8}$", cleaned):
            raise ValueError("Mobile must be a valid Saudi number (e.g. 05XXXXXXXX or +9665XXXXXXXX)")
        return cleaned


# ── Admin / response ──────────────────────────────────────────────────────────

class GroupRegistrationOut(BaseModel):
    id:                        int
    reference_number:          str
    organization_name:         str
    department:                str | None
    focal_point_name:          str
    focal_point_position:      str | None
    email:                     str
    mobile:                    str | None
    selected_sectors:          list | None
    selected_functional_areas: list | None
    nominations:               list | None
    special_requests:          str | None
    submitted_by:              str | None
    pdpl_authorized:           bool
    language_used:             str
    status:                    str
    submitted_at:              datetime | None
    created_at:                datetime
    updated_at:                datetime

    model_config = {"from_attributes": True}


class GroupRegistrationSummary(BaseModel):
    id:               int
    reference_number: str
    organization_name: str
    focal_point_name:  str
    email:             str
    nomination_count:  int
    status:            str
    submitted_at:      datetime | None
    created_at:        datetime

    model_config = {"from_attributes": True}


class TrainingCourseCreate(BaseModel):
    sector:          str = Field(min_length=1, max_length=64)
    functional_area: str = Field(min_length=1, max_length=128)
    course_code:     str = Field(min_length=1, max_length=32)
    course_title:    str = Field(min_length=1, max_length=256)
    duration_days:   int | None = None
    capacity:        int = Field(default=25, ge=1)


class TrainingCourseUpdate(BaseModel):
    sector:          str | None = Field(None, min_length=1, max_length=64)
    functional_area: str | None = Field(None, min_length=1, max_length=128)
    course_title:    str | None = Field(None, min_length=1, max_length=256)
    duration_days:   int | None = None
    capacity:        int | None = Field(None, ge=1)
    is_active:       bool | None = None


# ── Group Registration Config ─────────────────────────────────────────────────

class GroupRegistrationConfigCreate(BaseModel):
    slug:           str = Field(min_length=1, max_length=128)
    title_en:       str = Field(min_length=1, max_length=255)
    title_ar:       str | None = Field(None, max_length=255)
    description_en: str | None = None
    description_ar: str | None = None
    is_active:      bool = True


class GroupRegistrationConfigUpdate(BaseModel):
    title_en:       str | None = Field(None, min_length=1, max_length=255)
    title_ar:       str | None = Field(None, max_length=255)
    description_en: str | None = None
    description_ar: str | None = None
    is_active:      bool | None = None


class GroupRegistrationConfigOut(BaseModel):
    id:             int
    slug:           str
    title_en:       str
    title_ar:       str | None
    description_en: str | None
    description_ar: str | None
    is_active:      bool
    created_at:     datetime
    updated_at:     datetime

    model_config = {"from_attributes": True}
