"""Pet service: CRUD operations, status management, and photo handling."""

from uuid import UUID, uuid4

from fastapi import UploadFile
from sqlalchemy.orm import Session

from core.exceptions import ForbiddenError, NotFoundError, ValidationError
from models.pet import Pet
from models.photo import Photo
from models.user import User
from repositories import adoption_request_repository, pet_repository, photo_repository
from schemas.pet import (
    CreatePetRequest,
    PaginatedResponse,
    PetDetailResponse,
    PetFilters,
    PetResponse,
    UpdatePetRequest,
)
from schemas.photo import PhotoResponse

MAX_PHOTOS_PER_PET = 3
MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png"}


def create_pet(db: Session, user: User, data: CreatePetRequest) -> Pet:
    """Create a new pet listing.

    Raises:
        ForbiddenError: If user role is not PUBLISHER or FOUNDATION.
    """
    if user.role not in ("PUBLISHER", "FOUNDATION"):
        raise ForbiddenError("Only publishers and foundations can create pet listings")

    pet = Pet(
        id=uuid4(),
        publisher_id=user.id,
        name=data.name,
        species=data.species,
        size=data.size,
        age_group=data.age_group,
        location=data.location,
        health_status=data.health_status,
        description=data.description,
        status="AVAILABLE",
    )
    return pet_repository.create(db, pet)


def list_available_pets(
    db: Session, filters: PetFilters, page: int, page_size: int
) -> PaginatedResponse[PetResponse]:
    """List available pets with filters and pagination."""
    items, total = pet_repository.list_available(db, filters, page, page_size)
    return PaginatedResponse(
        items=[PetResponse.model_validate(pet) for pet in items],
        total=total,
        page=page,
        page_size=page_size,
    )


def get_pet(db: Session, pet_id: UUID) -> PetDetailResponse:
    """Get pet detail including photos (metadata only).

    Raises:
        NotFoundError: If pet does not exist.
    """
    pet = pet_repository.get_by_id(db, pet_id)
    if not pet:
        raise NotFoundError("Pet not found")

    photos = photo_repository.get_by_pet(db, pet_id)
    photo_responses = [PhotoResponse.model_validate(p) for p in photos]

    return PetDetailResponse(
        id=pet.id,
        publisher_id=pet.publisher_id,
        name=pet.name,
        species=pet.species,
        size=pet.size,
        age_group=pet.age_group,
        location=pet.location,
        health_status=pet.health_status,
        description=pet.description,
        status=pet.status,
        created_at=pet.created_at,
        updated_at=pet.updated_at,
        photos=photo_responses,
    )


def update_pet(db: Session, user: User, pet_id: UUID, data: UpdatePetRequest) -> Pet:
    """Update a pet listing.

    Raises:
        NotFoundError: If pet does not exist.
        ForbiddenError: If user does not own the pet.
        ValidationError: If pet is already adopted.
    """
    pet = pet_repository.get_by_id(db, pet_id)
    if not pet:
        raise NotFoundError("Pet not found")
    if pet.publisher_id != user.id:
        raise ForbiddenError("You do not own this pet listing")
    if pet.status == "ADOPTED":
        raise ValidationError("Cannot update an adopted pet")

    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        return pet

    return pet_repository.update(db, pet, update_data)


def change_status(db: Session, user: User, pet_id: UUID, new_status: str) -> Pet:
    """Change pet adoption status with transition validation.

    Valid transitions:
    - AVAILABLE -> IN_PROCESS
    - IN_PROCESS -> ADOPTED: cancels waitlisted requests
    - IN_PROCESS -> AVAILABLE: cancels accepted, reactivates waitlisted

    Raises:
        NotFoundError: If pet does not exist.
        ForbiddenError: If user does not own the pet.
        ValidationError: If transition is invalid.
    """
    pet = pet_repository.get_by_id(db, pet_id)
    if not pet:
        raise NotFoundError("Pet not found")
    if pet.publisher_id != user.id:
        raise ForbiddenError("You do not own this pet listing")

    current = pet.status
    valid_transitions = {
        "AVAILABLE": ["IN_PROCESS"],
        "IN_PROCESS": ["ADOPTED", "AVAILABLE"],
        "ADOPTED": [],
    }

    if new_status not in valid_transitions.get(current, []):
        raise ValidationError(f"Cannot transition from {current} to {new_status}")

    # Handle side effects of transitions
    if current == "IN_PROCESS" and new_status == "ADOPTED":
        adoption_request_repository.waitlist_pending_for_pet(
            db, pet_id, exclude_id=uuid4()
        )

    if current == "IN_PROCESS" and new_status == "AVAILABLE":
        adoption_request_repository.cancel_accepted_for_pet(db, pet_id)
        adoption_request_repository.reactivate_waitlisted_for_pet(db, pet_id)

    pet_repository.update_status(db, pet_id, new_status)
    db.refresh(pet)
    return pet


async def upload_photo(
    db: Session, user: User, pet_id: UUID, file: UploadFile
) -> Photo:
    """Upload a photo for a pet.

    Raises:
        NotFoundError: If pet does not exist.
        ForbiddenError: If user does not own the pet.
        ValidationError: If photo limit reached, invalid type, or too large.
    """
    pet = pet_repository.get_by_id(db, pet_id)
    if not pet:
        raise NotFoundError("Pet not found")
    if pet.publisher_id != user.id:
        raise ForbiddenError("You do not own this pet listing")

    count = photo_repository.count_by_pet(db, pet_id)
    if count >= MAX_PHOTOS_PER_PET:
        raise ValidationError(f"Maximum {MAX_PHOTOS_PER_PET} photos per pet")

    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise ValidationError("Only JPEG and PNG images are allowed")

    data = await file.read()
    if len(data) > MAX_PHOTO_SIZE_BYTES:
        raise ValidationError("Photo must be 5MB or less")

    photo = Photo(
        id=uuid4(),
        pet_id=pet_id,
        data=data,
        filename=file.filename or "photo",
        content_type=file.content_type,
        size_bytes=len(data),
    )
    return photo_repository.create(db, photo)


def delete_photo(db: Session, user: User, pet_id: UUID, photo_id: UUID) -> None:
    """Delete a photo from a pet.

    Raises:
        NotFoundError: If pet does not exist.
        ForbiddenError: If user does not own the pet.
    """
    pet = pet_repository.get_by_id(db, pet_id)
    if not pet:
        raise NotFoundError("Pet not found")
    if pet.publisher_id != user.id:
        raise ForbiddenError("You do not own this pet listing")

    photo_repository.delete(db, photo_id)


def delete_pets_by_user(db: Session, user_id: UUID) -> list[UUID]:
    """Get pet IDs for a publisher (used before user deletion)."""
    return pet_repository.list_ids_by_publisher(db, user_id)
