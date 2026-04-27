import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt

from app.core.config import settings

ALGORITHM = "HS256"
TOKEN_TYPE_ACCESS = "access"
TOKEN_TYPE_REFRESH = "refresh"


def create_access_token(subject: str | int, extra: dict[str, Any] | None = None) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload: dict[str, Any] = {
        "sub": str(subject),
        "exp": expire,
        "type": TOKEN_TYPE_ACCESS,
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(subject: str | int) -> tuple[str, str]:
    """Returns (encoded_jwt, raw_jti) where jti is stored server-side for reuse detection."""
    jti = secrets.token_urlsafe(32)
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": str(subject),
        "exp": expire,
        "type": TOKEN_TYPE_REFRESH,
        "jti": jti,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM), jti


def decode_token(token: str) -> dict[str, Any]:
    """Raises JWTError on invalid/expired tokens — callers must catch it."""
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])


def generate_magic_token() -> str:
    return secrets.token_urlsafe(48)
