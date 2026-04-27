from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.core.database import get_db
from app.models.admin import AdminUser
from app.repositories.admin_repository import AdminRepository
from app.repositories.organization_repository import OrganizationRepository
from app.schemas.organization import OrganizationCreate, OrganizationOut, OrganizationUpdate
from app.utils.helpers import slugify

router = APIRouter(prefix="/organizations", tags=["admin-organizations"])


@router.get("", response_model=list[OrganizationOut])
def list_organizations(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_admin),
):
    return OrganizationRepository(db).list_all(skip=skip, limit=limit)


@router.post("", response_model=OrganizationOut, status_code=status.HTTP_201_CREATED)
def create_organization(
    body: OrganizationCreate,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
):
    repo = OrganizationRepository(db)
    slug = body.slug or slugify(body.name_en)
    if repo.get_by_slug(slug):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Organization with this slug already exists")
    org = repo.create(
        name_en=body.name_en,
        name_ar=body.name_ar,
        slug=slug,
        sector=body.sector,
        notes=body.notes,
    )
    AdminRepository(db).log_action(current_admin.id, "org_created", "organization", str(org.id))
    db.commit()
    return org


@router.get("/{org_id}", response_model=OrganizationOut)
def get_organization(
    org_id: int,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_admin),
):
    org = OrganizationRepository(db).get_by_id(org_id)
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    return org


@router.put("/{org_id}", response_model=OrganizationOut)
def update_organization(
    org_id: int,
    body: OrganizationUpdate,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
):
    repo = OrganizationRepository(db)
    org = repo.get_by_id(org_id)
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    updates = body.model_dump(exclude_none=True)
    updated = repo.update(org, **updates)
    AdminRepository(db).log_action(current_admin.id, "org_updated", "organization", str(org_id))
    db.commit()
    return updated


@router.delete("/{org_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_organization(
    org_id: int,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
):
    repo = OrganizationRepository(db)
    org = repo.get_by_id(org_id)
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    repo.delete(org)
    AdminRepository(db).log_action(current_admin.id, "org_deleted", "organization", str(org_id))
    db.commit()
