from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import select
from app.models.survey import (
    Survey, SurveyTranslation, SurveySection, SectionTranslation,
    Question, QuestionTranslation, QuestionOption, OptionTranslation,
    QuestionVisibilityRule, RespondentRole,
)


class SurveyRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, survey_id: int) -> Survey | None:
        return self.db.get(Survey, survey_id)

    def get_by_slug(self, slug: str) -> Survey | None:
        return self.db.execute(
            select(Survey)
            .where(Survey.slug == slug)
            .options(selectinload(Survey.translations))
        ).scalar_one_or_none()

    def get_full(self, slug: str) -> Survey | None:
        """Loads survey with all sections, questions, options, translations and visibility rules."""
        return self.db.execute(
            select(Survey)
            .where(Survey.slug == slug, Survey.is_active == True)  # noqa: E712
            .options(
                selectinload(Survey.translations),
                selectinload(Survey.sections).options(
                    selectinload(SurveySection.translations),
                    selectinload(SurveySection.questions).options(
                        selectinload(Question.translations),
                        selectinload(Question.options).options(
                            selectinload(QuestionOption.translations)
                        ),
                        selectinload(Question.visibility_rules),
                        selectinload(Question.conditions),
                    ),
                ),
            )
        ).scalar_one_or_none()

    def list_active(self) -> list[Survey]:
        return list(
            self.db.execute(
                select(Survey)
                .where(Survey.is_active == True)  # noqa: E712
                .options(selectinload(Survey.translations))
                .order_by(Survey.id)
            ).scalars().all()
        )

    def list_all(self) -> list[Survey]:
        return list(
            self.db.execute(
                select(Survey)
                .options(selectinload(Survey.translations))
                .order_by(Survey.id)
            ).scalars().all()
        )

    def create(self, **kwargs) -> Survey:
        survey = Survey(**kwargs)
        self.db.add(survey)
        self.db.flush()
        return survey

    def upsert_translation(self, survey_id: int, language_code: str, **kwargs) -> SurveyTranslation:
        existing = self.db.execute(
            select(SurveyTranslation).where(
                SurveyTranslation.survey_id == survey_id,
                SurveyTranslation.language_code == language_code,
            )
        ).scalar_one_or_none()
        if existing:
            for k, v in kwargs.items():
                setattr(existing, k, v)
            self.db.flush()
            return existing
        t = SurveyTranslation(survey_id=survey_id, language_code=language_code, **kwargs)
        self.db.add(t)
        self.db.flush()
        return t

    def create_section(self, **kwargs) -> SurveySection:
        section = SurveySection(**kwargs)
        self.db.add(section)
        self.db.flush()
        return section

    def upsert_section_translation(self, section_id: int, language_code: str, **kwargs) -> SectionTranslation:
        existing = self.db.execute(
            select(SectionTranslation).where(
                SectionTranslation.section_id == section_id,
                SectionTranslation.language_code == language_code,
            )
        ).scalar_one_or_none()
        if existing:
            for k, v in kwargs.items():
                setattr(existing, k, v)
            self.db.flush()
            return existing
        t = SectionTranslation(section_id=section_id, language_code=language_code, **kwargs)
        self.db.add(t)
        self.db.flush()
        return t

    def create_question(self, **kwargs) -> Question:
        q = Question(**kwargs)
        self.db.add(q)
        self.db.flush()
        return q

    def upsert_question_translation(self, question_id: int, language_code: str, **kwargs) -> QuestionTranslation:
        existing = self.db.execute(
            select(QuestionTranslation).where(
                QuestionTranslation.question_id == question_id,
                QuestionTranslation.language_code == language_code,
            )
        ).scalar_one_or_none()
        if existing:
            for k, v in kwargs.items():
                setattr(existing, k, v)
            self.db.flush()
            return existing
        t = QuestionTranslation(question_id=question_id, language_code=language_code, **kwargs)
        self.db.add(t)
        self.db.flush()
        return t

    def create_option(self, **kwargs) -> QuestionOption:
        opt = QuestionOption(**kwargs)
        self.db.add(opt)
        self.db.flush()
        return opt

    def upsert_option_translation(self, option_id: int, language_code: str, text: str) -> OptionTranslation:
        existing = self.db.execute(
            select(OptionTranslation).where(
                OptionTranslation.option_id == option_id,
                OptionTranslation.language_code == language_code,
            )
        ).scalar_one_or_none()
        if existing:
            existing.text = text
            self.db.flush()
            return existing
        t = OptionTranslation(option_id=option_id, language_code=language_code, text=text)
        self.db.add(t)
        self.db.flush()
        return t

    def set_visibility_rules(self, question_id: int, roles: list[RespondentRole]) -> None:
        existing = self.db.execute(
            select(QuestionVisibilityRule).where(QuestionVisibilityRule.question_id == question_id)
        ).scalars().all()
        for r in existing:
            self.db.delete(r)
        for role in roles:
            self.db.add(QuestionVisibilityRule(question_id=question_id, role=role))
        self.db.flush()

    def get_full_admin(self, survey_id: int) -> Survey | None:
        """Load a survey with all nested data, no is_active filter — for admin use."""
        return self.db.execute(
            select(Survey)
            .where(Survey.id == survey_id)
            .options(
                selectinload(Survey.translations),
                selectinload(Survey.sections).options(
                    selectinload(SurveySection.translations),
                    selectinload(SurveySection.questions).options(
                        selectinload(Question.translations),
                        selectinload(Question.options).options(
                            selectinload(QuestionOption.translations)
                        ),
                        selectinload(Question.visibility_rules),
                        selectinload(Question.conditions),
                    ),
                ),
            )
        ).scalar_one_or_none()

    def get_questions_for_role(self, survey_slug: str, role: RespondentRole) -> list[Question]:
        survey = self.get_full(survey_slug)
        if not survey:
            return []
        questions = []
        for section in survey.sections:
            if not section.is_active:
                continue
            for q in section.questions:
                if not q.is_active:
                    continue
                allowed_roles = [vr.role for vr in q.visibility_rules]
                if role in allowed_roles:
                    questions.append(q)
        return questions
