from __future__ import annotations

from fastapi import APIRouter, Depends, File, Request, Response, UploadFile

from client.backend_client import BackendClient, get_backend_client
from middleware.auth import optional_token, validate_token

router = APIRouter(prefix="/api/pets", tags=["Pets"])


@router.get("/")
async def list_pets(
    request: Request,
    _token: dict | None = Depends(optional_token),
    client: BackendClient = Depends(get_backend_client),
):
    """List pets with optional filters."""
    response = await client.forward_request(
        method="GET",
        path="/pets",
        headers=dict(request.headers),
        params=dict(request.query_params),
    )
    return Response(
        content=response.content,
        status_code=response.status_code,
        media_type="application/json",
    )


@router.get("/mine")
async def list_my_pets(
    request: Request,
    _token: dict = Depends(validate_token),
    client: BackendClient = Depends(get_backend_client),
):
    """List pets owned by the current user."""
    response = await client.forward_request(
        method="GET",
        path="/pets/mine",
        headers=dict(request.headers),
    )
    return Response(
        content=response.content,
        status_code=response.status_code,
        media_type="application/json",
    )


@router.get("/{pet_id}")
async def get_pet(
    pet_id: str,
    client: BackendClient = Depends(get_backend_client),
):
    """Get a specific pet by ID."""
    response = await client.forward_request(
        method="GET",
        path=f"/pets/{pet_id}",
    )
    return Response(
        content=response.content,
        status_code=response.status_code,
        media_type="application/json",
    )


@router.post("/", status_code=201)
async def create_pet(
    request: Request,
    _token: dict = Depends(validate_token),
    client: BackendClient = Depends(get_backend_client),
):
    """Create a new pet listing."""
    body = await request.json()
    response = await client.forward_request(
        method="POST",
        path="/pets",
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


@router.put("/{pet_id}")
async def update_pet(
    pet_id: str,
    request: Request,
    _token: dict = Depends(validate_token),
    client: BackendClient = Depends(get_backend_client),
):
    """Update a pet listing."""
    body = await request.json()
    response = await client.forward_request(
        method="PUT",
        path=f"/pets/{pet_id}",
        headers=dict(request.headers),
        json=body,
    )
    return Response(
        content=response.content,
        status_code=response.status_code,
        media_type="application/json",
    )


@router.patch("/{pet_id}/status")
async def update_pet_status(
    pet_id: str,
    request: Request,
    _token: dict = Depends(validate_token),
    client: BackendClient = Depends(get_backend_client),
):
    """Update pet adoption status."""
    body = await request.json()
    response = await client.forward_request(
        method="PATCH",
        path=f"/pets/{pet_id}/status",
        headers=dict(request.headers),
        json=body,
    )
    return Response(
        content=response.content,
        status_code=response.status_code,
        media_type="application/json",
    )


@router.post("/{pet_id}/photos", status_code=201)
async def upload_pet_photo(
    pet_id: str,
    request: Request,
    file: UploadFile = File(...),
    _token: dict = Depends(validate_token),
    client: BackendClient = Depends(get_backend_client),
):
    """Upload a photo for a pet."""
    file_content = await file.read()
    response = await client.forward_request(
        method="POST",
        path=f"/pets/{pet_id}/photos",
        headers=dict(request.headers),
        files=[("file", (file.filename, file_content, file.content_type))],
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


@router.delete("/{pet_id}/photos/{photo_id}", status_code=204)
async def delete_pet_photo(
    pet_id: str,
    photo_id: str,
    request: Request,
    _token: dict = Depends(validate_token),
    client: BackendClient = Depends(get_backend_client),
):
    """Delete a pet photo."""
    response = await client.forward_request(
        method="DELETE",
        path=f"/pets/{pet_id}/photos/{photo_id}",
        headers=dict(request.headers),
    )
    if response.status_code != 204:
        return Response(
            content=response.content,
            status_code=response.status_code,
            media_type="application/json",
        )
    return Response(status_code=204)


@router.get("/{pet_id}/photos/{photo_id}")
async def get_pet_photo(
    pet_id: str,
    photo_id: str,
    client: BackendClient = Depends(get_backend_client),
):
    """Get a pet photo, streaming the response back."""
    response = await client.forward_request(
        method="GET",
        path=f"/pets/{pet_id}/photos/{photo_id}",
    )
    if response.status_code != 200:
        return Response(
            content=response.content,
            status_code=response.status_code,
            media_type="application/json",
        )
    content_type = response.headers.get("content-type", "application/octet-stream")
    return Response(
        content=response.content,
        status_code=200,
        media_type=content_type,
    )
