"""User SQLAlchemy model."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base


class User(Base):
    """User account model for the dog keeper application."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False
    )
    password_hash: Mapped[str] = mapped_column(
        String(255), nullable=False
    )
    role: Mapped[str] = mapped_column(
        String(20), nullable=False
    )
    name: Mapped[str] = mapped_column(
        String(100), nullable=False
    )
    phone: Mapped[str | None] = mapped_column(
        String(20), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    pets = relationship("Pet", back_populates="publisher", cascade="all, delete-orphan")
    adoption_requests = relationship(
        "AdoptionRequest",
        back_populates="adopter",
        foreign_keys="AdoptionRequest.adopter_id",
        cascade="all, delete-orphan",
    )
