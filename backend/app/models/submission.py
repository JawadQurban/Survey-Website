from datetime import datetime, timezone
from sqlalchemy import (
    BigInteger, DateTime, ForeignKey, Index, JSON, String, Text, UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

import enum


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class SubmissionStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    REOPENED = "reopened"


class Submission(Base):
    __tablename__ = "submissions"
    __table_args__ = (
        Index("ix_submissions_org_survey", "organization_id", "survey_id"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)

    # Optional FK — null for anonymous/self-service respondents
    organization_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True
    )
    contact_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("organization_contacts.id", ondelete="SET NULL"), nullable=True
    )
    survey_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("surveys.id", ondelete="CASCADE"))

    # Anonymous respondent metadata (set from self-service onboarding)
    session_key: Mapped[str | None] = mapped_column(String(64), nullable=True)
    org_name_input: Mapped[str | None] = mapped_column(String(255), nullable=True)
    sector: Mapped[str | None] = mapped_column(String(32), nullable=True)
    regulator: Mapped[str | None] = mapped_column(String(64), nullable=True)
    org_size: Mapped[str | None] = mapped_column(String(32), nullable=True)
    respondent_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    respondent_role: Mapped[str] = mapped_column(String(16), nullable=False)
    respondent_email: Mapped[str] = mapped_column(String(255), default="", server_default="")
    language_used: Mapped[str] = mapped_column(String(8), default="en")
    status: Mapped[SubmissionStatus] = mapped_column(String(16), default=SubmissionStatus.DRAFT)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    organization: Mapped["Organization | None"] = relationship(back_populates="submissions")  # type: ignore[name-defined]
    contact: Mapped["OrganizationContact | None"] = relationship(back_populates="submissions")  # type: ignore[name-defined]
    survey: Mapped["Survey"] = relationship(back_populates="submissions")  # type: ignore[name-defined]
    answers: Mapped[list["Answer"]] = relationship(back_populates="submission", cascade="all, delete-orphan")
    events: Mapped[list["SubmissionEvent"]] = relationship(back_populates="submission", cascade="all, delete-orphan")


class Answer(Base):
    __tablename__ = "answers"
    __table_args__ = (
        UniqueConstraint("submission_id", "question_id", name="uq_answer_question"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    submission_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("submissions.id", ondelete="CASCADE"))
    question_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("questions.id", ondelete="CASCADE"))
    selected_option_keys: Mapped[list | None] = mapped_column(JSON)
    open_text_value: Mapped[str | None] = mapped_column(Text)
    numeric_value: Mapped[float | None] = mapped_column()
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    submission: Mapped["Submission"] = relationship(back_populates="answers")
    question: Mapped["Question"] = relationship(back_populates="answers")  # type: ignore[name-defined]


class SubmissionEvent(Base):
    __tablename__ = "submission_events"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    submission_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("submissions.id", ondelete="CASCADE"))
    event_type: Mapped[str] = mapped_column(String(64), nullable=False)
    actor: Mapped[str | None] = mapped_column(String(255))
    detail: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    submission: Mapped["Submission"] = relationship(back_populates="events")
