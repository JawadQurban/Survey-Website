import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from app.core.config import settings
from app.core.logging import configure_logging
from app.core.database import check_db_connection

from app.api.public import verify, surveys, submissions, begin as survey_begin
from app.api.admin import auth, organizations, contacts, surveys as admin_surveys, questions, sections as admin_sections, submissions as admin_submissions, dashboard, cms

configure_logging()
logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version="1.0.0",
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.FRONTEND_URL],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "Accept", "Accept-Language"],
    )

    if settings.is_production:
        app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])

    # Public routes
    public_prefix = "/api/public"
    app.include_router(verify.router, prefix=public_prefix)
    app.include_router(surveys.router, prefix=public_prefix)
    app.include_router(survey_begin.router, prefix=public_prefix)
    app.include_router(submissions.router, prefix=public_prefix)

    # Admin routes
    admin_prefix = "/api/admin"
    app.include_router(auth.router, prefix=admin_prefix)
    app.include_router(organizations.router, prefix=admin_prefix)
    app.include_router(contacts.router, prefix=admin_prefix)
    app.include_router(admin_surveys.router, prefix=admin_prefix)
    app.include_router(questions.router, prefix=admin_prefix)
    app.include_router(admin_sections.router, prefix=admin_prefix)
    app.include_router(admin_submissions.router, prefix=admin_prefix)
    app.include_router(dashboard.router, prefix=admin_prefix)
    app.include_router(cms.router, prefix=admin_prefix)

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
