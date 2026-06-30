from __future__ import annotations

from fastapi import HTTPException, Request
from jose import JWTError, jwt

from core.config import settings


def _extract_token(request: Request) -> str | None:
    """Extract Bearer token from Authorization header."""
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return None
    parts = auth_header.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    return parts[1]


async def validate_token(request: Request) -> dict:
    """FastAPI dependency that validates JWT token. Raises 401 if invalid/missing."""
    token = _extract_token(request)
    if not token:
        raise HTTPException(
            status_code=401,
            detail="Missing or invalid authorization token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def optional_token(request: Request) -> dict | None:
    """FastAPI dependency that returns decoded token or None if not present."""
    token = _extract_token(request)
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        return payload
    except JWTError:
        return None
