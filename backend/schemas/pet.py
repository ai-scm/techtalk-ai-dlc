"""Pet schemas for CRUD and listing."""

import uuid
from datetime import datetime
from typing import Generic, Literal, Optional, TypeVar

from pydantic import BaseModel, ConfigDict, Field

from schemas.photo import PhotoResponse

T = TypeVar("T")


class CreatePetRequest(BaseModel):
    """Schema for creating a pet listing."""

    name: str = Field(max_length=100)
    species: Literal["DOG", "CAT", "BIRD", "RABBIT", "OTHER"]
    size: Literal["SMALL", "MEDIUM", "LARGE"]
    age_group: Literal["PUPPY", "YOUNG", "ADULT", "SENIOR"]
    location: str = Field(max_length=100)
    health_status: str = Field(max_length=255)
    description: str


class UpdatePetRequest(BaseModel):
    """Schema for updating a pet listing. All fields optional."""

    name: Optional[str] = Field(default=None, max_length=100)
    species: Optional[Literal["DOG", "CAT", "BIRD", "RABBIT", "OTHER"]] = None
    size: Optional[Literal["SMALL", "MEDIUM", "LARGE"]] = None
    age_group: Optional[Literal["PUPPY", "YOUNG", "ADULT", "SENIOR"]] = None
    location: Optional[str] = Field(default=None, max_length=100)
    health_status: Optional[str] = Field(default=None, max_length=255)
    description: Optional[str] = None


class StatusUpdateRequest(BaseModel):
    """Schema for updating pet adoption status."""

    status: Literal["AVAILABLE", "IN_PROCESS", "ADOPTED"]


class PetResponse(BaseModel):
    """Schema for pet response."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    publisher_id: uuid.UUID
    name: str
    species: str
    size: str
    age_group: str
    location: str
    health_status: str
    description: str
    status: str
    created_at: datetime
    updated_at: datetime


class PetDetailResponse(PetResponse):
    """Schema for pet detail response including photos."""

    photos: list[PhotoResponse] = []


class PetFilters(BaseModel):
    """Schema for pet listing filters."""

    species: Optional[str] = None
    location: Optional[str] = None
    size: Optional[str] = None
    age_group: Optional[str] = None


class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response schema."""

    items: list[T]
    total: int
    page: int
    page_size: int
