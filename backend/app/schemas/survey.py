from datetime import datetime
from pydantic import BaseModel, Field
from app.models.survey import QuestionType, RespondentRole


class TranslationBase(BaseModel):
    language_code: str = Field(min_length=2, max_length=8)


class SurveyTranslationIn(TranslationBase):
    title: str = Field(min_length=1, max_length=512)
    description: str | None = None
    instructions: str | None = None
    thank_you_message: str | None = None


class SurveyTranslationOut(SurveyTranslationIn):
    id: int
    model_config = {"from_attributes": True}


class SurveyCreate(BaseModel):
    slug: str = Field(min_length=1, max_length=128)
    is_active: bool = True
    is_fs_only: bool = False
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    translations: list[SurveyTranslationIn] = Field(min_length=1)


class SurveyUpdate(BaseModel):
    is_active: bool | None = None
    is_fs_only: bool | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    translations: list[SurveyTranslationIn] | None = None


class SurveyOut(BaseModel):
    id: int
    slug: str
    is_active: bool
    is_fs_only: bool
    starts_at: datetime | None
    ends_at: datetime | None
    created_at: datetime
    translations: list[SurveyTranslationOut] = []

    model_config = {"from_attributes": True}


class SectionTranslationIn(TranslationBase):
    title: str = Field(min_length=1, max_length=512)
    description: str | None = None


class SectionTranslationOut(SectionTranslationIn):
    id: int
    model_config = {"from_attributes": True}


class SectionCreate(BaseModel):
    survey_id: int
    section_key: str = Field(min_length=1, max_length=64)
    display_order: int = 0
    translations: list[SectionTranslationIn] = Field(min_length=1)


class SectionOut(BaseModel):
    id: int
    survey_id: int
    section_key: str
    display_order: int
    is_active: bool
    translations: list[SectionTranslationOut] = []

    model_config = {"from_attributes": True}


class OptionTranslationIn(TranslationBase):
    text: str = Field(min_length=1, max_length=1024)


class OptionTranslationOut(OptionTranslationIn):
    id: int
    model_config = {"from_attributes": True}


class OptionCreate(BaseModel):
    question_id: int
    option_key: str = Field(min_length=1, max_length=64)
    display_order: int = 0
    translations: list[OptionTranslationIn] = Field(min_length=1)


class OptionOut(BaseModel):
    id: int
    question_id: int
    option_key: str
    display_order: int
    is_active: bool
    translations: list[OptionTranslationOut] = []

    model_config = {"from_attributes": True}


class QuestionTranslationIn(TranslationBase):
    text: str = Field(min_length=1)
    helper_text: str | None = None


class QuestionTranslationOut(QuestionTranslationIn):
    id: int
    model_config = {"from_attributes": True}


class VisibilityRuleOut(BaseModel):
    id: int
    role: RespondentRole
    model_config = {"from_attributes": True}


class QuestionCreate(BaseModel):
    section_id: int
    question_key: str = Field(min_length=1, max_length=64)
    question_type: QuestionType
    display_order: int = 0
    is_required: bool = True
    has_open_text_option: bool = False
    open_text_label_en: str | None = None
    open_text_label_ar: str | None = None
    module: str | None = None
    visible_to_roles: list[RespondentRole] = []
    translations: list[QuestionTranslationIn] = Field(min_length=1)


class QuestionOut(BaseModel):
    id: int
    section_id: int
    question_key: str
    question_type: QuestionType
    display_order: int
    is_required: bool
    is_active: bool
    has_open_text_option: bool
    open_text_label_en: str | None
    open_text_label_ar: str | None
    module: str | None
    translations: list[QuestionTranslationOut] = []
    options: list[OptionOut] = []
    visibility_rules: list[VisibilityRuleOut] = []

    model_config = {"from_attributes": True}


class SurveyWithSectionsOut(SurveyOut):
    sections: list["SectionWithQuestionsOut"] = []


class SectionWithQuestionsOut(SectionOut):
    questions: list[QuestionOut] = []


SurveyWithSectionsOut.model_rebuild()
SectionWithQuestionsOut.model_rebuild()
