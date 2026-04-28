from datetime import datetime, timezone
from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

import enum


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class RespondentRole(str, enum.Enum):
    CEO = "ceo"
    CHRO = "chro"
    LD = "ld"


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name_en: Mapped[str] = mapped_column(String(255), nullable=False)
    name_ar: Mapped[str | None] = mapped_column(String(255))
    slug: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    sector: Mapped[str | None] = mapped_column(String(64))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    contacts: Mapped[list["OrganizationContact"]] = relationship(back_populates="organization", cascade="all, delete-orphan")
    submissions: Mapped[list["Submission"]] = relationship(back_populates="organization")  # type: ignore[name-defined]


class OrganizationContact(Base):
    __tablename__ = "organization_contacts"
    __table_args__ = (
        UniqueConstraint("organization_id", "email", name="uq_org_email"),
        Index("ix_org_contacts_email", "email"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    organization_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("organizations.id", ondelete="CASCADE"))
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(255))
    role: Mapped[RespondentRole] = mapped_column(String(16), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    survey_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("surveys.id", ondelete="SET NULL"), nullable=True)

    organization: Mapped["Organization"] = relationship(back_populates="contacts")
    survey: Mapped["Survey | None"] = relationship(foreign_keys=[survey_id])  # type: ignore[name-defined]
    submissions: Mapped[list["Submission"]] = relationship(back_populates="contact")  # type: ignore[name-defined]
