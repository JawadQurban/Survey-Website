from datetime import datetime, timezone
from sqlalchemy import (
    BigInteger, Boolean, DateTime, ForeignKey,
    Index, Integer, JSON, String, Text, UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

import enum


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class QuestionType(str, enum.Enum):
    SINGLE_CHOICE = "single_choice"
    MULTIPLE_CHOICE = "multiple_choice"
    OPEN_TEXT = "open_text"
    TEXTAREA = "textarea"
    NUMBER = "number"
    RATING = "rating"
    MATRIX = "matrix"


class RespondentRole(str, enum.Enum):
    CEO = "ceo"
    CHRO = "chro"
    LD = "ld"


class Survey(Base):
    __tablename__ = "surveys"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_fs_only: Mapped[bool] = mapped_column(Boolean, default=False)
    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    settings: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    translations: Mapped[list["SurveyTranslation"]] = relationship(back_populates="survey", cascade="all, delete-orphan")
    sections: Mapped[list["SurveySection"]] = relationship(back_populates="survey", cascade="all, delete-orphan", order_by="SurveySection.display_order")
    submissions: Mapped[list["Submission"]] = relationship(back_populates="survey")  # type: ignore[name-defined]


class SurveyTranslation(Base):
    __tablename__ = "survey_translations"
    __table_args__ = (UniqueConstraint("survey_id", "language_code"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    survey_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("surveys.id", ondelete="CASCADE"))
    language_code: Mapped[str] = mapped_column(String(8), nullable=False)
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    instructions: Mapped[str | None] = mapped_column(Text)
    thank_you_message: Mapped[str | None] = mapped_column(Text)

    survey: Mapped["Survey"] = relationship(back_populates="translations")


class SurveySection(Base):
    __tablename__ = "survey_sections"
    __table_args__ = (
        UniqueConstraint("survey_id", "section_key", name="uq_section_key"),
        Index("ix_sections_survey_order", "survey_id", "display_order"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    survey_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("surveys.id", ondelete="CASCADE"))
    section_key: Mapped[str] = mapped_column(String(64), nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    survey: Mapped["Survey"] = relationship(back_populates="sections")
    translations: Mapped[list["SectionTranslation"]] = relationship(back_populates="section", cascade="all, delete-orphan")
    questions: Mapped[list["Question"]] = relationship(back_populates="section", cascade="all, delete-orphan", order_by="Question.display_order")


class SectionTranslation(Base):
    __tablename__ = "section_translations"
    __table_args__ = (UniqueConstraint("section_id", "language_code"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    section_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("survey_sections.id", ondelete="CASCADE"))
    language_code: Mapped[str] = mapped_column(String(8), nullable=False)
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    section: Mapped["SurveySection"] = relationship(back_populates="translations")


class Question(Base):
    __tablename__ = "questions"
    __table_args__ = (Index("ix_questions_section_order", "section_id", "display_order"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    section_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("survey_sections.id", ondelete="CASCADE"))
    question_key: Mapped[str] = mapped_column(String(64), nullable=False)
    question_type: Mapped[QuestionType] = mapped_column(String(32), nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    is_required: Mapped[bool] = mapped_column(Boolean, default=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    has_open_text_option: Mapped[bool] = mapped_column(Boolean, default=False)
    open_text_label_en: Mapped[str | None] = mapped_column(String(255))
    open_text_label_ar: Mapped[str | None] = mapped_column(String(255))
    module: Mapped[str | None] = mapped_column(String(128))
    extra_config: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    section: Mapped["SurveySection"] = relationship(back_populates="questions")
    translations: Mapped[list["QuestionTranslation"]] = relationship(back_populates="question", cascade="all, delete-orphan")
    options: Mapped[list["QuestionOption"]] = relationship(back_populates="question", cascade="all, delete-orphan", order_by="QuestionOption.display_order")
    visibility_rules: Mapped[list["QuestionVisibilityRule"]] = relationship(back_populates="question", cascade="all, delete-orphan")
    conditions: Mapped[list["QuestionCondition"]] = relationship(
        back_populates="question",
        foreign_keys="QuestionCondition.question_id",
        cascade="all, delete-orphan",
    )
    answers: Mapped[list["Answer"]] = relationship(back_populates="question")  # type: ignore[name-defined]


class QuestionTranslation(Base):
    __tablename__ = "question_translations"
    __table_args__ = (UniqueConstraint("question_id", "language_code"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    question_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("questions.id", ondelete="CASCADE"))
    language_code: Mapped[str] = mapped_column(String(8), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    helper_text: Mapped[str | None] = mapped_column(Text)

    question: Mapped["Question"] = relationship(back_populates="translations")


class QuestionOption(Base):
    __tablename__ = "question_options"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    question_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("questions.id", ondelete="CASCADE"))
    option_key: Mapped[str] = mapped_column(String(64), nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    question: Mapped["Question"] = relationship(back_populates="options")
    translations: Mapped[list["OptionTranslation"]] = relationship(back_populates="option", cascade="all, delete-orphan")


class OptionTranslation(Base):
    __tablename__ = "option_translations"
    __table_args__ = (UniqueConstraint("option_id", "language_code"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    option_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("question_options.id", ondelete="CASCADE"))
    language_code: Mapped[str] = mapped_column(String(8), nullable=False)
    text: Mapped[str] = mapped_column(String(1024), nullable=False)

    option: Mapped["QuestionOption"] = relationship(back_populates="translations")


class QuestionVisibilityRule(Base):
    __tablename__ = "question_visibility_rules"
    __table_args__ = (UniqueConstraint("question_id", "role"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    question_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("questions.id", ondelete="CASCADE"))
    role: Mapped[RespondentRole] = mapped_column(String(16), nullable=False)

    question: Mapped["Question"] = relationship(back_populates="visibility_rules")


class QuestionCondition(Base):
    """A question is visible only when condition_question has condition_value selected."""
    __tablename__ = "question_conditions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    question_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("questions.id", ondelete="CASCADE"))
    condition_question_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("questions.id", ondelete="CASCADE"))
    condition_option_key: Mapped[str] = mapped_column(String(64), nullable=False)

    question: Mapped["Question"] = relationship(back_populates="conditions", foreign_keys=[question_id])
    condition_question: Mapped["Question"] = relationship(foreign_keys=[condition_question_id])
