from __future__ import annotations

from fastapi import APIRouter, Depends, Request, Response

from client.backend_client import BackendClient, get_backend_client
from middleware.auth import validate_token

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get("/me")
async def get_current_user(
    request: Request,
    _token: dict = Depends(validate_token),
    client: BackendClient = Depends(get_backend_client),
):
    """Get current user profile from backend."""
    response = await client.forward_request(
        method="GET",
        path="/users/me",
        headers=dict(request.headers),
    )
    return Response(
        content=response.content,
        status_code=response.status_code,
        media_type="application/json",
    )


@router.delete("/me", status_code=204)
async def delete_current_user(
    request: Request,
    _token: dict = Depends(validate_token),
    client: BackendClient = Depends(get_backend_client),
):
    """Delete current user account."""
    response = await client.forward_request(
        method="DELETE",
        path="/users/me",
        headers=dict(request.headers),
    )
    if response.status_code != 204:
        return Response(
            content=response.content,
            status_code=response.status_code,
            media_type="application/json",
        )
    return Response(status_code=204)
