from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.api.deps import require_superadmin
from app.core.database import get_db
from app.models.admin import AdminUser, AdminRole, AdminUserRole
from app.repositories.admin_repository import AdminRepository
from app.security.password import hash_password

router = APIRouter(prefix="/users", tags=["admin-users"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email:        EmailStr
    full_name:    str = Field(min_length=1, max_length=255)
    password:     str = Field(min_length=8, max_length=128)
    is_superadmin: bool = False

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UserUpdate(BaseModel):
    full_name:    str | None = Field(None, min_length=1, max_length=255)
    is_active:    bool | None = None
    is_superadmin: bool | None = None


class PasswordReset(BaseModel):
    new_password: str = Field(min_length=8, max_length=128)


def _user_out(user: AdminUser) -> dict:
    return {
        "id":            user.id,
        "email":         user.email,
        "full_name":     user.full_name,
        "is_active":     user.is_active,
        "is_superadmin": user.is_superadmin,
        "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
        "created_at":    user.created_at.isoformat(),
        "roles": [
            {
                "id":          ur.role.id,
                "name":        ur.role.name,
                "description": ur.role.description,
                "permissions": ur.role.permissions or [],
            }
            for ur in user.user_roles
        ],
    }


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("")
def list_users(
    db:    Session  = Depends(get_db),
    admin: AdminUser = Depends(require_superadmin),
):
    users = list(db.scalars(select(AdminUser).order_by(AdminUser.created_at)))
    return [_user_out(u) for u in users]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_user(
    body:  UserCreate,
    db:    Session  = Depends(get_db),
    admin: AdminUser = Depends(require_superadmin),
):
    repo = AdminRepository(db)
    if repo.get_by_email(body.email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    user = repo.create(
        email=body.email,
        password_hash=hash_password(body.password),
        full_name=body.full_name,
        is_superadmin=body.is_superadmin,
    )
    repo.log_action(admin.id, "user_created", "admin_user", str(user.id))
    db.commit()
    db.refresh(user)
    return _user_out(user)


@router.put("/{user_id}")
def update_user(
    user_id: int,
    body:    UserUpdate,
    db:      Session  = Depends(get_db),
    admin:   AdminUser = Depends(require_superadmin),
):
    repo = AdminRepository(db)
    user = repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user_id == admin.id and body.is_active is False:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot deactivate your own account")
    if user_id == admin.id and body.is_superadmin is False:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot remove your own superadmin status")

    if body.full_name is not None:
        user.full_name = body.full_name
    if body.is_active is not None:
        user.is_active = body.is_active
        if not body.is_active:
            repo.revoke_all_user_tokens(user_id)
    if body.is_superadmin is not None:
        user.is_superadmin = body.is_superadmin

    repo.log_action(admin.id, "user_updated", "admin_user", str(user_id))
    db.commit()
    db.refresh(user)
    return _user_out(user)


@router.post("/{user_id}/reset-password", status_code=status.HTTP_200_OK)
def reset_password(
    user_id: int,
    body:    PasswordReset,
    db:      Session  = Depends(get_db),
    admin:   AdminUser = Depends(require_superadmin),
):
    repo = AdminRepository(db)
    user = repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.password_hash = hash_password(body.new_password)
    repo.revoke_all_user_tokens(user_id)
    repo.log_action(admin.id, "password_reset", "admin_user", str(user_id))
    db.commit()
    return {"message": "Password updated and all sessions revoked"}


# ── Role assignment ───────────────────────────────────────────────────────────

@router.get("/roles")
def list_roles(
    db:    Session  = Depends(get_db),
    _:     AdminUser = Depends(require_superadmin),
):
    roles = list(db.scalars(select(AdminRole).order_by(AdminRole.name)))
    return [
        {
            "id":          r.id,
            "name":        r.name,
            "description": r.description,
            "permissions": r.permissions or [],
        }
        for r in roles
    ]


@router.post("/{user_id}/roles/{role_id}", status_code=status.HTTP_201_CREATED)
def assign_role(
    user_id: int,
    role_id: int,
    db:      Session  = Depends(get_db),
    admin:   AdminUser = Depends(require_superadmin),
):
    user = AdminRepository(db).get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    role = db.get(AdminRole, role_id)
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")

    already = db.scalar(
        select(AdminUserRole).where(
            AdminUserRole.user_id == user_id,
            AdminUserRole.role_id == role_id,
        )
    )
    if already:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Role already assigned")

    db.add(AdminUserRole(user_id=user_id, role_id=role_id))
    AdminRepository(db).log_action(admin.id, "role_assigned", "admin_user", str(user_id), detail=role.name)
    db.commit()
    db.refresh(user)
    return _user_out(user)


@router.delete("/{user_id}/roles/{role_id}", status_code=status.HTTP_200_OK)
def remove_role(
    user_id: int,
    role_id: int,
    db:      Session  = Depends(get_db),
    admin:   AdminUser = Depends(require_superadmin),
):
    assignment = db.scalar(
        select(AdminUserRole).where(
            AdminUserRole.user_id == user_id,
            AdminUserRole.role_id == role_id,
        )
    )
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not assigned to this user")
    db.delete(assignment)
    role = db.get(AdminRole, role_id)
    AdminRepository(db).log_action(admin.id, "role_removed", "admin_user", str(user_id), detail=role.name if role else str(role_id))
    db.commit()
    user = AdminRepository(db).get_by_id(user_id)
    return _user_out(user)
