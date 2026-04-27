import logging
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.admin import AdminUser
from app.repositories.admin_repository import AdminRepository
from app.security.jwt import create_access_token, create_refresh_token, decode_token
from app.security.password import hash_password, verify_password

logger = logging.getLogger(__name__)

GENERIC_AUTH_ERROR = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid credentials",
)


class AuthService:
    def __init__(self, db: Session):
        self.repo = AdminRepository(db)
        self.db = db

    def login(self, email: str, password: str, ip: str | None = None) -> dict:
        user = self.repo.get_by_email(email)
        if not user or not verify_password(password, user.password_hash):
            logger.warning("[Auth] Login failed", extra={"email": email, "ip": ip})
            raise GENERIC_AUTH_ERROR
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")

        access_token = create_access_token(user.id, extra={"role": "admin", "is_superadmin": user.is_superadmin})
        refresh_jwt, jti = create_refresh_token(user.id)

        expires = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        self.repo.save_refresh_token(user.id, jti, expires)
        self.repo.update_last_login(user)
        self.repo.log_action(user.id, "admin_login", ip_address=ip)
        self.db.commit()

        logger.info("[Auth] Admin login successful", extra={"user_id": user.id})
        return {"access_token": access_token, "refresh_token": refresh_jwt}

    def refresh(self, refresh_token: str) -> dict:
        try:
            payload = decode_token(refresh_token)
        except Exception:
            raise GENERIC_AUTH_ERROR

        if payload.get("type") != "refresh":
            raise GENERIC_AUTH_ERROR

        jti = payload.get("jti")
        stored = self.repo.get_refresh_token(jti)
        if not stored or stored.is_revoked:
            # Possible token reuse — revoke all tokens for this user
            user_id = int(payload["sub"])
            self.repo.revoke_all_user_tokens(user_id)
            self.db.commit()
            logger.warning("[Auth] Refresh token reuse detected", extra={"user_id": user_id})
            raise GENERIC_AUTH_ERROR

        user = self.repo.get_by_id(stored.user_id)
        if not user or not user.is_active:
            raise GENERIC_AUTH_ERROR

        self.repo.revoke_refresh_token(stored)

        access_token = create_access_token(user.id, extra={"role": "admin", "is_superadmin": user.is_superadmin})
        new_refresh_jwt, new_jti = create_refresh_token(user.id)
        expires = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        self.repo.save_refresh_token(user.id, new_jti, expires)
        self.db.commit()

        return {"access_token": access_token, "refresh_token": new_refresh_jwt}

    def logout(self, refresh_token: str) -> None:
        try:
            payload = decode_token(refresh_token)
            jti = payload.get("jti")
            stored = self.repo.get_refresh_token(jti)
            if stored:
                self.repo.revoke_refresh_token(stored)
                self.db.commit()
        except Exception:
            pass

    def get_current_user(self, user_id: int) -> AdminUser:
        user = self.repo.get_by_id(user_id)
        if not user or not user.is_active:
            raise GENERIC_AUTH_ERROR
        return user

    def create_admin(self, email: str, password: str, full_name: str, is_superadmin: bool = False) -> AdminUser:
        if self.repo.get_by_email(email):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
        user = self.repo.create(
            email=email,
            password_hash=hash_password(password),
            full_name=full_name,
            is_superadmin=is_superadmin,
        )
        self.db.commit()
        return user
