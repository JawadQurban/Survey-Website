from datetime import timedelta

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.core.config import settings
from app.core.database import get_db
from app.core.limiter import limiter
from app.models.admin import AdminUser
from app.schemas.admin import AdminLoginRequest, AdminLoginResponse, AdminUserOut
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["admin-auth"])


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    max_age_access  = int(timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES).total_seconds())
    max_age_refresh = int(timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS).total_seconds())

    response.set_cookie(
        key="admin_access_token",
        value=access_token,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        max_age=max_age_access,
        path="/",
    )
    response.set_cookie(
        key="admin_refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        max_age=max_age_refresh,
        path="/",  # Fixed from "/api/admin/auth/refresh" — cookie must reach all admin endpoints
    )


@router.post("/login")
@limiter.limit("10/minute")   # max 10 login attempts per IP per minute — admin only
def login(
    request: Request,
    response: Response,
    body: AdminLoginRequest,
    db: Session = Depends(get_db),
):
    ip = request.client.host if request.client else None
    svc = AuthService(db)
    tokens = svc.login(body.email, body.password, ip)
    _set_auth_cookies(response, tokens["access_token"], tokens["refresh_token"])
    return {"message": "Logged in successfully"}


@router.post("/refresh")
@limiter.limit("30/minute")
def refresh_token(
    request: Request,
    response: Response,
    admin_refresh_token: str | None = Cookie(None),
    db: Session = Depends(get_db),
):
    if not admin_refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token")
    svc = AuthService(db)
    tokens = svc.refresh(admin_refresh_token)
    _set_auth_cookies(response, tokens["access_token"], tokens["refresh_token"])
    return {"message": "Token refreshed"}


@router.post("/logout")
def logout(
    response: Response,
    admin_refresh_token: str | None = Cookie(None),
    db: Session = Depends(get_db),
):
    if admin_refresh_token:
        AuthService(db).logout(admin_refresh_token)
    # Delete with both paths — covers cookies set before and after the path fix
    response.delete_cookie("admin_access_token",  path="/")
    response.delete_cookie("admin_refresh_token", path="/")
    response.delete_cookie("admin_refresh_token", path="/api/admin/auth/refresh")
    return {"message": "Logged out"}


@router.get("/me", response_model=AdminUserOut)
def get_me(current_admin: AdminUser = Depends(get_current_admin)):
    return current_admin
