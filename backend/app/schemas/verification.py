from pydantic import BaseModel, EmailStr


class VerifyIn(BaseModel):
    email: EmailStr
    language: str = "en"


class VerifyOut(BaseModel):
    session_token: str
    organization_id: int
    organization_name: str
    respondent_role: str
    survey_slug: str
