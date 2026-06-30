"""Tests for adoption request endpoints: create, cancel, accept, reject."""

from fastapi.testclient import TestClient

from tests.conftest import create_user


def _create_pet(client: TestClient, headers: dict, **overrides: object) -> dict:
    """Helper to create a pet with default data."""
    data = {
        "name": "Adoptable Pet",
        "species": "DOG",
        "size": "MEDIUM",
        "age_group": "ADULT",
        "location": "Bogota",
        "health_status": "Healthy",
        "description": "Ready for adoption",
    }
    data.update(overrides)
    resp = client.post("/pets/", json=data, headers=headers)
    assert resp.status_code == 201, f"Failed to create pet: {resp.text}"
    return resp.json()


def _create_request(
    client: TestClient, pet_id: str, headers: dict, message: str = "Please adopt!"
) -> dict:
    """Helper to create an adoption request."""
    resp = client.post(
        f"/pets/{pet_id}/requests",
        json={"message": message},
        headers=headers,
    )
    assert resp.status_code == 201, f"Failed to create request: {resp.text}"
    return resp.json()


class TestCreateRequest:
    """Tests for POST /pets/{pet_id}/requests."""

    def test_create_request(
        self, client: TestClient, sample_publisher: dict, sample_adopter: dict
    ) -> None:
        """Adopter can create a request for an available pet."""
        pet = _create_pet(client, sample_publisher["headers"])

        resp = client.post(
            f"/pets/{pet['id']}/requests",
            json={"message": "I would love to adopt!"},
            headers=sample_adopter["headers"],
        )
        assert resp.status_code == 201
        body = resp.json()
        assert body["pet_id"] == pet["id"]
        assert body["adopter_id"] == sample_adopter["id"]
        assert body["publisher_id"] == sample_publisher["id"]
        assert body["status"] == "SENT"
        assert body["message"] == "I would love to adopt!"

    def test_create_request_limit(
        self, client: TestClient, sample_publisher: dict, sample_adopter: dict
    ) -> None:
        """4th active request returns 422 (max 3 active)."""
        # Create 3 pets and 3 requests
        for i in range(3):
            pet = _create_pet(
                client, sample_publisher["headers"], name=f"Pet {i}"
            )
            _create_request(client, pet["id"], sample_adopter["headers"])

        # 4th request should fail
        pet4 = _create_pet(
            client, sample_publisher["headers"], name="Pet 4"
        )
        resp = client.post(
            f"/pets/{pet4['id']}/requests",
            json={"message": "One too many"},
            headers=sample_adopter["headers"],
        )
        assert resp.status_code == 422
        assert "maximum" in resp.json()["detail"].lower()

    def test_create_request_unavailable_pet(
        self, client: TestClient, sample_publisher: dict, sample_adopter: dict
    ) -> None:
        """Cannot request adoption for a non-AVAILABLE pet."""
        pet = _create_pet(client, sample_publisher["headers"])

        # Transition pet to IN_PROCESS
        client.patch(
            f"/pets/{pet['id']}/status",
            json={"status": "IN_PROCESS"},
            headers=sample_publisher["headers"],
        )

        resp = client.post(
            f"/pets/{pet['id']}/requests",
            json={"message": "Too late"},
            headers=sample_adopter["headers"],
        )
        assert resp.status_code == 422
        assert "not available" in resp.json()["detail"].lower()


class TestAcceptRequest:
    """Tests for PATCH /requests/{request_id}/accept."""

    def test_accept_request(
        self, client: TestClient, sample_publisher: dict
    ) -> None:
        """Accepting a request changes pet to IN_PROCESS and waitlists others."""
        pet = _create_pet(client, sample_publisher["headers"])

        # Create two adopters with requests
        adopter1 = create_user(
            client, email="adopter_a1@test.com", role="ADOPTER", name="Adopter A1"
        )
        adopter2 = create_user(
            client, email="adopter_a2@test.com", role="ADOPTER", name="Adopter A2"
        )

        req1 = _create_request(client, pet["id"], adopter1["headers"])
        req2 = _create_request(client, pet["id"], adopter2["headers"])

        # Publisher accepts first request
        resp = client.patch(
            f"/requests/{req1['id']}/accept",
            headers=sample_publisher["headers"],
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "ACCEPTED"

        # Pet should now be IN_PROCESS
        pet_resp = client.get(f"/pets/{pet['id']}")
        assert pet_resp.json()["status"] == "IN_PROCESS"

        # Second request should be WAITLISTED
        mine_resp = client.get("/requests/mine", headers=adopter2["headers"])
        assert mine_resp.status_code == 200
        requests_list = mine_resp.json()
        req2_updated = next(r for r in requests_list if r["id"] == req2["id"])
        assert req2_updated["status"] == "WAITLISTED"


class TestRejectRequest:
    """Tests for PATCH /requests/{request_id}/reject."""

    def test_reject_request(
        self, client: TestClient, sample_publisher: dict, sample_adopter: dict
    ) -> None:
        """Publisher can reject a request."""
        pet = _create_pet(client, sample_publisher["headers"])
        req = _create_request(client, pet["id"], sample_adopter["headers"])

        resp = client.patch(
            f"/requests/{req['id']}/reject",
            headers=sample_publisher["headers"],
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "REJECTED"


class TestCancelRequest:
    """Tests for PATCH /requests/{request_id}/cancel."""

    def test_cancel_request(
        self, client: TestClient, sample_publisher: dict, sample_adopter: dict
    ) -> None:
        """Adopter can cancel their own request."""
        pet = _create_pet(client, sample_publisher["headers"])
        req = _create_request(client, pet["id"], sample_adopter["headers"])

        resp = client.patch(
            f"/requests/{req['id']}/cancel",
            headers=sample_adopter["headers"],
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "CANCELLED"

    def test_cannot_cancel_accepted(
        self, client: TestClient, sample_publisher: dict, sample_adopter: dict
    ) -> None:
        """Cannot cancel a request that has been accepted."""
        pet = _create_pet(client, sample_publisher["headers"])
        req = _create_request(client, pet["id"], sample_adopter["headers"])

        # Publisher accepts the request
        client.patch(
            f"/requests/{req['id']}/accept",
            headers=sample_publisher["headers"],
        )

        # Adopter tries to cancel — should fail
        resp = client.patch(
            f"/requests/{req['id']}/cancel",
            headers=sample_adopter["headers"],
        )
        assert resp.status_code == 422
        assert "cannot cancel" in resp.json()["detail"].lower()
