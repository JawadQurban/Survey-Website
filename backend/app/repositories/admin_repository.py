from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.admin import AdminUser, AdminAuditLog, RefreshToken


class AdminRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_email(self, email: str) -> AdminUser | None:
        return self.db.execute(
            select(AdminUser).where(AdminUser.email == email.lower().strip())
        ).scalar_one_or_none()

    def get_by_id(self, user_id: int) -> AdminUser | None:
        return self.db.get(AdminUser, user_id)

    def create(self, email: str, password_hash: str, full_name: str, is_superadmin: bool = False) -> AdminUser:
        user = AdminUser(
            email=email.lower().strip(),
            password_hash=password_hash,
            full_name=full_name,
            is_superadmin=is_superadmin,
        )
        self.db.add(user)
        self.db.flush()
        return user

    def update_last_login(self, user: AdminUser) -> None:
        user.last_login_at = datetime.now(timezone.utc)
        self.db.flush()

    def save_refresh_token(self, user_id: int, jti: str, expires_at: datetime) -> RefreshToken:
        token = RefreshToken(user_id=user_id, jti=jti, expires_at=expires_at)
        self.db.add(token)
        self.db.flush()
        return token

    def get_refresh_token(self, jti: str) -> RefreshToken | None:
        return self.db.execute(
            select(RefreshToken).where(RefreshToken.jti == jti)
        ).scalar_one_or_none()

    def revoke_refresh_token(self, token: RefreshToken) -> None:
        token.is_revoked = True
        token.revoked_at = datetime.now(timezone.utc)
        self.db.flush()

    def revoke_all_user_tokens(self, user_id: int) -> None:
        tokens = self.db.execute(
            select(RefreshToken).where(
                RefreshToken.user_id == user_id,
                RefreshToken.is_revoked == False,  # noqa: E712
            )
        ).scalars().all()
        now = datetime.now(timezone.utc)
        for t in tokens:
            t.is_revoked = True
            t.revoked_at = now
        self.db.flush()

    def log_action(
        self,
        user_id: int | None,
        action: str,
        resource_type: str | None = None,
        resource_id: str | None = None,
        detail: str | None = None,
        ip_address: str | None = None,
    ) -> None:
        log = AdminAuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            detail=detail,
            ip_address=ip_address,
        )
        self.db.add(log)
        self.db.flush()
