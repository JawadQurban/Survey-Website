import pytest


def test_login_success(client, admin_user):
    resp = client.post("/api/admin/auth/login", json={"email": "testadmin@fa.gov.sa", "password": "SecurePass123!"})
    assert resp.status_code == 200
    assert "admin_access_token" in resp.cookies


def test_login_wrong_password(client, admin_user):
    resp = client.post("/api/admin/auth/login", json={"email": "testadmin@fa.gov.sa", "password": "WrongPassword!"})
    assert resp.status_code == 401


def test_login_unknown_email(client):
    resp = client.post("/api/admin/auth/login", json={"email": "nobody@unknown.com", "password": "SomePass123!"})
    assert resp.status_code == 401


def test_get_me_unauthenticated(client):
    resp = client.get("/api/admin/auth/me")
    assert resp.status_code == 401


def test_get_me_authenticated(client, admin_user):
    client.post("/api/admin/auth/login", json={"email": "testadmin@fa.gov.sa", "password": "SecurePass123!"})
    resp = client.get("/api/admin/auth/me")
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "testadmin@fa.gov.sa"


def test_logout(client, admin_user):
    client.post("/api/admin/auth/login", json={"email": "testadmin@fa.gov.sa", "password": "SecurePass123!"})
    resp = client.post("/api/admin/auth/logout")
    assert resp.status_code == 200
    assert client.get("/api/admin/auth/me").status_code == 401
