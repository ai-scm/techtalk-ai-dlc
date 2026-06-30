from __future__ import annotations

from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel

from client.backend_client import BackendClient, get_backend_client

router = APIRouter(prefix="/api/auth", tags=["Auth"])


ROLE_REDIRECT_MAP = {
    "ADOPTER": "/catalog",
    "PUBLISHER": "/pets/mine",
    "FOUNDATION": "/pets/mine",
}


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str
    confirm_password: str
    role: str
    name: str


@router.post("/login")
async def login(
    body: LoginRequest,
    client: BackendClient = Depends(get_backend_client),
):
    """Login user via backend and enrich response with redirect_url."""
    response = await client.forward_request(
        method="POST",
        path="/users/login",
        json=body.model_dump(),
    )

    if response.status_code != 200:
        return Response(
            content=response.content,
            status_code=response.status_code,
            media_type="application/json",
        )

    data = response.json()
    role = data.get("role", "")
    data["redirect_url"] = ROLE_REDIRECT_MAP.get(role, "/catalog")
    return data


@router.post("/register", status_code=201)
async def register(
    body: RegisterRequest,
    client: BackendClient = Depends(get_backend_client),
):
    """Register user, auto-login, and return token with redirect_url."""
    register_response = await client.forward_request(
        method="POST",
        path="/users/register",
        json=body.model_dump(),
    )

    if register_response.status_code != 201:
        return Response(
            content=register_response.content,
            status_code=register_response.status_code,
            media_type="application/json",
        )

    login_response = await client.forward_request(
        method="POST",
        path="/users/login",
        json={"email": body.email, "password": body.password},
    )

    if login_response.status_code != 200:
        return Response(
            content=login_response.content,
            status_code=login_response.status_code,
            media_type="application/json",
        )

    data = login_response.json()
    role = data.get("role", "")
    data["redirect_url"] = ROLE_REDIRECT_MAP.get(role, "/catalog")
    return data
