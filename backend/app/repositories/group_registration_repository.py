from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import select, func
import random
import string

from app.models.group_registration import GroupRegistration, TrainingCourse


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _generate_reference() -> str:
    year = datetime.now().year
    suffix = "".join(random.choices(string.digits, k=6))
    return f"GR-{year}-{suffix}"


class GroupRegistrationRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    # ── Submissions ───────────────────────────────────────────────────────────

    def create(self, data: dict) -> GroupRegistration:
        ref = _generate_reference()
        # Ensure uniqueness
        while self._db.scalar(select(GroupRegistration).where(GroupRegistration.reference_number == ref)):
            ref = _generate_reference()

        reg = GroupRegistration(
            reference_number=ref,
            submitted_at=_utcnow(),
            **data,
        )
        self._db.add(reg)
        return reg

    def get_by_id(self, reg_id: int) -> GroupRegistration | None:
        return self._db.get(GroupRegistration, reg_id)

    def get_by_reference(self, reference_number: str) -> GroupRegistration | None:
        return self._db.scalar(
            select(GroupRegistration).where(GroupRegistration.reference_number == reference_number)
        )

    def list_all(
        self,
        skip: int = 0,
        limit: int = 50,
        status: str | None = None,
        organization_name: str | None = None,
    ) -> tuple[list[GroupRegistration], int]:
        q = select(GroupRegistration)
        if status:
            q = q.where(GroupRegistration.status == status)
        if organization_name:
            q = q.where(GroupRegistration.organization_name.ilike(f"%{organization_name}%"))
        total = self._db.scalar(select(func.count()).select_from(q.subquery()))
        items = list(self._db.scalars(q.order_by(GroupRegistration.created_at.desc()).offset(skip).limit(limit)))
        return items, total or 0

    # ── Course catalog ────────────────────────────────────────────────────────

    def list_courses(self, active_only: bool = True) -> list[TrainingCourse]:
        q = select(TrainingCourse)
        if active_only:
            q = q.where(TrainingCourse.is_active == True)  # noqa: E712
        return list(self._db.scalars(q.order_by(TrainingCourse.sector, TrainingCourse.functional_area, TrainingCourse.course_code)))

    def get_course(self, course_id: int) -> TrainingCourse | None:
        return self._db.get(TrainingCourse, course_id)

    def get_course_by_code(self, code: str) -> TrainingCourse | None:
        return self._db.scalar(select(TrainingCourse).where(TrainingCourse.course_code == code))

    def create_course(self, data: dict) -> TrainingCourse:
        course = TrainingCourse(**data)
        self._db.add(course)
        return course

    def update_course(self, course: TrainingCourse, data: dict) -> TrainingCourse:
        for k, v in data.items():
            setattr(course, k, v)
        return course

    def build_catalog(self) -> dict:
        """Return nested catalog: {sector: {functional_area: [course, ...]}}"""
        courses = self.list_courses(active_only=True)
        catalog: dict = {}
        for c in courses:
            sector_map = catalog.setdefault(c.sector, {})
            area_list  = sector_map.setdefault(c.functional_area, [])
            area_list.append({
                "code":          c.course_code,
                "title":         c.course_title,
                "duration_days": c.duration_days,
                "capacity":      c.capacity,
            })
        return catalog
