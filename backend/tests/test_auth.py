import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_user_registration_and_login(client: AsyncClient):
    # 1. Register a new user
    user_payload = {
        "username": "test_inspector",
        "email": "inspector@test.com",
        "password": "securepassword123",
        "role": "inspector"
    }
    register_response = await client.post("/api/auth/register", json=user_payload)
    assert register_response.status_code == 201
    user_data = register_response.json()
    assert user_data["username"] == "test_inspector"
    assert user_data["email"] == "inspector@test.com"
    assert user_data["role"] == "inspector"
    assert "id" in user_data
    assert "password_hash" not in user_data

    # 2. Try duplicate username
    dup_username_payload = {
        "username": "test_inspector",
        "email": "different@test.com",
        "password": "securepassword123",
        "role": "inspector"
    }
    dup_response = await client.post("/api/auth/register", json=dup_username_payload)
    assert dup_response.status_code == 400
    assert "Username already registered" in dup_response.json()["detail"]

    # 3. Try duplicate email
    dup_email_payload = {
        "username": "different_inspector",
        "email": "inspector@test.com",
        "password": "securepassword123",
        "role": "inspector"
    }
    dup_response2 = await client.post("/api/auth/register", json=dup_email_payload)
    assert dup_response2.status_code == 400
    assert "Email already registered" in dup_response2.json()["detail"]

    # 4. Try registration with invalid role
    invalid_role_payload = {
        "username": "super_admin",
        "email": "admin@test.com",
        "password": "securepassword123",
        "role": "invalid_role"
    }
    invalid_role_response = await client.post("/api/auth/register", json=invalid_role_payload)
    assert invalid_role_response.status_code == 422 # Pydantic validation error

    # 5. Login using standard OAuth2 Form Data
    login_form = {
        "username": "test_inspector",
        "password": "securepassword123"
    }
    login_response = await client.post("/api/auth/login", data=login_form)
    assert login_response.status_code == 200
    token_data = login_response.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"
    assert token_data["role"] == "inspector"
    assert token_data["username"] == "test_inspector"

    # 6. Login using JSON endpoint
    login_json_response = await client.post("/api/auth/login-json", json=login_form)
    assert login_json_response.status_code == 200
    token_json_data = login_json_response.json()
    assert "access_token" in token_json_data

    # 7. Login with incorrect password
    bad_login_form = {
        "username": "test_inspector",
        "password": "wrongpassword"
    }
    bad_login_response = await client.post("/api/auth/login", data=bad_login_form)
    assert bad_login_response.status_code == 401

    # 8. Test /auth/me with credentials
    token = token_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    me_response = await client.get("/api/auth/me", headers=headers)
    assert me_response.status_code == 200
    me_data = me_response.json()
    assert me_data["username"] == "test_inspector"
    assert me_data["email"] == "inspector@test.com"

    # 9. Test /auth/me without headers (Unauthorized)
    me_unauth_response = await client.get("/api/auth/me")
    assert me_unauth_response.status_code == 401
