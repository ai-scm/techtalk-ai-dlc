"""Pytest fixtures for backend unit tests."""

import os
from collections.abc import Generator
from typing import Any

# Override DATABASE_URL before importing the app so on_startup uses SQLite
os.environ["DATABASE_URL"] = "sqlite://"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from core.database import Base, get_db
from main import app

# SQLite in-memory engine for tests
engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

# Enable foreign keys for SQLite
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection: Any, connection_record: Any) -> None:
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture()
def db_session() -> Generator[Session, None, None]:
    """Create tables, yield a database session, then drop all tables."""
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client(db_session: Session) -> Generator[TestClient, None, None]:
    """TestClient with overridden get_db dependency and suppressed startup."""

    def _override_get_db() -> Generator[Session, None, None]:
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = _override_get_db

    # Clear startup handlers so on_startup doesn't try to connect to real DB
    original_handlers = app.router.on_startup.copy()
    app.router.on_startup.clear()

    with TestClient(app, raise_server_exceptions=True) as tc:
        yield tc

    app.router.on_startup = original_handlers
    app.dependency_overrides.clear()


def create_user(
    client: TestClient,
    email: str = "test@test.com",
    password: str = "password123",
    role: str = "ADOPTER",
    name: str = "Test User",
) -> dict:
    """Helper to register a user and return user data with auth token.

    Returns:
        dict with keys: id, email, role, name, token, headers
    """
    register_data = {
        "email": email,
        "password": password,
        "confirm_password": password,
        "role": role,
        "name": name,
    }
    resp = client.post("/users/register", json=register_data)
    assert resp.status_code == 201, f"Registration failed: {resp.text}"
    user_data = resp.json()

    login_data = {"email": email, "password": password}
    resp = client.post("/users/login", json=login_data)
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    token = resp.json()["access_token"]

    return {
        "id": user_data["id"],
        "email": user_data["email"],
        "role": user_data["role"],
        "name": user_data["name"],
        "token": token,
        "headers": {"Authorization": f"Bearer {token}"},
    }


@pytest.fixture()
def sample_adopter(client: TestClient) -> dict:
    """Create and return an adopter user with auth headers."""
    return create_user(
        client,
        email="adopter@test.com",
        password="password123",
        role="ADOPTER",
        name="Test Adopter",
    )


@pytest.fixture()
def sample_publisher(client: TestClient) -> dict:
    """Create and return a publisher user with auth headers."""
    return create_user(
        client,
        email="publisher@test.com",
        password="password123",
        role="PUBLISHER",
        name="Test Publisher",
    )


@pytest.fixture()
def sample_foundation(client: TestClient) -> dict:
    """Create and return a foundation user with auth headers."""
    return create_user(
        client,
        email="foundation@test.com",
        password="password123",
        role="FOUNDATION",
        name="Test Foundation",
    )
