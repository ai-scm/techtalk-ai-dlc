from typing import Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from models.user import User


def create(db: Session, user: User) -> User:
    db.add(user)
    db.flush()
    db.refresh(user)
    return user


def get_by_id(db: Session, user_id: UUID) -> Optional[User]:
    stmt = select(User).where(User.id == user_id)
    return db.execute(stmt).scalar_one_or_none()


def get_by_email(db: Session, email: str) -> Optional[User]:
    stmt = select(User).where(func.lower(User.email) == func.lower(email))
    return db.execute(stmt).scalar_one_or_none()


def delete(db: Session, user_id: UUID) -> None:
    stmt = select(User).where(User.id == user_id)
    user = db.execute(stmt).scalar_one_or_none()
    if user:
        db.delete(user)
        db.flush()
