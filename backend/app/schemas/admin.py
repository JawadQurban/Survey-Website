from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, field_validator


class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class AdminLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AdminUserOut(BaseModel):
    id: int
    email: str
    full_name: str
    is_active: bool
    is_superadmin: bool
    last_login_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class AdminUserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=255)
    is_superadmin: bool = False

    @field_validator("password")
    @classmethod
    def password_complexity(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class AdminUserUpdate(BaseModel):
    full_name: str | None = Field(None, min_length=1, max_length=255)
    is_active: bool | None = None


class AuditLogOut(BaseModel):
    id: int
    user_id: int | None
    action: str
    resource_type: str | None
    resource_id: str | None
    detail: str | None
    ip_address: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
