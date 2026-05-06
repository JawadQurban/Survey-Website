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


def has_permission(user: AdminUser, permission: str) -> bool:
    """Return True if user has the given permission key.

    Superadmins bypass all permission checks for backward compatibility.
    Regular admins need a role that contains the permission key.
    """
    if user.is_superadmin:
        return True
    for user_role in user.user_roles:
        perms = user_role.role.permissions or []
        if permission in perms:
            return True
    return False


def require_permission(permission: str):
    """Dependency factory — gates an endpoint behind a permission key."""
    def _dependency(current_admin: AdminUser = Depends(get_current_admin)) -> AdminUser:
        if not has_permission(current_admin, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission required: {permission}",
            )
        return current_admin
    return _dependency
