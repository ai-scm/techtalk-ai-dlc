from __future__ import annotations

from fastapi import APIRouter, Depends, Request, Response

from client.backend_client import BackendClient, get_backend_client
from middleware.auth import validate_token

router = APIRouter(prefix="/api", tags=["Adoption Requests"])


@router.post("/pets/{pet_id}/requests", status_code=201)
async def create_adoption_request(
    pet_id: str,
    request: Request,
    _token: dict = Depends(validate_token),
    client: BackendClient = Depends(get_backend_client),
):
    """Create an adoption request for a pet."""
    body = await request.json()
    response = await client.forward_request(
        method="POST",
        path=f"/pets/{pet_id}/requests",
        headers=dict(request.headers),
        json=body,
    )
    if response.status_code != 201:
        return Response(
            content=response.content,
            status_code=response.status_code,
            media_type="application/json",
        )
    return Response(
        content=response.content,
        status_code=201,
        media_type="application/json",
    )


@router.get("/requests/mine")
async def get_my_requests(
    request: Request,
    _token: dict = Depends(validate_token),
    client: BackendClient = Depends(get_backend_client),
):
    """Get adoption requests made by the current user."""
    response = await client.forward_request(
        method="GET",
        path="/requests/mine",
        headers=dict(request.headers),
    )
    return Response(
        content=response.content,
        status_code=response.status_code,
        media_type="application/json",
    )


@router.patch("/requests/{request_id}/cancel")
async def cancel_request(
    request_id: str,
    request: Request,
    _token: dict = Depends(validate_token),
    client: BackendClient = Depends(get_backend_client),
):
    """Cancel an adoption request."""
    response = await client.forward_request(
        method="PATCH",
        path=f"/requests/{request_id}/cancel",
        headers=dict(request.headers),
    )
    return Response(
        content=response.content,
        status_code=response.status_code,
        media_type="application/json",
    )


@router.get("/pets/{pet_id}/requests")
async def get_pet_requests(
    pet_id: str,
    request: Request,
    _token: dict = Depends(validate_token),
    client: BackendClient = Depends(get_backend_client),
):
    """Get all adoption requests for a specific pet."""
    response = await client.forward_request(
        method="GET",
        path=f"/pets/{pet_id}/requests",
        headers=dict(request.headers),
    )
    return Response(
        content=response.content,
        status_code=response.status_code,
        media_type="application/json",
    )


@router.patch("/requests/{request_id}/review")
async def review_request(
    request_id: str,
    request: Request,
    _token: dict = Depends(validate_token),
    client: BackendClient = Depends(get_backend_client),
):
    """Mark an adoption request as under review."""
    response = await client.forward_request(
        method="PATCH",
        path=f"/requests/{request_id}/review",
        headers=dict(request.headers),
    )
    return Response(
        content=response.content,
        status_code=response.status_code,
        media_type="application/json",
    )


@router.patch("/requests/{request_id}/accept")
async def accept_request(
    request_id: str,
    request: Request,
    _token: dict = Depends(validate_token),
    client: BackendClient = Depends(get_backend_client),
):
    """Accept an adoption request."""
    response = await client.forward_request(
        method="PATCH",
        path=f"/requests/{request_id}/accept",
        headers=dict(request.headers),
    )
    return Response(
        content=response.content,
        status_code=response.status_code,
        media_type="application/json",
    )


@router.patch("/requests/{request_id}/reject")
async def reject_request(
    request_id: str,
    request: Request,
    _token: dict = Depends(validate_token),
    client: BackendClient = Depends(get_backend_client),
):
    """Reject an adoption request."""
    response = await client.forward_request(
        method="PATCH",
        path=f"/requests/{request_id}/reject",
        headers=dict(request.headers),
    )
    return Response(
        content=response.content,
        status_code=response.status_code,
        media_type="application/json",
    )
