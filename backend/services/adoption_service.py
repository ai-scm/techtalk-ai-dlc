"""Adoption service: request creation, review workflow, and cancellation."""

from uuid import UUID, uuid4

from sqlalchemy.orm import Session

from core.exceptions import ConflictError, ForbiddenError, NotFoundError, ValidationError
from models.adoption_request import AdoptionRequest
from models.user import User
from repositories import adoption_request_repository, pet_repository
from schemas.request import AdoptionRequestDetailResponse, CreateAdoptionRequest


def create_request(
    db: Session, user: User, pet_id: UUID, data: CreateAdoptionRequest
) -> AdoptionRequest:
    """Create a new adoption request.

    Raises:
        ForbiddenError: If user is not an ADOPTER.
        NotFoundError: If pet does not exist.
        ValidationError: If pet is not available, is own pet, or limits exceeded.
        ConflictError: If a duplicate active request exists.
    """
    if user.role != "ADOPTER":
        raise ForbiddenError("Only adopters can create adoption requests")

    pet = pet_repository.get_by_id(db, pet_id)
    if not pet:
        raise NotFoundError("Pet not found")
    if pet.status != "AVAILABLE":
        raise ValidationError("Pet is not available for adoption")
    if pet.publisher_id == user.id:
        raise ValidationError("Cannot request adoption for your own pet")

    active_count = adoption_request_repository.count_active_by_adopter(db, user.id)
    if active_count >= 3:
        raise ValidationError("Maximum 3 active adoption requests allowed")

    if adoption_request_repository.exists_active(db, user.id, pet_id):
        raise ConflictError("You already have an active request for this pet")

    request = AdoptionRequest(
        id=uuid4(),
        pet_id=pet_id,
        adopter_id=user.id,
        publisher_id=pet.publisher_id,
        status="SENT",
        message=data.message,
    )
    return adoption_request_repository.create(db, request)


def get_adopter_requests(db: Session, adopter_id: UUID) -> list[AdoptionRequest]:
    """Get all adoption requests for an adopter."""
    return adoption_request_repository.list_by_adopter(db, adopter_id)


def cancel_request(db: Session, user: User, request_id: UUID) -> AdoptionRequest:
    """Cancel an adoption request.

    Raises:
        NotFoundError: If request does not exist.
        ForbiddenError: If user does not own the request.
        ValidationError: If request is not in a cancellable state.
    """
    request = adoption_request_repository.get_by_id(db, request_id)
    if not request:
        raise NotFoundError("Adoption request not found")
    if request.adopter_id != user.id:
        raise ForbiddenError("You do not own this adoption request")
    if request.status not in ("SENT", "IN_REVIEW"):
        raise ValidationError("Cannot cancel a request in this state")

    adoption_request_repository.update_status(db, request_id, "CANCELLED")
    db.refresh(request)
    return request


def get_pet_requests(
    db: Session, user: User, pet_id: UUID
) -> list[AdoptionRequestDetailResponse]:
    """Get all adoption requests for a pet (publisher view).

    For ACCEPTED requests, includes adopter contact information.

    Raises:
        NotFoundError: If pet does not exist.
        ForbiddenError: If user does not own the pet.
    """
    pet = pet_repository.get_by_id(db, pet_id)
    if not pet:
        raise NotFoundError("Pet not found")
    if pet.publisher_id != user.id:
        raise ForbiddenError("You do not own this pet listing")

    requests = adoption_request_repository.list_by_pet(db, pet_id)
    results = []
    for req in requests:
        detail = AdoptionRequestDetailResponse.model_validate(req)
        if req.status == "ACCEPTED":
            adopter = req.adopter
            detail.adopter_email = adopter.email
            detail.adopter_phone = adopter.phone
            detail.adopter_name = adopter.name
        results.append(detail)
    return results


def review_request(db: Session, user: User, request_id: UUID) -> AdoptionRequest:
    """Move an adoption request to IN_REVIEW status.

    Raises:
        NotFoundError: If request does not exist.
        ForbiddenError: If user does not own the pet.
        ValidationError: If request is not in SENT status.
    """
    request = adoption_request_repository.get_by_id(db, request_id)
    if not request:
        raise NotFoundError("Adoption request not found")

    pet = pet_repository.get_by_id(db, request.pet_id)
    if not pet or pet.publisher_id != user.id:
        raise ForbiddenError("You do not own this pet listing")

    if request.status != "SENT":
        raise ValidationError("Can only review requests in SENT status")

    adoption_request_repository.update_status(db, request_id, "IN_REVIEW")
    db.refresh(request)
    return request


def accept_request(db: Session, user: User, request_id: UUID) -> AdoptionRequest:
    """Accept an adoption request.

    Updates pet status to IN_PROCESS and waitlists other pending requests.

    Raises:
        NotFoundError: If request does not exist.
        ForbiddenError: If user does not own the pet.
        ValidationError: If request status is invalid or another already accepted.
    """
    request = adoption_request_repository.get_by_id(db, request_id)
    if not request:
        raise NotFoundError("Adoption request not found")

    pet = pet_repository.get_by_id(db, request.pet_id)
    if not pet or pet.publisher_id != user.id:
        raise ForbiddenError("You do not own this pet listing")

    if request.status not in ("SENT", "IN_REVIEW"):
        raise ValidationError("Can only accept requests in SENT or IN_REVIEW status")

    if adoption_request_repository.exists_accepted_for_pet(db, request.pet_id):
        raise ValidationError(
            "Another request has already been accepted for this pet"
        )

    adoption_request_repository.update_status(db, request_id, "ACCEPTED")
    pet_repository.update_status(db, request.pet_id, "IN_PROCESS")
    adoption_request_repository.waitlist_pending_for_pet(
        db, request.pet_id, exclude_id=request_id
    )

    db.refresh(request)
    return request


def reject_request(db: Session, user: User, request_id: UUID) -> AdoptionRequest:
    """Reject an adoption request.

    Raises:
        NotFoundError: If request does not exist.
        ForbiddenError: If user does not own the pet.
        ValidationError: If request is not in a rejectable state.
    """
    request = adoption_request_repository.get_by_id(db, request_id)
    if not request:
        raise NotFoundError("Adoption request not found")

    pet = pet_repository.get_by_id(db, request.pet_id)
    if not pet or pet.publisher_id != user.id:
        raise ForbiddenError("You do not own this pet listing")

    if request.status not in ("SENT", "IN_REVIEW", "WAITLISTED"):
        raise ValidationError("Cannot reject a request in this state")

    adoption_request_repository.update_status(db, request_id, "REJECTED")
    db.refresh(request)
    return request
