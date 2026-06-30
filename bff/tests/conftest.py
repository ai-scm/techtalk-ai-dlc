from __future__ import annotations

import pytest
import respx
from httpx import AsyncClient

from core.config import settings
from main import app


@pytest.fixture
def mock_backend():
    """Mock all httpx calls to the backend URL."""
    with respx.mock(base_url=settings.BACKEND_URL, assert_all_called=False) as mock:
        yield mock


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    from httpx import ASGITransport

    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


@pytest.fixture
def auth_headers():
    """Create valid authorization headers with a test JWT."""
    from jose import jwt

    payload = {"sub": "test-user-id", "email": "test@example.com", "role": "ADOPTER"}
    token = jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")
    return {"Authorization": f"Bearer {token}"}
