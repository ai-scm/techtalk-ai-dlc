"""Pet SQLAlchemy model."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base


class Pet(Base):
    """Pet listing model for adoption."""

    __tablename__ = "pets"
    __table_args__ = (
        Index("ix_pets_status_species", "status", "species"),
        Index("ix_pets_status_location", "status", "location"),
        Index("ix_pets_status_created_at", "status", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    publisher_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(
        String(100), nullable=False
    )
    species: Mapped[str] = mapped_column(
        String(20), nullable=False
    )
    size: Mapped[str] = mapped_column(
        String(20), nullable=False
    )
    age_group: Mapped[str] = mapped_column(
        String(20), nullable=False
    )
    location: Mapped[str] = mapped_column(
        String(100), nullable=False
    )
    health_status: Mapped[str] = mapped_column(
        String(255), nullable=False
    )
    description: Mapped[str] = mapped_column(
        Text, nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="AVAILABLE"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    publisher = relationship("User", back_populates="pets")
    photos = relationship("Photo", back_populates="pet", cascade="all, delete-orphan")
    adoption_requests = relationship(
        "AdoptionRequest", back_populates="pet", cascade="all, delete-orphan"
    )
