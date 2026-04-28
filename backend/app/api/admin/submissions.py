from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.core.database import get_db
from app.models.admin import AdminUser
from app.models.submission import SubmissionStatus
from app.repositories.admin_repository import AdminRepository
from app.repositories.submission_repository import SubmissionRepository
from app.schemas.submission import ReopenRequest, SubmissionOut, SubmissionSummary
from app.services.export_service import ExportService
from app.services.submission_service import SubmissionService

router = APIRouter(prefix="/submissions", tags=["admin-submissions"])


@router.get("", response_model=dict)
def list_submissions(
    org_id: int | None = Query(None),
    survey_id: int | None = Query(None),
    role: str | None = Query(None),
    status_filter: SubmissionStatus | None = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_admin),
):
    repo = SubmissionRepository(db)
    submissions, total = repo.list_with_filters(
        org_id=org_id, survey_id=survey_id, role=role, status=status_filter, skip=skip, limit=limit
    )
    items = [
        {
            "id": s.id,
            "organization_id": s.organization_id,
            "organization_name": s.organization.name_en if s.organization else "",
            "survey_id": s.survey_id,
            "respondent_role": s.respondent_role,
            "respondent_email": s.respondent_email,
            "status": str(s.status),
            "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None,
            "created_at": s.created_at.isoformat(),
        }
        for s in submissions
    ]
    return {"total": total, "items": items}


@router.get("/{submission_id}", response_model=SubmissionOut)
def get_submission(
    submission_id: int,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_admin),
):
    submission = SubmissionRepository(db).get_by_id(submission_id)
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    return submission


@router.post("/{submission_id}/reopen", response_model=SubmissionOut)
def reopen_submission(
    submission_id: int,
    body: ReopenRequest,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
):
    svc = SubmissionService(db)
    submission = svc.reopen(submission_id, current_admin.email, body.reason)
    AdminRepository(db).log_action(
        current_admin.id, "submission_reopened", "submission", str(submission_id), detail=body.reason
    )
    return submission


@router.get("/export/csv")
def export_csv(
    survey_id: int | None = Query(None),
    org_id: int | None = Query(None),
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_admin),
):
    data = ExportService(db).export_csv(survey_id=survey_id, org_id=org_id)
    return Response(
        content=data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=submissions.csv"},
    )


@router.get("/export/xlsx")
def export_xlsx(
    survey_id: int | None = Query(None),
    org_id: int | None = Query(None),
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_admin),
):
    data = ExportService(db).export_xlsx(survey_id=survey_id, org_id=org_id)
    return Response(
        content=data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=submissions.xlsx"},
    )
