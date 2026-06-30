"""AdoptionRequest SQLAlchemy model."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base


class AdoptionRequest(Base):
    """Adoption request linking an adopter to a pet listing."""

    __tablename__ = "adoption_requests"
    __table_args__ = (
        Index("ix_adoption_requests_pet_id", "pet_id"),
        Index("ix_adoption_requests_adopter_id", "adopter_id"),
        Index("ix_adoption_requests_publisher_id", "publisher_id"),
        UniqueConstraint("adopter_id", "pet_id", name="uq_adopter_pet_active"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    pet_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("pets.id", ondelete="CASCADE"), nullable=False
    )
    adopter_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    publisher_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="SENT"
    )
    message: Mapped[str | None] = mapped_column(
        Text, nullable=True
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
    pet = relationship("Pet", back_populates="adoption_requests")
    adopter = relationship(
        "User", back_populates="adoption_requests", foreign_keys=[adopter_id]
    )
    publisher = relationship("User", foreign_keys=[publisher_id])
