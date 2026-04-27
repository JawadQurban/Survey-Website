import pytest
from app.security.jwt import create_access_token


def _make_session_cookie(contact_id: int, org_id: int, role: str, survey_slug: str) -> str:
    return create_access_token(
        contact_id,
        extra={"type": "survey_session", "org_id": org_id, "role": role, "survey_slug": survey_slug},
    )


def test_get_overview_without_session(client, seeded_survey):
    resp = client.get(f"/api/public/surveys/{seeded_survey.slug}/overview")
    assert resp.status_code == 401


def test_get_overview_with_session(client, seeded_survey, org_and_contact):
    org, contact = org_and_contact
    token = _make_session_cookie(contact.id, org.id, "ceo", seeded_survey.slug)
    client.cookies.set("survey_session_token", token)
    resp = client.get(f"/api/public/surveys/{seeded_survey.slug}/overview")
    assert resp.status_code == 200
    assert "title" in resp.json()


def test_get_questions_ceo_only_sees_ceo_questions(client, seeded_survey, org_and_contact):
    org, contact = org_and_contact
    token = _make_session_cookie(contact.id, org.id, "ceo", seeded_survey.slug)
    client.cookies.set("survey_session_token", token)
    resp = client.get(f"/api/public/surveys/{seeded_survey.slug}/questions")
    assert resp.status_code == 200
    data = resp.json()
    # All returned questions must be visible to CEO
    for section in data["sections"]:
        for q in section["questions"]:
            roles = [vr["role"] for vr in q["visibility_rules"]]
            assert "ceo" in roles


def test_survey_not_found(client, org_and_contact):
    org, contact = org_and_contact
    token = _make_session_cookie(contact.id, org.id, "ceo", "nonexistent")
    client.cookies.set("survey_session_token", token)
    resp = client.get("/api/public/surveys/nonexistent/overview")
    assert resp.status_code == 404
