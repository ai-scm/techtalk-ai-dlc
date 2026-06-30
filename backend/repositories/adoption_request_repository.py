from typing import Optional
from uuid import UUID

from sqlalchemy import func, select, update, and_
from sqlalchemy.orm import Session

from models.adoption_request import AdoptionRequest

ACTIVE_STATUSES = ("SENT", "IN_REVIEW", "WAITLISTED")
NON_TERMINAL_STATUSES = ("SENT", "IN_REVIEW", "WAITLISTED", "ACCEPTED")


def create(db: Session, request: AdoptionRequest) -> AdoptionRequest:
    db.add(request)
    db.flush()
    db.refresh(request)
    return request


def get_by_id(db: Session, request_id: UUID) -> Optional[AdoptionRequest]:
    stmt = select(AdoptionRequest).where(AdoptionRequest.id == request_id)
    return db.execute(stmt).scalar_one_or_none()


def list_by_adopter(db: Session, adopter_id: UUID) -> list[AdoptionRequest]:
    stmt = (
        select(AdoptionRequest)
        .where(AdoptionRequest.adopter_id == adopter_id)
        .order_by(AdoptionRequest.created_at.desc())
    )
    return list(db.execute(stmt).scalars().all())


def list_by_pet(db: Session, pet_id: UUID) -> list[AdoptionRequest]:
    stmt = (
        select(AdoptionRequest)
        .where(AdoptionRequest.pet_id == pet_id)
        .order_by(AdoptionRequest.created_at.desc())
    )
    return list(db.execute(stmt).scalars().all())


def count_active_by_adopter(db: Session, adopter_id: UUID) -> int:
    stmt = (
        select(func.count())
        .select_from(AdoptionRequest)
        .where(
            and_(
                AdoptionRequest.adopter_id == adopter_id,
                AdoptionRequest.status.in_(ACTIVE_STATUSES),
            )
        )
    )
    return db.execute(stmt).scalar_one()


def exists_active(db: Session, adopter_id: UUID, pet_id: UUID) -> bool:
    stmt = (
        select(func.count())
        .select_from(AdoptionRequest)
        .where(
            and_(
                AdoptionRequest.adopter_id == adopter_id,
                AdoptionRequest.pet_id == pet_id,
                AdoptionRequest.status.in_(ACTIVE_STATUSES),
            )
        )
    )
    return db.execute(stmt).scalar_one() > 0


def exists_accepted_for_pet(db: Session, pet_id: UUID) -> bool:
    stmt = (
        select(func.count())
        .select_from(AdoptionRequest)
        .where(
            and_(
                AdoptionRequest.pet_id == pet_id,
                AdoptionRequest.status == "ACCEPTED",
            )
        )
    )
    return db.execute(stmt).scalar_one() > 0


def update_status(db: Session, request_id: UUID, status: str) -> None:
    stmt = (
        update(AdoptionRequest)
        .where(AdoptionRequest.id == request_id)
        .values(status=status)
    )
    db.execute(stmt)
    db.flush()


def waitlist_pending_for_pet(db: Session, pet_id: UUID, exclude_id: UUID) -> None:
    stmt = (
        update(AdoptionRequest)
        .where(
            and_(
                AdoptionRequest.pet_id == pet_id,
                AdoptionRequest.status.in_(("SENT", "IN_REVIEW")),
                AdoptionRequest.id != exclude_id,
            )
        )
        .values(status="WAITLISTED")
    )
    db.execute(stmt)
    db.flush()


def cancel_accepted_for_pet(db: Session, pet_id: UUID) -> None:
    stmt = (
        update(AdoptionRequest)
        .where(
            and_(
                AdoptionRequest.pet_id == pet_id,
                AdoptionRequest.status == "ACCEPTED",
            )
        )
        .values(status="CANCELLED")
    )
    db.execute(stmt)
    db.flush()


def reactivate_waitlisted_for_pet(db: Session, pet_id: UUID) -> None:
    stmt = (
        update(AdoptionRequest)
        .where(
            and_(
                AdoptionRequest.pet_id == pet_id,
                AdoptionRequest.status == "WAITLISTED",
            )
        )
        .values(status="SENT")
    )
    db.execute(stmt)
    db.flush()


def cancel_by_adopter(db: Session, adopter_id: UUID) -> None:
    stmt = (
        update(AdoptionRequest)
        .where(
            and_(
                AdoptionRequest.adopter_id == adopter_id,
                AdoptionRequest.status.in_(ACTIVE_STATUSES),
            )
        )
        .values(status="CANCELLED")
    )
    db.execute(stmt)
    db.flush()


def cancel_by_pet_ids(db: Session, pet_ids: list[UUID]) -> None:
    if not pet_ids:
        return
    stmt = (
        update(AdoptionRequest)
        .where(
            and_(
                AdoptionRequest.pet_id.in_(pet_ids),
                AdoptionRequest.status.in_(NON_TERMINAL_STATUSES),
            )
        )
        .values(status="CANCELLED")
    )
    db.execute(stmt)
    db.flush()
