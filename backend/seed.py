"""Idempotent database seed script for development."""

import base64
from uuid import uuid4

from sqlalchemy.orm import Session

from core.security import hash_password
from models.adoption_request import AdoptionRequest
from models.pet import Pet
from models.photo import Photo
from models.user import User

# Minimal valid 1x1 transparent PNG (67 bytes)
PLACEHOLDER_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4"
    "nGNgYPgPAAEDAQAIicLsAAAAAElFTkSuQmCC"
)


def seed_database(db: Session) -> None:
    """Seed database with demo data if the users table is empty.

    This function is idempotent — it only inserts data when no users exist.
    """
    existing_count = db.query(User).count()
    if existing_count > 0:
        return

    # --- Users ---
    hashed = hash_password("password123")

    adopter1 = User(
        id=uuid4(),
        email="adopter1@test.com",
        password_hash=hashed,
        role="ADOPTER",
        name="Adopter One",
    )
    adopter2 = User(
        id=uuid4(),
        email="adopter2@test.com",
        password_hash=hashed,
        role="ADOPTER",
        name="Adopter Two",
    )
    publisher1 = User(
        id=uuid4(),
        email="publisher1@test.com",
        password_hash=hashed,
        role="PUBLISHER",
        name="Publisher One",
    )
    publisher2 = User(
        id=uuid4(),
        email="publisher2@test.com",
        password_hash=hashed,
        role="PUBLISHER",
        name="Publisher Two",
    )
    foundation1 = User(
        id=uuid4(),
        email="foundation1@test.com",
        password_hash=hashed,
        role="FOUNDATION",
        name="Foundation One",
    )

    users = [adopter1, adopter2, publisher1, publisher2, foundation1]
    db.add_all(users)
    db.flush()

    # --- Pets (4 from publisher1, 4 from foundation1) ---
    pet1 = Pet(
        id=uuid4(),
        publisher_id=publisher1.id,
        name="Rocky",
        species="DOG",
        size="LARGE",
        age_group="ADULT",
        location="Bogota",
        health_status="Vaccinated and neutered",
        description="Friendly golden retriever looking for a home",
        status="AVAILABLE",
    )
    pet2 = Pet(
        id=uuid4(),
        publisher_id=publisher1.id,
        name="Mishi",
        species="CAT",
        size="SMALL",
        age_group="YOUNG",
        location="Medellin",
        health_status="All vaccines up to date",
        description="Playful tabby cat, great with kids",
        status="AVAILABLE",
    )
    pet3 = Pet(
        id=uuid4(),
        publisher_id=publisher1.id,
        name="Kiwi",
        species="BIRD",
        size="SMALL",
        age_group="ADULT",
        location="Cali",
        health_status="Healthy",
        description="Beautiful green parakeet, loves to sing",
        status="IN_PROCESS",
    )
    pet4 = Pet(
        id=uuid4(),
        publisher_id=publisher1.id,
        name="Toby",
        species="DOG",
        size="MEDIUM",
        age_group="PUPPY",
        location="Bogota",
        health_status="First round of vaccines",
        description="Energetic mixed breed puppy",
        status="AVAILABLE",
    )
    pet5 = Pet(
        id=uuid4(),
        publisher_id=foundation1.id,
        name="Luna",
        species="CAT",
        size="MEDIUM",
        age_group="SENIOR",
        location="Medellin",
        health_status="Chronic condition managed with medication",
        description="Calm senior cat, perfect companion",
        status="AVAILABLE",
    )
    pet6 = Pet(
        id=uuid4(),
        publisher_id=foundation1.id,
        name="Cotton",
        species="RABBIT",
        size="SMALL",
        age_group="YOUNG",
        location="Bogota",
        health_status="Healthy and spayed",
        description="Fluffy white rabbit, very gentle",
        status="AVAILABLE",
    )
    pet7 = Pet(
        id=uuid4(),
        publisher_id=foundation1.id,
        name="Max",
        species="DOG",
        size="LARGE",
        age_group="ADULT",
        location="Cali",
        health_status="Fully vaccinated",
        description="Loyal german shepherd mix",
        status="IN_PROCESS",
    )
    pet8 = Pet(
        id=uuid4(),
        publisher_id=foundation1.id,
        name="Milo",
        species="CAT",
        size="SMALL",
        age_group="PUPPY",
        location="Medellin",
        health_status="Vaccinated, dewormed",
        description="Tiny orange kitten full of energy",
        status="ADOPTED",
    )

    pets = [pet1, pet2, pet3, pet4, pet5, pet6, pet7, pet8]
    db.add_all(pets)
    db.flush()

    # --- Photos (12 total, 1-3 per pet) ---
    photo_assignments = [
        (pet1, 2),
        (pet2, 1),
        (pet3, 2),
        (pet4, 1),
        (pet5, 2),
        (pet6, 1),
        (pet7, 1),
        (pet8, 2),
    ]

    photos = []
    for pet, count in photo_assignments:
        for i in range(count):
            photo = Photo(
                id=uuid4(),
                pet_id=pet.id,
                data=PLACEHOLDER_PNG,
                filename=f"{pet.name.lower()}_{i + 1}.png",
                content_type="image/png",
                size_bytes=len(PLACEHOLDER_PNG),
            )
            photos.append(photo)

    db.add_all(photos)
    db.flush()

    # --- Adoption Requests (10 total, mixed statuses) ---
    requests_data = [
        # 3 SENT
        (adopter1, pet1, "SENT", "I love dogs and have a big yard!"),
        (adopter1, pet2, "SENT", "Looking for a companion cat"),
        (adopter2, pet4, "SENT", "We have experience with puppies"),
        # 2 IN_REVIEW
        (adopter2, pet1, "IN_REVIEW", "My family would love Rocky"),
        (adopter1, pet6, "IN_REVIEW", "Always wanted a rabbit"),
        # 1 ACCEPTED
        (adopter1, pet3, "ACCEPTED", "I have experience with birds"),
        # 2 WAITLISTED
        (adopter2, pet3, "WAITLISTED", "Would love Kiwi if available"),
        (adopter2, pet7, "WAITLISTED", "Great with large dogs"),
        # 1 REJECTED
        (adopter2, pet5, "REJECTED", "Would like to adopt Luna"),
        # 1 CANCELLED
        (adopter1, pet5, "CANCELLED", "Changed my mind, sorry"),
    ]

    adoption_requests = []
    for adopter, pet, status, message in requests_data:
        req = AdoptionRequest(
            id=uuid4(),
            pet_id=pet.id,
            adopter_id=adopter.id,
            publisher_id=pet.publisher_id,
            status=status,
            message=message,
        )
        adoption_requests.append(req)

    db.add_all(adoption_requests)
    db.commit()
