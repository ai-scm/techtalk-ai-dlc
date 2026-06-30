"""Photo schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PhotoResponse(BaseModel):
    """Schema for photo response."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    pet_id: uuid.UUID
    filename: str
    content_type: str
    size_bytes: int
    created_at: datetime
