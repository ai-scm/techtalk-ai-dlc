from typing import Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from models.photo import Photo


def create(db: Session, photo: Photo) -> Photo:
    db.add(photo)
    db.flush()
    db.refresh(photo)
    return photo


def get_by_pet(db: Session, pet_id: UUID) -> list[Photo]:
    stmt = select(Photo).where(Photo.pet_id == pet_id)
    return list(db.execute(stmt).scalars().all())


def count_by_pet(db: Session, pet_id: UUID) -> int:
    stmt = select(func.count()).select_from(Photo).where(Photo.pet_id == pet_id)
    return db.execute(stmt).scalar_one()


def delete(db: Session, photo_id: UUID) -> None:
    stmt = select(Photo).where(Photo.id == photo_id)
    photo = db.execute(stmt).scalar_one_or_none()
    if photo:
        db.delete(photo)
        db.flush()


def delete_by_pet(db: Session, pet_id: UUID) -> None:
    stmt = select(Photo).where(Photo.pet_id == pet_id)
    photos = db.execute(stmt).scalars().all()
    for photo in photos:
        db.delete(photo)
    db.flush()
