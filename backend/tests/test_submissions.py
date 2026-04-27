import pytest
from app.security.jwt import create_access_token


def _session_token(contact_id: int, org_id: int, role: str, survey_slug: str) -> str:
    return create_access_token(
        contact_id,
        extra={"type": "survey_session", "org_id": org_id, "role": role, "survey_slug": survey_slug},
    )


def test_submit_saves_answers(client, seeded_survey, org_and_contact, db_session):
    org, contact = org_and_contact
    token = _session_token(contact.id, org.id, "ceo", seeded_survey.slug)
    client.cookies.set("survey_session_token", token)

    # Get questions first
    resp = client.get(f"/api/public/surveys/{seeded_survey.slug}/questions")
    sections = resp.json()["sections"]
    q_id = sections[0]["questions"][0]["id"]

    submit_resp = client.post("/api/public/submissions/submit", json={
        "survey_slug": seeded_survey.slug,
        "language": "en",
        "answers": [{"question_id": q_id, "selected_option_keys": ["opt_1"]}],
    })
    assert submit_resp.status_code == 200
    data = submit_resp.json()
    assert data["status"] == "submitted"


def test_duplicate_submission_blocked(client, seeded_survey, org_and_contact):
    org, contact = org_and_contact
    token = _session_token(contact.id, org.id, "ceo", seeded_survey.slug)
    client.cookies.set("survey_session_token", token)

    resp = client.get(f"/api/public/surveys/{seeded_survey.slug}/questions")
    q_id = resp.json()["sections"][0]["questions"][0]["id"]

    payload = {
        "survey_slug": seeded_survey.slug,
        "language": "en",
        "answers": [{"question_id": q_id, "selected_option_keys": ["opt_1"]}],
    }
    client.post("/api/public/submissions/submit", json=payload)

    # Second attempt should fail
    resp2 = client.post("/api/public/submissions/submit", json=payload)
    assert resp2.status_code == 409


def test_admin_can_reopen_submission(client, admin_user, seeded_survey, org_and_contact, db_session):
    org, contact = org_and_contact

    # Submit via public route
    token = _session_token(contact.id, org.id, "ceo", seeded_survey.slug)
    client.cookies.set("survey_session_token", token)
    resp = client.get(f"/api/public/surveys/{seeded_survey.slug}/questions")
    q_id = resp.json()["sections"][0]["questions"][0]["id"]
    submit_resp = client.post("/api/public/submissions/submit", json={
        "survey_slug": seeded_survey.slug,
        "language": "en",
        "answers": [{"question_id": q_id, "selected_option_keys": ["opt_1"]}],
    })
    submission_id = submit_resp.json()["id"]
    client.cookies.clear()

    # Admin logs in
    client.post("/api/admin/auth/login", json={"email": "testadmin@fa.gov.sa", "password": "SecurePass123!"})
    reopen_resp = client.post(f"/api/admin/submissions/{submission_id}/reopen", json={"reason": "Data correction"})
    assert reopen_resp.status_code == 200
    assert reopen_resp.json()["status"] == "reopened"


def test_invalid_option_key_rejected(client, seeded_survey, org_and_contact):
    org, contact = org_and_contact
    token = _session_token(contact.id, org.id, "ceo", seeded_survey.slug)
    client.cookies.set("survey_session_token", token)

    resp = client.get(f"/api/public/surveys/{seeded_survey.slug}/questions")
    q_id = resp.json()["sections"][0]["questions"][0]["id"]

    submit_resp = client.post("/api/public/submissions/submit", json={
        "survey_slug": seeded_survey.slug,
        "language": "en",
        "answers": [{"question_id": q_id, "selected_option_keys": ["invalid_key_xyz"]}],
    })
    assert submit_resp.status_code == 400
