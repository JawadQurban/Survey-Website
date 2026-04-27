import io
import csv
from datetime import datetime
from sqlalchemy.orm import Session

from app.repositories.submission_repository import SubmissionRepository
from app.models.submission import SubmissionStatus


class ExportService:
    def __init__(self, db: Session):
        self.submission_repo = SubmissionRepository(db)

    def export_csv(
        self,
        survey_id: int | None = None,
        org_id: int | None = None,
    ) -> bytes:
        submissions, _ = self.submission_repo.list_with_filters(
            org_id=org_id, survey_id=survey_id, limit=10000
        )

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "submission_id", "organization", "role", "email",
            "status", "language", "submitted_at", "created_at",
        ])
        for s in submissions:
            writer.writerow([
                s.id,
                s.organization.name_en if s.organization else "",
                s.respondent_role,
                s.respondent_email,
                s.status.value,
                s.language_used,
                s.submitted_at.isoformat() if s.submitted_at else "",
                s.created_at.isoformat(),
            ])

        return output.getvalue().encode("utf-8-sig")

    def export_xlsx(
        self,
        survey_id: int | None = None,
        org_id: int | None = None,
    ) -> bytes:
        import xlsxwriter

        submissions, _ = self.submission_repo.list_with_filters(
            org_id=org_id, survey_id=survey_id, limit=10000
        )

        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output, {"in_memory": True})
        ws = workbook.add_worksheet("Submissions")

        header_fmt = workbook.add_format({"bold": True, "bg_color": "#1B3A6B", "font_color": "#FFFFFF"})
        headers = [
            "ID", "Organization", "Role", "Email",
            "Status", "Language", "Submitted At", "Created At",
        ]
        for col, h in enumerate(headers):
            ws.write(0, col, h, header_fmt)

        for row_idx, s in enumerate(submissions, start=1):
            ws.write(row_idx, 0, s.id)
            ws.write(row_idx, 1, s.organization.name_en if s.organization else "")
            ws.write(row_idx, 2, s.respondent_role)
            ws.write(row_idx, 3, s.respondent_email)
            ws.write(row_idx, 4, s.status.value)
            ws.write(row_idx, 5, s.language_used)
            ws.write(row_idx, 6, s.submitted_at.isoformat() if s.submitted_at else "")
            ws.write(row_idx, 7, s.created_at.isoformat())

        workbook.close()
        return output.getvalue()
