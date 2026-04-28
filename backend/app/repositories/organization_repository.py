from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import select, func
from app.models.organization import Organization, OrganizationContact


class OrganizationRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, org_id: int) -> Organization | None:
        return self.db.get(Organization, org_id)

    def get_by_slug(self, slug: str) -> Organization | None:
        return self.db.execute(
            select(Organization).where(Organization.slug == slug)
        ).scalar_one_or_none()

    def list_all(self, skip: int = 0, limit: int = 100) -> list[Organization]:
        return list(
            self.db.execute(
                select(Organization).offset(skip).limit(limit).order_by(Organization.name_en)
            ).scalars().all()
        )

    def count(self) -> int:
        return self.db.execute(select(func.count()).select_from(Organization)).scalar_one()

    def create(self, **kwargs) -> Organization:
        org = Organization(**kwargs)
        self.db.add(org)
        self.db.flush()
        return org

    def update(self, org: Organization, **kwargs) -> Organization:
        for k, v in kwargs.items():
            setattr(org, k, v)
        self.db.flush()
        return org

    def delete(self, org: Organization) -> None:
        self.db.delete(org)
        self.db.flush()


class ContactRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, contact_id: int) -> OrganizationContact | None:
        return self.db.get(OrganizationContact, contact_id)

    def get_by_email(self, email: str) -> OrganizationContact | None:
        return self.db.execute(
            select(OrganizationContact)
            .where(
                OrganizationContact.email == email.lower().strip(),
                OrganizationContact.is_active == True,  # noqa: E712
            )
            .options(
                joinedload(OrganizationContact.organization),
                selectinload(OrganizationContact.survey),
            )
        ).scalar_one_or_none()

    def get_by_org(self, org_id: int) -> list[OrganizationContact]:
        return list(
            self.db.execute(
                select(OrganizationContact)
                .where(OrganizationContact.organization_id == org_id)
                .order_by(OrganizationContact.role)
            ).scalars().all()
        )

    def count_total(self) -> int:
        return self.db.execute(
            select(func.count()).select_from(OrganizationContact)
        ).scalar_one()

    def create(self, **kwargs) -> OrganizationContact:
        if "email" in kwargs:
            kwargs["email"] = kwargs["email"].lower().strip()
        contact = OrganizationContact(**kwargs)
        self.db.add(contact)
        self.db.flush()
        return contact

    def update(self, contact: OrganizationContact, **kwargs) -> OrganizationContact:
        for k, v in kwargs.items():
            setattr(contact, k, v)
        self.db.flush()
        return contact

    def delete(self, contact: OrganizationContact) -> None:
        self.db.delete(contact)
        self.db.flush()
