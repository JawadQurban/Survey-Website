from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.core.database import get_db
from app.models.admin import AdminUser
from app.repositories.organization_repository import OrganizationRepository, ContactRepository
from app.repositories.submission_repository import SubmissionRepository
from app.repositories.survey_repository import SurveyRepository

router = APIRouter(prefix="/dashboard", tags=["admin-dashboard"])


@router.get("")
def get_dashboard(
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_admin),
):
    org_count = OrganizationRepository(db).count()
    contact_count = ContactRepository(db).count_total()
    status_counts = SubmissionRepository(db).count_by_status()
    completed_by_org = SubmissionRepository(db).count_completed_by_org()
    active_surveys = len(SurveyRepository(db).list_active())

    submitted = status_counts.get("submitted", 0)
    draft = status_counts.get("draft", 0)
    total_submissions = submitted + draft + status_counts.get("reopened", 0)

    completion_rate = round((submitted / total_submissions * 100), 1) if total_submissions else 0.0

    # Per-role completion across all orgs
    roles = ["ceo", "chro", "ld"]
    role_completion: dict[str, dict[str, int]] = {}
    for role in roles:
        completed_count = sum(1 for org_roles in completed_by_org.values() if org_roles.get(role))
        role_completion[role] = {
            "completed": completed_count,
            "total": org_count,
        }

    return {
        "total_organizations": org_count,
        "total_contacts": contact_count,
        "active_surveys": active_surveys,
        "submissions": {
            "submitted": submitted,
            "draft": draft,
            "total": total_submissions,
            "completion_rate_pct": completion_rate,
        },
        "role_completion": role_completion,
    }
