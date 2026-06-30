"""Adoption requests router: create, cancel, review, accept, reject."""

from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from core.database import get_db
from models.user import User
from schemas.request import (
    AdoptionRequestDetailResponse,
    AdoptionRequestResponse,
    CreateAdoptionRequest,
)
from services import adoption_service
from services.auth_service import get_current_user

router = APIRouter(prefix="", tags=["Adoption Requests"])


@router.post(
    "/pets/{pet_id}/requests",
    response_model=AdoptionRequestResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_request(
    pet_id: UUID,
    data: CreateAdoptionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AdoptionRequestResponse:
    """Create an adoption request for a pet. Requires ADOPTER role."""
    request = adoption_service.create_request(db, current_user, pet_id, data)
    db.commit()
    db.refresh(request)
    return AdoptionRequestResponse.model_validate(request)


@router.get("/requests/mine", response_model=list[AdoptionRequestResponse])
def get_my_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[AdoptionRequestResponse]:
    """Get all adoption requests for the authenticated adopter."""
    requests = adoption_service.get_adopter_requests(db, current_user.id)
    return [AdoptionRequestResponse.model_validate(r) for r in requests]


@router.patch("/requests/{request_id}/cancel", response_model=AdoptionRequestResponse)
def cancel_request(
    request_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AdoptionRequestResponse:
    """Cancel an adoption request. Only the adopter who created it can cancel."""
    request = adoption_service.cancel_request(db, current_user, request_id)
    db.commit()
    db.refresh(request)
    return AdoptionRequestResponse.model_validate(request)


@router.get(
    "/pets/{pet_id}/requests",
    response_model=list[AdoptionRequestDetailResponse],
)
def get_pet_requests(
    pet_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[AdoptionRequestDetailResponse]:
    """Get all adoption requests for a pet. Requires PUBLISHER/FOUNDATION ownership."""
    return adoption_service.get_pet_requests(db, current_user, pet_id)


@router.patch("/requests/{request_id}/review", response_model=AdoptionRequestResponse)
def review_request(
    request_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AdoptionRequestResponse:
    """Move a request to IN_REVIEW. Publisher only."""
    request = adoption_service.review_request(db, current_user, request_id)
    db.commit()
    db.refresh(request)
    return AdoptionRequestResponse.model_validate(request)


@router.patch(
    "/requests/{request_id}/accept",
    response_model=AdoptionRequestDetailResponse,
)
def accept_request(
    request_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AdoptionRequestDetailResponse:
    """Accept an adoption request. Publisher only. Returns with contact info."""
    request = adoption_service.accept_request(db, current_user, request_id)
    db.commit()
    db.refresh(request)
    detail = AdoptionRequestDetailResponse.model_validate(request)
    adopter = request.adopter
    detail.adopter_email = adopter.email
    detail.adopter_phone = adopter.phone
    detail.adopter_name = adopter.name
    return detail


@router.patch("/requests/{request_id}/reject", response_model=AdoptionRequestResponse)
def reject_request(
    request_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AdoptionRequestResponse:
    """Reject an adoption request. Publisher only."""
    request = adoption_service.reject_request(db, current_user, request_id)
    db.commit()
    db.refresh(request)
    return AdoptionRequestResponse.model_validate(request)
