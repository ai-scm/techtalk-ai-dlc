from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import func, select, and_
from sqlalchemy.orm import Session

from models.pet import Pet
from schemas.pet import PetFilters


def create(db: Session, pet: Pet) -> Pet:
    db.add(pet)
    db.flush()
    db.refresh(pet)
    return pet


def get_by_id(db: Session, pet_id: UUID) -> Optional[Pet]:
    stmt = select(Pet).where(Pet.id == pet_id)
    return db.execute(stmt).scalar_one_or_none()


def list_available(
    db: Session, filters: PetFilters, page: int, page_size: int
) -> tuple[list[Pet], int]:
    conditions = [Pet.status == "AVAILABLE"]

    if filters.species:
        conditions.append(Pet.species == filters.species)
    if filters.location:
        conditions.append(Pet.location.ilike(f"%{filters.location}%"))
    if filters.size:
        conditions.append(Pet.size == filters.size)
    if filters.age_group:
        conditions.append(Pet.age_group == filters.age_group)

    where_clause = and_(*conditions)

    count_stmt = select(func.count()).select_from(Pet).where(where_clause)
    total_count = db.execute(count_stmt).scalar_one()

    offset = (page - 1) * page_size
    items_stmt = (
        select(Pet)
        .where(where_clause)
        .order_by(Pet.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    items = list(db.execute(items_stmt).scalars().all())

    return items, total_count


def list_by_publisher(db: Session, publisher_id: UUID) -> list[Pet]:
    stmt = select(Pet).where(Pet.publisher_id == publisher_id)
    return list(db.execute(stmt).scalars().all())


def list_ids_by_publisher(db: Session, publisher_id: UUID) -> list[UUID]:
    stmt = select(Pet.id).where(Pet.publisher_id == publisher_id)
    return list(db.execute(stmt).scalars().all())


def update(db: Session, pet: Pet, data: dict) -> Pet:
    for key, value in data.items():
        setattr(pet, key, value)
    pet.updated_at = datetime.now(timezone.utc)
    db.flush()
    db.refresh(pet)
    return pet


def update_status(db: Session, pet_id: UUID, status: str) -> None:
    stmt = select(Pet).where(Pet.id == pet_id)
    pet = db.execute(stmt).scalar_one_or_none()
    if pet:
        pet.status = status
        pet.updated_at = datetime.now(timezone.utc)
        db.flush()


def delete_by_publisher(db: Session, publisher_id: UUID) -> None:
    stmt = select(Pet).where(Pet.publisher_id == publisher_id)
    pets = db.execute(stmt).scalars().all()
    for pet in pets:
        db.delete(pet)
    db.flush()
