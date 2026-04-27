from datetime import timedelta

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.schemas.verification import VerifyIn, VerifyOut
from app.services.verification_service import VerificationService

router = APIRouter(prefix="/verify", tags=["public-verify"])


@router.post("", response_model=VerifyOut)
def verify_email(body: VerifyIn, request: Request, response: Response, db: Session = Depends(get_db)):
    svc = VerificationService(db)
    result = svc.verify_email(body.email, request)

    response.set_cookie(
        key="survey_session_token",
        value=result["session_token"],
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        max_age=int(timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES).total_seconds()),
        path="/",
    )
    return result
