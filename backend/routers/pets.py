"""Pets router: CRUD, status changes, and photo management."""

import io
from uuid import UUID

from fastapi import APIRouter, Depends, File, Response, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from core.database import get_db
from core.exceptions import NotFoundError
from models.user import User
from repositories import pet_repository, photo_repository
from schemas.pet import (
    CreatePetRequest,
    PaginatedResponse,
    PetDetailResponse,
    PetFilters,
    PetResponse,
    StatusUpdateRequest,
    UpdatePetRequest,
)
from schemas.photo import PhotoResponse
from services import pet_service
from services.auth_service import get_current_user

router = APIRouter(prefix="/pets", tags=["Pets"])


@router.get("/", response_model=PaginatedResponse[PetResponse])
def list_pets(
    species: str | None = None,
    location: str | None = None,
    size: str | None = None,
    age_group: str | None = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
) -> PaginatedResponse[PetResponse]:
    """List available pets with optional filters. No auth required."""
    filters = PetFilters(
        species=species, location=location, size=size, age_group=age_group
    )
    return pet_service.list_available_pets(db, filters, page, page_size)


@router.get("/mine", response_model=list[PetResponse])
def list_my_pets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[PetResponse]:
    """List pets published by the authenticated user."""
    pets = pet_repository.list_by_publisher(db, current_user.id)
    return [PetResponse.model_validate(p) for p in pets]


@router.get("/{pet_id}", response_model=PetDetailResponse)
def get_pet(pet_id: UUID, db: Session = Depends(get_db)) -> PetDetailResponse:
    """Get pet detail with photo metadata. No auth required."""
    return pet_service.get_pet(db, pet_id)


@router.post("/", response_model=PetResponse, status_code=status.HTTP_201_CREATED)
def create_pet(
    data: CreatePetRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PetResponse:
    """Create a new pet listing. Requires PUBLISHER or FOUNDATION role."""
    pet = pet_service.create_pet(db, current_user, data)
    db.commit()
    db.refresh(pet)
    return PetResponse.model_validate(pet)


@router.put("/{pet_id}", response_model=PetResponse)
def update_pet(
    pet_id: UUID,
    data: UpdatePetRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PetResponse:
    """Update an existing pet listing. Requires ownership."""
    pet = pet_service.update_pet(db, current_user, pet_id, data)
    db.commit()
    db.refresh(pet)
    return PetResponse.model_validate(pet)


@router.patch("/{pet_id}/status", response_model=PetResponse)
def change_status(
    pet_id: UUID,
    data: StatusUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PetResponse:
    """Change pet adoption status. Requires ownership."""
    pet = pet_service.change_status(db, current_user, pet_id, data.status)
    db.commit()
    db.refresh(pet)
    return PetResponse.model_validate(pet)


@router.post(
    "/{pet_id}/photos",
    response_model=PhotoResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_photo(
    pet_id: UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PhotoResponse:
    """Upload a photo for a pet. Max 3 photos, JPEG/PNG, <=5MB."""
    photo = await pet_service.upload_photo(db, current_user, pet_id, file)
    db.commit()
    db.refresh(photo)
    return PhotoResponse.model_validate(photo)


@router.delete("/{pet_id}/photos/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_photo(
    pet_id: UUID,
    photo_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    """Delete a photo from a pet. Requires ownership."""
    pet_service.delete_photo(db, current_user, pet_id, photo_id)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{pet_id}/photos/{photo_id}")
def get_photo(
    pet_id: UUID,
    photo_id: UUID,
    db: Session = Depends(get_db),
) -> StreamingResponse:
    """Serve a photo's binary data. No auth required."""
    photos = photo_repository.get_by_pet(db, pet_id)
    photo = next((p for p in photos if p.id == photo_id), None)
    if not photo:
        raise NotFoundError("Photo not found")

    return StreamingResponse(
        io.BytesIO(photo.data),
        media_type=photo.content_type,
        headers={"Content-Disposition": f'inline; filename="{photo.filename}"'},
    )
