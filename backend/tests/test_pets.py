"""Tests for pet endpoints: CRUD, photos, and status changes."""

import io

from fastapi.testclient import TestClient

from tests.conftest import create_user

# Minimal valid 1x1 PNG for photo upload tests
VALID_PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
    b"\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00"
    b"\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00"
    b"\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
)


def _create_pet(client: TestClient, headers: dict, **overrides: object) -> dict:
    """Helper to create a pet with default data."""
    data = {
        "name": "Test Pet",
        "species": "DOG",
        "size": "MEDIUM",
        "age_group": "ADULT",
        "location": "Bogota",
        "health_status": "Healthy",
        "description": "A lovely test pet",
    }
    data.update(overrides)
    resp = client.post("/pets", json=data, headers=headers)
    assert resp.status_code == 201, f"Failed to create pet: {resp.text}"
    return resp.json()


class TestCreatePet:
    """Tests for POST /pets/."""

    def test_create_pet_publisher(
        self, client: TestClient, sample_publisher: dict
    ) -> None:
        """Publisher can create a pet, returns 201 with correct fields."""
        data = {
            "name": "Buddy",
            "species": "DOG",
            "size": "LARGE",
            "age_group": "PUPPY",
            "location": "Medellin",
            "health_status": "Vaccinated",
            "description": "Friendly puppy looking for home",
        }
        resp = client.post("/pets", json=data, headers=sample_publisher["headers"])

        assert resp.status_code == 201
        body = resp.json()
        assert body["name"] == "Buddy"
        assert body["species"] == "DOG"
        assert body["size"] == "LARGE"
        assert body["age_group"] == "PUPPY"
        assert body["location"] == "Medellin"
        assert body["status"] == "AVAILABLE"
        assert body["publisher_id"] == sample_publisher["id"]
        assert "id" in body
        assert "created_at" in body

    def test_create_pet_adopter_forbidden(
        self, client: TestClient, sample_adopter: dict
    ) -> None:
        """Adopter cannot create a pet, returns 403."""
        data = {
            "name": "Nope",
            "species": "CAT",
            "size": "SMALL",
            "age_group": "YOUNG",
            "location": "Cali",
            "health_status": "Healthy",
            "description": "Should not be created",
        }
        resp = client.post("/pets", json=data, headers=sample_adopter["headers"])
        assert resp.status_code == 403


class TestListPets:
    """Tests for GET /pets/."""

    def test_list_pets(self, client: TestClient, sample_publisher: dict) -> None:
        """List pets returns paginated results."""
        # Create some pets
        for i in range(3):
            _create_pet(
                client, sample_publisher["headers"], name=f"Pet {i}"
            )

        resp = client.get("/pets")
        assert resp.status_code == 200
        body = resp.json()
        assert "items" in body
        assert "total" in body
        assert "page" in body
        assert "page_size" in body
        assert body["total"] == 3
        assert len(body["items"]) == 3

    def test_filter_by_species(
        self, client: TestClient, sample_publisher: dict
    ) -> None:
        """Filter pets by species returns only matching results."""
        _create_pet(client, sample_publisher["headers"], name="Dog1", species="DOG")
        _create_pet(client, sample_publisher["headers"], name="Dog2", species="DOG")
        _create_pet(client, sample_publisher["headers"], name="Cat1", species="CAT")

        resp = client.get("/pets", params={"species": "DOG"})
        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] == 2
        assert all(item["species"] == "DOG" for item in body["items"])


class TestPetDetail:
    """Tests for GET /pets/{pet_id}."""

    def test_get_pet_detail(
        self, client: TestClient, sample_publisher: dict
    ) -> None:
        """Get pet detail returns full info including photos list."""
        pet = _create_pet(client, sample_publisher["headers"])

        resp = client.get(f"/pets/{pet['id']}")
        assert resp.status_code == 200
        body = resp.json()
        assert body["id"] == pet["id"]
        assert body["name"] == pet["name"]
        assert "photos" in body
        assert isinstance(body["photos"], list)


class TestUpdatePet:
    """Tests for PUT /pets/{pet_id}."""

    def test_update_pet(self, client: TestClient, sample_publisher: dict) -> None:
        """Owner can update pet fields."""
        pet = _create_pet(client, sample_publisher["headers"], name="Original")

        update_data = {
            "name": "Updated Name",
            "location": "Cali",
        }
        resp = client.put(
            f"/pets/{pet['id']}", json=update_data, headers=sample_publisher["headers"]
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["name"] == "Updated Name"
        assert body["location"] == "Cali"


class TestPhotos:
    """Tests for photo upload and limits."""

    def test_upload_photo(self, client: TestClient, sample_publisher: dict) -> None:
        """Upload a valid PNG returns 201."""
        pet = _create_pet(client, sample_publisher["headers"])

        file = ("file", ("test.png", io.BytesIO(VALID_PNG), "image/png"))
        resp = client.post(
            f"/pets/{pet['id']}/photos",
            files=[file],
            headers=sample_publisher["headers"],
        )
        assert resp.status_code == 201
        body = resp.json()
        assert body["filename"] == "test.png"
        assert body["content_type"] == "image/png"
        assert body["pet_id"] == pet["id"]

    def test_upload_photo_limit(
        self, client: TestClient, sample_publisher: dict
    ) -> None:
        """Uploading a 4th photo returns 422."""
        pet = _create_pet(client, sample_publisher["headers"])

        # Upload 3 photos (max)
        for i in range(3):
            file = ("file", (f"photo{i}.png", io.BytesIO(VALID_PNG), "image/png"))
            resp = client.post(
                f"/pets/{pet['id']}/photos",
                files=[file],
                headers=sample_publisher["headers"],
            )
            assert resp.status_code == 201, f"Upload {i + 1} failed: {resp.text}"

        # 4th should fail
        file = ("file", ("photo4.png", io.BytesIO(VALID_PNG), "image/png"))
        resp = client.post(
            f"/pets/{pet['id']}/photos",
            files=[file],
            headers=sample_publisher["headers"],
        )
        assert resp.status_code == 422
        assert "maximum" in resp.json()["detail"].lower()


class TestStatusChange:
    """Tests for PATCH /pets/{pet_id}/status."""

    def test_change_status_to_adopted(
        self, client: TestClient, sample_publisher: dict
    ) -> None:
        """Pet in IN_PROCESS can be marked ADOPTED."""
        pet = _create_pet(client, sample_publisher["headers"])

        # First transition: AVAILABLE -> IN_PROCESS
        resp = client.patch(
            f"/pets/{pet['id']}/status",
            json={"status": "IN_PROCESS"},
            headers=sample_publisher["headers"],
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "IN_PROCESS"

        # Second transition: IN_PROCESS -> ADOPTED
        resp = client.patch(
            f"/pets/{pet['id']}/status",
            json={"status": "ADOPTED"},
            headers=sample_publisher["headers"],
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "ADOPTED"
