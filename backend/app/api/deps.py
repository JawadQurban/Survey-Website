from fastapi import Cookie, Depends, HTTPException, status
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.admin import AdminUser
from app.repositories.admin_repository import AdminRepository
from app.security.jwt import decode_token


def get_current_admin(
    access_token: str | None = Cookie(None, alias="admin_access_token"),
    db: Session = Depends(get_db),
) -> AdminUser:
    if not access_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = decode_token(access_token)
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalid or expired")

    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")

    user_id = int(payload["sub"])
    user = AdminRepository(db).get_by_id(user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def require_superadmin(current_admin: AdminUser = Depends(get_current_admin)) -> AdminUser:
    if not current_admin.is_superadmin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Superadmin access required")
    return current_admin


def get_survey_session(
    survey_token: str | None = Cookie(None, alias="survey_session_token"),
    db: Session = Depends(get_db),
) -> dict:
    if not survey_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Survey session required")
    try:
        payload = decode_token(survey_token)
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session invalid or expired")
    if payload.get("type") != "survey_session":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session type")
    return payload
