"""Tests for authentication endpoints: register, login, profile, delete."""

from fastapi.testclient import TestClient

from tests.conftest import create_user


class TestRegister:
    """Tests for POST /users/register."""

    def test_register_success(self, client: TestClient) -> None:
        """Register a new user, verify 201 and response fields."""
        data = {
            "email": "newuser@test.com",
            "password": "password123",
            "confirm_password": "password123",
            "role": "ADOPTER",
            "name": "New User",
        }
        resp = client.post("/users/register", json=data)

        assert resp.status_code == 201
        body = resp.json()
        assert body["email"] == "newuser@test.com"
        assert body["role"] == "ADOPTER"
        assert body["name"] == "New User"
        assert "id" in body
        assert "created_at" in body
        # Password should not be in response
        assert "password" not in body
        assert "password_hash" not in body

    def test_register_duplicate_email(self, client: TestClient) -> None:
        """Registering with an existing email returns 409."""
        data = {
            "email": "duplicate@test.com",
            "password": "password123",
            "confirm_password": "password123",
            "role": "ADOPTER",
            "name": "First User",
        }
        resp = client.post("/users/register", json=data)
        assert resp.status_code == 201

        # Try again with same email
        data["name"] = "Second User"
        resp = client.post("/users/register", json=data)
        assert resp.status_code == 409
        assert "already registered" in resp.json()["detail"].lower()

    def test_register_password_mismatch(self, client: TestClient) -> None:
        """Mismatched passwords return 422."""
        data = {
            "email": "mismatch@test.com",
            "password": "password123",
            "confirm_password": "differentpassword",
            "role": "ADOPTER",
            "name": "Mismatch User",
        }
        resp = client.post("/users/register", json=data)
        assert resp.status_code == 422


class TestLogin:
    """Tests for POST /users/login."""

    def test_login_success(self, client: TestClient) -> None:
        """Login with valid credentials returns a token."""
        # First register
        create_user(client, email="loginuser@test.com", password="password123")

        # Then login
        resp = client.post(
            "/users/login",
            json={"email": "loginuser@test.com", "password": "password123"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert "access_token" in body
        assert body["token_type"] == "bearer"
        assert body["role"] == "ADOPTER"

    def test_login_invalid_credentials(self, client: TestClient) -> None:
        """Login with wrong password returns 401."""
        create_user(client, email="badlogin@test.com", password="password123")

        resp = client.post(
            "/users/login",
            json={"email": "badlogin@test.com", "password": "wrongpassword"},
        )
        assert resp.status_code == 401
        assert "invalid" in resp.json()["detail"].lower()


class TestProfile:
    """Tests for GET /users/me and DELETE /users/me."""

    def test_get_me(self, client: TestClient) -> None:
        """Authenticated user can retrieve their own profile."""
        user = create_user(
            client,
            email="me@test.com",
            password="password123",
            role="PUBLISHER",
            name="Me User",
        )

        resp = client.get("/users/me", headers=user["headers"])
        assert resp.status_code == 200
        body = resp.json()
        assert body["email"] == "me@test.com"
        assert body["role"] == "PUBLISHER"
        assert body["name"] == "Me User"
        assert body["id"] == user["id"]

    def test_delete_account(self, client: TestClient) -> None:
        """Deleting account returns 204, subsequent login fails."""
        user = create_user(
            client,
            email="deleteuser@test.com",
            password="password123",
        )

        # Delete account
        resp = client.delete("/users/me", headers=user["headers"])
        assert resp.status_code == 204

        # Verify login no longer works
        resp = client.post(
            "/users/login",
            json={"email": "deleteuser@test.com", "password": "password123"},
        )
        assert resp.status_code == 401
