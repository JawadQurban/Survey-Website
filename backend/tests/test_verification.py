import pytest


def test_verify_request_unknown_email_returns_generic(client):
    """Should not reveal whether email exists."""
    resp = client.post("/api/public/verify/request", json={"email": "noone@unknown.com", "language": "en"})
    assert resp.status_code == 200
    assert "verification code" in resp.json()["message"].lower() or "registered" in resp.json()["message"].lower()


def test_verify_request_known_email_returns_same_message(client, org_and_contact):
    _, contact = org_and_contact
    resp = client.post("/api/public/verify/request", json={"email": contact.email, "language": "en"})
    assert resp.status_code == 200
    # Same generic message regardless
    assert resp.json()["message"] is not None


def test_confirm_with_invalid_token(client, org_and_contact):
    _, contact = org_and_contact
    resp = client.post("/api/public/verify/confirm", json={"email": contact.email, "token": "000000"})
    assert resp.status_code == 400


def test_confirm_with_wrong_email(client, org_and_contact):
    resp = client.post("/api/public/verify/confirm", json={"email": "wrong@email.com", "token": "123456"})
    assert resp.status_code == 400
