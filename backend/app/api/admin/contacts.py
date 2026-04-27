from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.core.database import get_db
from app.models.admin import AdminUser
from app.repositories.admin_repository import AdminRepository
from app.repositories.organization_repository import ContactRepository, OrganizationRepository
from app.schemas.organization import ContactCreate, ContactOut, ContactUpdate

router = APIRouter(prefix="/contacts", tags=["admin-contacts"])


@router.get("", response_model=list[ContactOut])
def list_contacts(
    org_id: int | None = Query(None),
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_admin),
):
    repo = ContactRepository(db)
    if org_id:
        return repo.get_by_org(org_id)
    from sqlalchemy import select
    from app.models.organization import OrganizationContact
    return list(db.execute(select(OrganizationContact).order_by(OrganizationContact.id)).scalars().all())


@router.post("", response_model=ContactOut, status_code=status.HTTP_201_CREATED)
def create_contact(
    body: ContactCreate,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
):
    org = OrganizationRepository(db).get_by_id(body.organization_id)
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    repo = ContactRepository(db)
    if repo.get_by_email(body.email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    contact = repo.create(
        organization_id=body.organization_id,
        email=body.email,
        full_name=body.full_name,
        role=body.role,
        notes=body.notes,
    )
    AdminRepository(db).log_action(current_admin.id, "contact_created", "contact", str(contact.id))
    db.commit()
    return contact


@router.get("/{contact_id}", response_model=ContactOut)
def get_contact(
    contact_id: int,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_admin),
):
    contact = ContactRepository(db).get_by_id(contact_id)
    if not contact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")
    return contact


@router.put("/{contact_id}", response_model=ContactOut)
def update_contact(
    contact_id: int,
    body: ContactUpdate,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
):
    repo = ContactRepository(db)
    contact = repo.get_by_id(contact_id)
    if not contact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")
    updated = repo.update(contact, **body.model_dump(exclude_none=True))
    AdminRepository(db).log_action(current_admin.id, "contact_updated", "contact", str(contact_id))
    db.commit()
    return updated


@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contact(
    contact_id: int,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
):
    repo = ContactRepository(db)
    contact = repo.get_by_id(contact_id)
    if not contact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")
    repo.delete(contact)
    AdminRepository(db).log_action(current_admin.id, "contact_deleted", "contact", str(contact_id))
    db.commit()
