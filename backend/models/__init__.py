"""SQLAlchemy models package. Import all models so Base.metadata.create_all picks them up."""

from models.adoption_request import AdoptionRequest
from models.pet import Pet
from models.photo import Photo
from models.user import User

__all__ = ["User", "Pet", "Photo", "AdoptionRequest"]
