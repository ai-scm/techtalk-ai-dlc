# Code Generation Plan — Unit 1: Backend API

**Stage**: CONSTRUCTION — Code Generation
**Date**: 2026-06-30
**Unit**: Backend API
**Workspace Root**: `/home/nuvu/Documents/arch/varios/techtalks/techtalk-ai-dlc`
**Code Target**: `/backend/` (NEVER in aidlc-docs/)

---

## Unit Context

- **Technology**: Python 3.12, FastAPI, SQLAlchemy, Pydantic, bcrypt, PyJWT
- **Port**: 8000
- **DB**: PostgreSQL (connection via SQLAlchemy)
- **Structure**: 3 capas (Routers → Services → Repositories)
- **Stories**: All 22 (primary logic owner)
- **Dependencies**: PostgreSQL (deploy.db must be running)

---

## Execution Plan

### Step 1: Project Structure Setup
- [x] Create `/backend/` directory structure
- [x] Create `requirements.txt` (production dependencies)
- [x] Create `requirements-dev.txt` (test dependencies)
- [x] Create `main.py` (FastAPI app entrypoint + startup event)

### Step 2: Core Module
- [x] Create `core/__init__.py`
- [x] Create `core/config.py` (Settings with env vars: DATABASE_URL, JWT_SECRET, etc.)
- [x] Create `core/database.py` (SQLAlchemy engine, SessionLocal, Base, get_db dependency)
- [x] Create `core/security.py` (hash_password, verify_password, create_token, decode_token)
- [x] Create `core/exceptions.py` (NotFoundError, ForbiddenError, ValidationError, ConflictError, AuthenticationError)

### Step 3: SQLAlchemy Models
- [x] Create `models/__init__.py` (import all models for create_all)
- [x] Create `models/user.py` (User model: id, email, password_hash, role, name, phone, created_at)
- [x] Create `models/pet.py` (Pet model: id, publisher_id, name, species, size, age_group, location, health_status, description, status, created_at, updated_at)
- [x] Create `models/photo.py` (Photo model: id, pet_id, data, filename, content_type, size_bytes, created_at)
- [x] Create `models/adoption_request.py` (AdoptionRequest model: id, pet_id, adopter_id, publisher_id, status, message, created_at, updated_at)

### Step 4: Pydantic Schemas
- [x] Create `schemas/__init__.py`
- [x] Create `schemas/user.py` (RegisterRequest, LoginRequest, TokenResponse, UserResponse)
- [x] Create `schemas/pet.py` (CreatePetRequest, UpdatePetRequest, PetResponse, PetDetailResponse, PetFilters, StatusUpdateRequest, PaginatedResponse)
- [x] Create `schemas/photo.py` (PhotoResponse)
- [x] Create `schemas/request.py` (CreateAdoptionRequest, AdoptionRequestResponse, AdoptionRequestDetailResponse)

### Step 5: Repositories
- [x] Create `repositories/__init__.py`
- [x] Create `repositories/user_repository.py` (create, get_by_id, get_by_email, delete)
- [x] Create `repositories/pet_repository.py` (create, get_by_id, list_available, list_by_publisher, list_ids_by_publisher, update, update_status, delete_by_publisher)
- [x] Create `repositories/photo_repository.py` (create, get_by_pet, count_by_pet, delete, delete_by_pet)
- [x] Create `repositories/adoption_request_repository.py` (create, get_by_id, list_by_adopter, list_by_pet, count_active_by_adopter, exists_active, exists_accepted_for_pet, update_status, waitlist_pending_for_pet, cancel_accepted_for_pet, reactivate_waitlisted_for_pet, cancel_by_adopter, cancel_by_pet_ids)

### Step 6: Services (Business Logic)
- [x] Create `services/__init__.py`
- [x] Create `services/auth_service.py` (register_user, authenticate, get_current_user dependency, delete_user)
- [x] Create `services/pet_service.py` (create_pet, list_available_pets, get_pet, update_pet, change_status, upload_photo, delete_photo, delete_pets_by_user)
- [x] Create `services/adoption_service.py` (create_request, get_adopter_requests, cancel_request, get_pet_requests, review_request, accept_request, reject_request, cancel_requests_by_adopter, cancel_requests_for_pets)

### Step 7: Routers (API Endpoints)
- [x] Create `routers/__init__.py`
- [x] Create `routers/users.py` (POST /users/register, POST /users/login, GET /users/me, DELETE /users/me)
- [x] Create `routers/pets.py` (GET /pets, GET /pets/{id}, POST /pets, PUT /pets/{id}, PATCH /pets/{id}/status, GET /pets/mine, POST /pets/{id}/photos, DELETE /pets/{id}/photos/{photo_id})
- [x] Create `routers/requests.py` (POST /pets/{id}/requests, GET /requests/mine, PATCH /requests/{id}/cancel, GET /pets/{id}/requests, PATCH /requests/{id}/review, PATCH /requests/{id}/accept, PATCH /requests/{id}/reject)

### Step 8: Seed Script
- [x] Create `seed.py` (idempotent seed: 5 users, 8 pets, 12 photos, 10 adoption requests)

### Step 9: Infrastructure Files
- [x] Create `Dockerfile`
- [x] Create `manifests/deployment.yml`
- [x] Create `manifests/service.yml`
- [x] Create `garden.yml` (Build + Deploy + Test + Sync)

### Step 10: Unit Tests
- [x] Create `tests/__init__.py`
- [x] Create `tests/conftest.py` (test fixtures: test DB, test client, test users)
- [x] Create `tests/test_auth.py` (register, login, invalid credentials, delete account)
- [x] Create `tests/test_pets.py` (create, list, filter, detail, update, status transitions, photos)
- [x] Create `tests/test_adoption_requests.py` (create, limits, accept, reject, cancel, waitlist)

### Step 11: Project-Level Files
- [x] Create `project.garden.yml` (Garden project config with DB Helm deploy)
- [x] Create/update `.gitignore` for Python backend

### Step 12: Documentation Summary
- [x] Create `aidlc-docs/construction/backend-api/code/code-summary.md` (summary of generated files)

---

## Story Traceability

| Step | Stories Implemented |
|---|---|
| Steps 2-3 | Foundation for all 22 stories |
| Step 4 | API contracts for all stories |
| Step 5 | Data access for all stories |
| Step 6 (auth_service) | US-01, US-02, US-21, US-22 |
| Step 6 (pet_service) | US-03, US-04, US-05, US-06, US-07, US-08, US-09, US-10, US-11, US-19, US-20 |
| Step 6 (adoption_service) | US-12, US-13, US-14, US-15, US-16, US-17, US-18 |
| Step 7 | HTTP layer for all 22 stories |
| Step 8 | Dev experience (all stories testable manually) |
| Step 9 | Deployment infra |
| Step 10 | Quality assurance (all business rules tested) |

---

## Notes

- All code goes in `/backend/` at workspace root (NEVER in aidlc-docs/)
- Garden project config goes in workspace root (`project.garden.yml`)
- Documentation summary goes in `aidlc-docs/construction/backend-api/code/`
- Tests will be verified in Build & Test phase (not executed during code generation)
