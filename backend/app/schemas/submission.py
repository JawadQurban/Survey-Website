from datetime import datetime
from pydantic import BaseModel, Field
from app.models.submission import SubmissionStatus


class AnswerIn(BaseModel):
    question_id: int
    selected_option_keys: list[str] | None = None
    open_text_value: str | None = Field(None, max_length=5000)
    numeric_value: float | None = None


class AnswerOut(BaseModel):
    id: int
    question_id: int
    selected_option_keys: list[str] | None
    open_text_value: str | None
    numeric_value: float | None
    updated_at: datetime

    model_config = {"from_attributes": True}


class DraftSaveRequest(BaseModel):
    survey_slug: str
    language: str = Field("en", min_length=2, max_length=8)
    answers: list[AnswerIn]


class SubmitRequest(BaseModel):
    survey_slug: str
    language: str = Field("en", min_length=2, max_length=8)
    answers: list[AnswerIn]


class SubmissionOut(BaseModel):
    id: int
    organization_id: int | None
    survey_id: int
    respondent_role: str
    respondent_email: str
    language_used: str
    status: SubmissionStatus
    submitted_at: datetime | None
    created_at: datetime
    updated_at: datetime
    # Anonymous metadata
    org_name_input: str | None = None
    sector: str | None = None
    regulator: str | None = None
    org_size: str | None = None
    respondent_name: str | None = None
    answers: list[AnswerOut] = []

    model_config = {"from_attributes": True}


class SubmissionSummary(BaseModel):
    id: int
    organization_id: int | None
    organization_name: str
    survey_id: int
    respondent_role: str
    respondent_email: str
    sector: str | None = None
    org_size: str | None = None
    status: SubmissionStatus
    submitted_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ReopenRequest(BaseModel):
    reason: str | None = Field(None, max_length=500)
