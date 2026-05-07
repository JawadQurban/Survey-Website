import io
import csv
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.submission import Submission, Answer
from app.models.survey import Question, QuestionOption


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


# ── Summary meta (Sheet 1) — no org/name/email ────────────────────────────────
SUMMARY_HEADERS = [
    "Submission ID", "Role", "Sector", "Org Size",
    "Language", "Status", "Submitted At",
]

def _summary_meta(s: Submission) -> list:
    return [
        s.id,
        s.respondent_role,
        s.sector   or "",
        s.org_size or "",
        s.language_used,
        str(s.status),
        s.submitted_at.isoformat() if s.submitted_at else "",
    ]


# ── Full meta (Sheet 2 / CSV) — all columns ───────────────────────────────────
DETAIL_HEADERS = [
    "Submission ID", "Organization", "Respondent Name", "Role", "Email",
    "Sector", "Org Size", "Language", "Status", "Submitted At",
]

def _detail_meta(s: Submission) -> list:
    return [
        s.id,
        _org_name(s),
        s.respondent_name  or "",
        s.respondent_role,
        s.respondent_email or "",
        s.sector   or "",
        s.org_size or "",
        s.language_used,
        str(s.status),
        s.submitted_at.isoformat() if s.submitted_at else "",
    ]


# ── Intro question helpers ────────────────────────────────────────────────────

def _get_intro_questions(submissions: list[Submission]) -> list[Question]:
    """Return unique intro questions (is_intro=True) sorted by display_order."""
    seen: set[int] = set()
    intro_qs: list[Question] = []
    for s in submissions:
        for ans in s.answers:
            q = ans.question
            if q and getattr(q, "is_intro", False) and q.id not in seen:
                seen.add(q.id)
                intro_qs.append(q)
    return sorted(intro_qs, key=lambda q: q.display_order)


def _intro_answer_pair(ans_map: dict, q: Question) -> list[str]:
    """Return [answer_en, answer_ar] for an intro question from an answer map."""
    ans = ans_map.get(q.id)
    if not ans:
        return ["", ""]
    return [_answer_text(ans, "en"), _answer_text(ans, "ar")]


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

        writer.writerow(DETAIL_HEADERS + [
            "Q#", "Question Key",
            "Question (EN)", "Question (AR)",
            "Answer (EN)", "Answer (AR)",
        ])

        for s in submissions:
            meta = _detail_meta(s)
            sorted_answers = sorted(
                s.answers,
                key=lambda a: a.question.display_order if a.question else 0,
            )
            if not sorted_answers:
                writer.writerow(meta + ["", "", "", "", "", ""])
                continue

            for i, ans in enumerate(sorted_answers, start=1):
                q = ans.question
                if not q:
                    continue
                writer.writerow(meta + [
                    i,
                    q.question_key,
                    _t(q.translations, "en"),
                    _t(q.translations, "ar"),
                    _answer_text(ans, "en"),
                    _answer_text(ans, "ar"),
                ])

        return output.getvalue().encode("utf-8-sig")

    def export_xlsx(
        self,
        survey_id: int | None = None,
        org_id: int | None = None,
    ) -> bytes:
        import openpyxl
        from openpyxl.styles import Font, PatternFill, Alignment

        submissions = _load_submissions(self.db, survey_id, org_id)

        # Collect intro questions across all submissions
        intro_qs = _get_intro_questions(submissions)

        # Build dynamic intro column headers
        # Each intro question gets two columns: label (EN) and label (AR)
        intro_col_headers: list[str] = []
        for iq in intro_qs:
            label = _t(iq.translations, "en") or iq.question_key
            label = label[:50]  # cap width
            intro_col_headers += [f"{label} (EN)", f"{label} (AR)"]

        wb = openpyxl.Workbook()

        header_fill = PatternFill("solid", fgColor="1B3A5C")
        header_font = Font(color="FFFFFF", bold=True)
        rtl_align   = Alignment(horizontal="right", readingOrder=2)
        center      = Alignment(horizontal="center")

        def style_header(ws, headers: list[str]) -> None:
            ws.append(headers)
            for cell in ws[1]:
                cell.fill = header_fill
                cell.font = header_font
                cell.alignment = center

        # ── Sheet 1: Summary (slim — no org/name/email, + intro Q columns) ────
        ws1 = wb.active
        ws1.title = "Summary"

        style_header(ws1, SUMMARY_HEADERS + intro_col_headers)

        for s in submissions:
            ans_map = {ans.question_id: ans for ans in s.answers}
            intro_values: list[str] = []
            for iq in intro_qs:
                intro_values += _intro_answer_pair(ans_map, iq)
            ws1.append(_summary_meta(s) + intro_values)

        # ── Sheet 2: Answers (full detail — all Q&A, both languages) ──────────
        ws2 = wb.create_sheet("Answers")
        style_header(ws2, DETAIL_HEADERS + [
            "Intro?", "Q#", "Question Key",
            "Question (EN)", "Question (AR)",
            "Answer (EN)", "Answer (AR)",
        ])

        for s in submissions:
            meta = _detail_meta(s)
            sorted_answers = sorted(
                s.answers,
                key=lambda a: a.question.display_order if a.question else 0,
            )
            for i, ans in enumerate(sorted_answers, start=1):
                q = ans.question
                if not q:
                    continue
                ws2.append(meta + [
                    "Yes" if getattr(q, "is_intro", False) else "No",
                    i,
                    q.question_key,
                    _t(q.translations, "en"),
                    _t(q.translations, "ar"),
                    _answer_text(ans, "en"),
                    _answer_text(ans, "ar"),
                ])

        # RTL alignment: find Arabic columns by header name
        for ws in (ws1, ws2):
            ar_col_indices: set[int] = set()
            for cell in ws[1]:
                if cell.value and "(AR)" in str(cell.value):
                    ar_col_indices.add(cell.column)
            for row in ws.iter_rows(min_row=2):
                for cell in row:
                    if cell.column in ar_col_indices and cell.value:
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
