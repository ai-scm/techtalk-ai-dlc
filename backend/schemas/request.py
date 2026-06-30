"""Adoption request schemas."""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class CreateAdoptionRequest(BaseModel):
    """Schema for creating an adoption request."""

    message: Optional[str] = Field(default=None, max_length=500)


class AdoptionRequestResponse(BaseModel):
    """Schema for adoption request response."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    pet_id: uuid.UUID
    adopter_id: uuid.UUID
    publisher_id: uuid.UUID
    status: str
    message: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class AdoptionRequestDetailResponse(AdoptionRequestResponse):
    """Schema for detailed adoption request response.

    adopter_email, adopter_phone, and adopter_name are populated
    only when the request status is ACCEPTED.
    """

    adopter_email: Optional[str] = None
    adopter_phone: Optional[str] = None
    adopter_name: Optional[str] = None
