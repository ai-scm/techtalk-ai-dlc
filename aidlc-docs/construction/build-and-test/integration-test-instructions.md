# Integration Test Instructions — Dog Keeper Platform

**Generated**: 2026-07-07
**Stage**: CONSTRUCTION — Build and Test

---

## Purpose

Test the complete interaction chain: Frontend → BFF → Backend → PostgreSQL

---

## Prerequisites

- All services deployed locally via `garden deploy`
- PostgreSQL running with seed data

---

## Setup Integration Test Environment

```bash
# 1. Start Minikube
minikube start --addons=ingress

# 2. Point Docker to Minikube
eval $(minikube -p minikube docker-env)

# 3. Deploy all services
garden deploy

# 4. Wait for all pods to be ready
garden get status
```

---

## Run Integration Tests

```bash
# Run integration test suite (requires all services running)
garden test integration-tests
```

---

## Test Scenarios

### Scenario 1: Auth Flow (Register → Login)
- POST /api/auth/register → Creates user in DB
- POST /api/auth/login → Returns JWT token
- GET /api/users/me → Returns user profile with valid token

### Scenario 2: Pet Publishing Flow
- POST /api/pets → Creates pet (publisher role)
- GET /api/pets → Pet appears in catalog
- POST /api/pets/{id}/photos → Photo uploaded
- GET /api/pets/{id} → Pet detail with photo

### Scenario 3: Adoption Request Flow
- POST /api/requests → Adopter sends request
- GET /api/pets/{id}/requests → Publisher sees request
- PATCH /api/requests/{id}/accept → Request accepted
- GET /api/requests/mine → Adopter sees accepted status

### Scenario 4: Service Communication
- Frontend → BFF (HTTP via Ingress `/api`)
- BFF → Backend (HTTP internal `http://backend:8000`)
- Backend → PostgreSQL (SQL via `db:5432`)

### Scenario 5: Health Endpoints
- GET /health (backend:8000) → 200
- GET /health (bff:8001) → 200
- GET / (frontend:3000) → 200

---

## Integration Test Location

```
integration-tests/
├── garden.yaml              # Build + Test config
├── Dockerfile               # Python test runner
├── requirements.txt         # pytest, requests
├── conftest.py              # Shared fixtures
├── pytest.ini               # pytest config
├── test_service_health.py   # Health checks
├── test_auth_flow.py        # Auth scenarios
├── test_pet_publishing.py   # Publishing scenarios
├── test_adoption_flow.py    # Adoption scenarios
└── test_service_comm.py     # Inter-service communication
```

---

## Expected Results

| Scenario | Expected |
|---|---|
| Auth Flow | User created, JWT returned, profile accessible |
| Pet Publishing | Pet in catalog, photos attached |
| Adoption Flow | Request lifecycle (SENT → ACCEPTED) |
| Service Comms | All services reachable via K8s DNS |
| Health Checks | All 3 services return 200 |

---

## Cleanup

```bash
# Stop all services
garden cleanup namespace

# Or just stop minikube
minikube stop
```
