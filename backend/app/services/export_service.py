import io
import csv
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.submission import Submission, Answer
from app.models.survey import Question, QuestionOption
from app.repositories.submission_repository import SubmissionRepository


# ── Helpers ───────────────────────────────────────────────────────────────────

def _t(translations, lang: str) -> str:
    """Return translation text for lang, fallback to 'en', then first available."""
    for t in translations:
        if t.language_code == lang:
            return t.text or ""
    for t in translations:
        if t.language_code == "en":
            return t.text or ""
    return translations[0].text if translations else ""


def _answer_text(answer: Answer, lang: str) -> str:
    """Resolve an Answer to human-readable text in the given language."""
    q = answer.question
    if not q:
        return ""

    parts: list[str] = []

    if answer.selected_option_keys:
        opt_map = {o.option_key: o for o in q.options}
        for key in answer.selected_option_keys:
            opt = opt_map.get(key)
            if opt:
                parts.append(_t(opt.translations, lang))
            else:
                parts.append(key)

    if answer.open_text_value:
        parts.append(answer.open_text_value)

    if answer.numeric_value is not None and not parts:
        parts.append(str(answer.numeric_value))

    return " | ".join(parts)


def _load_submissions(
    db: Session,
    survey_id: int | None,
    org_id: int | None,
) -> list[Submission]:
    """Load submissions with full answer → question → translations eager-loaded."""
    from sqlalchemy import select

    q = (
        select(Submission)
        .options(
            joinedload(Submission.organization),
            selectinload(Submission.answers)
            .selectinload(Answer.question)
            .selectinload(Question.translations),
            selectinload(Submission.answers)
            .selectinload(Answer.question)
            .selectinload(Question.options)
            .selectinload(QuestionOption.translations),
        )
        .order_by(Submission.created_at.desc())
    )
    if survey_id:
        q = q.where(Submission.survey_id == survey_id)
    if org_id:
        q = q.where(Submission.organization_id == org_id)

    return list(db.execute(q.limit(10_000)).scalars().unique().all())


def _org_name(s: Submission) -> str:
    if s.organization:
        return s.organization.name_en or ""
    return s.org_name_input or ""


def _meta(s: Submission) -> list:
    return [
        s.id,
        _org_name(s),
        s.respondent_name or "",
        s.respondent_role,
        s.respondent_email,
        s.sector or "",
        s.org_size or "",
        s.language_used,
        str(s.status),
        s.submitted_at.isoformat() if s.submitted_at else "",
    ]


META_HEADERS = [
    "Submission ID", "Organization", "Respondent Name", "Role", "Email",
    "Sector", "Org Size", "Language", "Status", "Submitted At",
]


# ── Export Service ────────────────────────────────────────────────────────────

class ExportService:
    def __init__(self, db: Session):
        self.db = db

    def export_csv(
        self,
        survey_id: int | None = None,
        org_id: int | None = None,
    ) -> bytes:
        submissions = _load_submissions(self.db, survey_id, org_id)

        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow(META_HEADERS + [
            "Q#", "Question Key",
            "Question (EN)", "Question (AR)",
            "Answer (EN)", "Answer (AR)",
        ])

        for s in submissions:
            meta = _meta(s)
            sorted_answers = sorted(s.answers, key=lambda a: a.question.display_order if a.question else 0)

            if not sorted_answers:
                writer.writerow(meta + ["", "", "", "", "", ""])
                continue

            for i, ans in enumerate(sorted_answers, start=1):
                q = ans.question
                if not q:
                    continue
                q_en = _t(q.translations, "en")
                q_ar = _t(q.translations, "ar")
                a_en = _answer_text(ans, "en")
                a_ar = _answer_text(ans, "ar")
                writer.writerow(meta + [i, q.question_key, q_en, q_ar, a_en, a_ar])

        return output.getvalue().encode("utf-8-sig")  # BOM for Excel Arabic support

    def export_xlsx(
        self,
        survey_id: int | None = None,
        org_id: int | None = None,
    ) -> bytes:
        import openpyxl
        from openpyxl.styles import Font, PatternFill, Alignment

        submissions = _load_submissions(self.db, survey_id, org_id)

        wb = openpyxl.Workbook()

        # ── Sheet 1: Summary ──────────────────────────────────────────────────
        ws1 = wb.active
        ws1.title = "Summary"

        header_fill = PatternFill("solid", fgColor="1B3A5C")
        header_font = Font(color="FFFFFF", bold=True)
        rtl_align   = Alignment(horizontal="right", readingOrder=2)

        def style_header(ws, headers: list[str]) -> None:
            ws.append(headers)
            for cell in ws[1]:
                cell.fill = header_fill
                cell.font = header_font
                cell.alignment = Alignment(horizontal="center")

        style_header(ws1, META_HEADERS)
        for s in submissions:
            ws1.append(_meta(s))

        # ── Sheet 2: Answers ──────────────────────────────────────────────────
        ws2 = wb.create_sheet("Answers")
        answer_headers = META_HEADERS + [
            "Q#", "Question Key",
            "Question (EN)", "Question (AR)",
            "Answer (EN)", "Answer (AR)",
        ]
        style_header(ws2, answer_headers)

        for s in submissions:
            meta = _meta(s)
            sorted_answers = sorted(
                s.answers,
                key=lambda a: a.question.display_order if a.question else 0,
            )
            for i, ans in enumerate(sorted_answers, start=1):
                q = ans.question
                if not q:
                    continue
                q_en = _t(q.translations, "en")
                q_ar = _t(q.translations, "ar")
                a_en = _answer_text(ans, "en")
                a_ar = _answer_text(ans, "ar")
                row = ws2.append(meta + [i, q.question_key, q_en, q_ar, a_en, a_ar])

        # Apply RTL alignment to Arabic columns (Q AR = col 14, A AR = col 16 — 1-indexed)
        ar_cols = {14, 16}  # Question (AR), Answer (AR)
        for ws in (ws1, ws2):
            for row in ws.iter_rows(min_row=2):
                for cell in row:
                    if cell.column in ar_cols and cell.value:
                        cell.alignment = rtl_align

        # Auto-width
        for ws in (ws1, ws2):
            for col in ws.columns:
                max_len = max((len(str(cell.value or "")) for cell in col), default=10)
                ws.column_dimensions[col[0].column_letter].width = min(max_len + 4, 60)

        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)
        return buf.read()
