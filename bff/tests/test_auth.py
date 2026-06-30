from __future__ import annotations

import json

import httpx
import pytest
import respx

from core.config import settings


@pytest.mark.asyncio
async def test_login_success(client, mock_backend):
    """Test successful login adds redirect_url based on role."""
    mock_backend.post("/users/login").mock(
        return_value=httpx.Response(
            200,
            json={
                "access_token": "test-token",
                "token_type": "bearer",
                "role": "ADOPTER",
            },
        )
    )

    response = await client.post(
        "/api/auth/login",
        json={"email": "user@example.com", "password": "password123"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["access_token"] == "test-token"
    assert data["token_type"] == "bearer"
    assert data["role"] == "ADOPTER"
    assert data["redirect_url"] == "/catalog"


@pytest.mark.asyncio
async def test_login_publisher_redirect(client, mock_backend):
    """Test login with PUBLISHER role redirects to /pets/mine."""
    mock_backend.post("/users/login").mock(
        return_value=httpx.Response(
            200,
            json={
                "access_token": "test-token",
                "token_type": "bearer",
                "role": "PUBLISHER",
            },
        )
    )

    response = await client.post(
        "/api/auth/login",
        json={"email": "publisher@example.com", "password": "password123"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["redirect_url"] == "/pets/mine"


@pytest.mark.asyncio
async def test_login_invalid(client, mock_backend):
    """Test login with invalid credentials forwards 401 from backend."""
    mock_backend.post("/users/login").mock(
        return_value=httpx.Response(
            401,
            json={"detail": "Invalid credentials"},
        )
    )

    response = await client.post(
        "/api/auth/login",
        json={"email": "user@example.com", "password": "wrong"},
    )

    assert response.status_code == 401
    data = response.json()
    assert data["detail"] == "Invalid credentials"


@pytest.mark.asyncio
async def test_register_success(client, mock_backend):
    """Test successful registration auto-logs in and returns token with redirect."""
    mock_backend.post("/users/register").mock(
        return_value=httpx.Response(
            201,
            json={"id": "new-user-id", "email": "new@example.com"},
        )
    )
    mock_backend.post("/users/login").mock(
        return_value=httpx.Response(
            200,
            json={
                "access_token": "new-token",
                "token_type": "bearer",
                "role": "ADOPTER",
            },
        )
    )

    response = await client.post(
        "/api/auth/register",
        json={
            "email": "new@example.com",
            "password": "password123",
            "confirm_password": "password123",
            "role": "ADOPTER",
            "name": "New User",
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["access_token"] == "new-token"
    assert data["role"] == "ADOPTER"
    assert data["redirect_url"] == "/catalog"


@pytest.mark.asyncio
async def test_register_failure(client, mock_backend):
    """Test registration failure forwards backend error."""
    mock_backend.post("/users/register").mock(
        return_value=httpx.Response(
            409,
            json={"detail": "Email already registered"},
        )
    )

    response = await client.post(
        "/api/auth/register",
        json={
            "email": "existing@example.com",
            "password": "password123",
            "confirm_password": "password123",
            "role": "ADOPTER",
            "name": "Existing User",
        },
    )

    assert response.status_code == 409
    data = response.json()
    assert data["detail"] == "Email already registered"
