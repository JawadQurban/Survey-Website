from datetime import datetime, timezone
from sqlalchemy import BigInteger, Boolean, DateTime, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class TrainingCourse(Base):
    __tablename__ = "training_courses"

    id:              Mapped[int]       = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    sector:          Mapped[str]       = mapped_column(String(64),  nullable=False)
    functional_area: Mapped[str]       = mapped_column(String(128), nullable=False)
    course_code:     Mapped[str]       = mapped_column(String(32),  nullable=False, unique=True)
    course_title:    Mapped[str]       = mapped_column(String(256), nullable=False)
    duration_days:   Mapped[int | None]= mapped_column(Integer)
    capacity:        Mapped[int]       = mapped_column(Integer, default=25)
    is_active:       Mapped[bool]      = mapped_column(Boolean, default=True)
    created_at:      Mapped[datetime]  = mapped_column(DateTime(timezone=True), default=_utcnow)


class GroupRegistration(Base):
    __tablename__ = "group_registrations"

    id:                    Mapped[int]        = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    reference_number:      Mapped[str]        = mapped_column(String(32),  nullable=False, unique=True)

    # Section 1 — Organization Details
    organization_name:     Mapped[str]        = mapped_column(String(255), nullable=False)
    department:            Mapped[str | None] = mapped_column(String(255))
    focal_point_name:      Mapped[str]        = mapped_column(String(255), nullable=False)
    focal_point_position:  Mapped[str | None] = mapped_column(String(255))
    email:                 Mapped[str]        = mapped_column(String(255), nullable=False)
    mobile:                Mapped[str | None] = mapped_column(String(32))

    # Section 2 — Sector / Functional Area selections (top-level checkboxes)
    selected_sectors:          Mapped[list | None] = mapped_column(JSON)
    selected_functional_areas: Mapped[list | None] = mapped_column(JSON)

    # Section 3 — Nominations table (array of row dicts)
    # Each row: {sector, functional_area, course_code, course_title,
    #            delivery_mode, preferred_quarters, num_nominations}
    nominations: Mapped[list | None] = mapped_column(JSON)

    # Section 4 — Special Requests
    special_requests: Mapped[str | None] = mapped_column(Text)

    # Section 5 — Authorization
    submitted_by:    Mapped[str | None] = mapped_column(String(255))
    pdpl_authorized: Mapped[bool]       = mapped_column(Boolean, default=False)

    # Meta
    language_used: Mapped[str]      = mapped_column(String(8),  default="en")
    status:        Mapped[str]      = mapped_column(String(32), default="submitted")
    submitted_at:  Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at:    Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at:    Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)
