from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.group_registration_repository import GroupRegistrationRepository
from app.schemas.group_registration import GroupRegistrationCreate, GroupRegistrationOut

router = APIRouter(prefix="/group-registration", tags=["public-group-registration"])


@router.get("/catalog")
def get_catalog(db: Session = Depends(get_db)):
    """Return the full course catalog as a nested dict for the frontend dropdowns."""
    return GroupRegistrationRepository(db).build_catalog()


@router.post("/submit", response_model=dict, status_code=status.HTTP_201_CREATED)
def submit_registration(
    body: GroupRegistrationCreate,
    db:   Session = Depends(get_db),
):
    repo = GroupRegistrationRepository(db)
    data = body.model_dump()
    # Serialize nominations to plain dicts (Pydantic models → dicts)
    data["nominations"] = [n.model_dump() for n in body.nominations]
    reg = repo.create(data)
    db.commit()
    db.refresh(reg)
    return {
        "reference_number": reg.reference_number,
        "message": "Your training registration has been submitted successfully.",
        "message_ar": "تم تقديم طلب التدريب بنجاح.",
    }


@router.get("/submission/{reference_number}", response_model=GroupRegistrationOut)
def get_submission_by_reference(
    reference_number: str,
    db: Session = Depends(get_db),
):
    """Allow the submitter to retrieve their own submission using the reference number."""
    reg = GroupRegistrationRepository(db).get_by_reference(reference_number)
    if not reg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Registration not found")
    return reg
