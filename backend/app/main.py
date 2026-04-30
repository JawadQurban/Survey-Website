import logging
from urllib.parse import urlparse

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings
from app.core.limiter import limiter
from app.core.logging import configure_logging
from app.core.database import check_db_connection

from app.api.public import verify, surveys, submissions, begin as survey_begin
from app.api.admin import (
    auth, organizations, contacts,
    surveys as admin_surveys, questions, sections as admin_sections,
    submissions as admin_submissions, dashboard, cms, options as admin_options,
)

configure_logging()
logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Adds standard security headers to every response.
    None of these break survey functionality — they only tighten browser behaviour."""
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"]        = "DENY"
        response.headers["X-XSS-Protection"]       = "1; mode=block"
        response.headers["Referrer-Policy"]         = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"]      = "geolocation=(), microphone=(), camera=()"
        if settings.is_production:
            # Tell browsers to always use HTTPS for this domain for 2 years
            response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
        return response


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version="1.0.0",
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
    )

    # Wire up rate limiter
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # Security response headers (survey & admin alike — only adds headers, never blocks)
    app.add_middleware(SecurityHeadersMiddleware)

    # CORS — single explicit origin, unchanged from before
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.FRONTEND_URL],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "Accept", "Accept-Language"],
    )

    # TrustedHost — restrict to actual frontend/backend domains (not wildcard)
    if settings.is_production:
        frontend_host = urlparse(settings.FRONTEND_URL).netloc or settings.FRONTEND_URL
        backend_host  = urlparse(settings.BACKEND_URL).netloc  or settings.BACKEND_URL
        allowed = list({frontend_host, backend_host, "localhost", "127.0.0.1"})
        app.add_middleware(TrustedHostMiddleware, allowed_hosts=allowed)

    # Public routes — survey experience, completely unchanged
    public_prefix = "/api/public"
    app.include_router(verify.router,          prefix=public_prefix)
    app.include_router(surveys.router,          prefix=public_prefix)
    app.include_router(survey_begin.router,     prefix=public_prefix)
    app.include_router(submissions.router,      prefix=public_prefix)

    # Admin routes
    admin_prefix = "/api/admin"
    app.include_router(auth.router,              prefix=admin_prefix)
    app.include_router(organizations.router,     prefix=admin_prefix)
    app.include_router(contacts.router,          prefix=admin_prefix)
    app.include_router(admin_surveys.router,     prefix=admin_prefix)
    app.include_router(questions.router,         prefix=admin_prefix)
    app.include_router(admin_sections.router,    prefix=admin_prefix)
    app.include_router(admin_submissions.router, prefix=admin_prefix)
    app.include_router(dashboard.router,         prefix=admin_prefix)
    app.include_router(cms.router,               prefix=admin_prefix)
    app.include_router(admin_options.router,     prefix=admin_prefix)

    @app.get("/health")
    def health():
        db_ok = check_db_connection()
        return {"status": "ok" if db_ok else "degraded", "db": db_ok}

    @app.on_event("startup")
    async def startup():
        logger.info("[App] Starting up", extra={"env": settings.APP_ENV})
        _seed_first_admin()

    return app


def _seed_first_admin() -> None:
    if not settings.FIRST_ADMIN_PASSWORD:
        return
    from app.core.database import SessionLocal
    from app.repositories.admin_repository import AdminRepository
    from app.security.password import hash_password

    db = SessionLocal()
    try:
        repo = AdminRepository(db)
        if not repo.get_by_email(settings.FIRST_ADMIN_EMAIL):
            repo.create(
                email=settings.FIRST_ADMIN_EMAIL,
                password_hash=hash_password(settings.FIRST_ADMIN_PASSWORD),
                full_name="Platform Administrator",
                is_superadmin=True,
            )
            db.commit()
            logger.info("[App] First admin created", extra={"email": settings.FIRST_ADMIN_EMAIL})
    except Exception as exc:
        logger.error("[App] Admin seed failed", extra={"error": str(exc)})
        db.rollback()
    finally:
        db.close()


app = create_app()
