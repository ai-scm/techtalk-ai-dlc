# Code Summary — Unit 1: Backend API

**Generated**: 2026-06-30
**Stage**: CONSTRUCTION — Code Generation
**Unit**: Backend API
**Location**: `/backend/`

---

## Files Generated (35 total)

### Core Module (5 files)
| File | Lines | Purpose |
|---|---|---|
| `core/__init__.py` | 0 | Package marker |
| `core/config.py` | ~20 | Pydantic Settings (DATABASE_URL, JWT_SECRET, etc.) |
| `core/database.py` | ~25 | SQLAlchemy engine, SessionLocal, Base, get_db |
| `core/security.py` | ~50 | hash_password, verify_password, create/decode JWT |
| `core/exceptions.py` | ~60 | Custom exceptions + FastAPI exception handlers |

### Models (5 files)
| File | Lines | Purpose |
|---|---|---|
| `models/__init__.py` | ~10 | Imports all models for create_all() |
| `models/user.py` | ~35 | User SQLAlchemy model (UUID PK, email, role, etc.) |
| `models/pet.py` | ~55 | Pet model with indexes and relationships |
| `models/photo.py` | ~30 | Photo model (bytea for image data) |
| `models/adoption_request.py` | ~50 | AdoptionRequest with status, FKs, indexes |

### Schemas (5 files)
| File | Lines | Purpose |
|---|---|---|
| `schemas/__init__.py` | 0 | Package marker |
| `schemas/user.py` | ~40 | Register/Login requests, Token/User responses |
| `schemas/pet.py` | ~75 | Pet CRUD schemas + filters + pagination |
| `schemas/photo.py` | ~15 | Photo response schema |
| `schemas/request.py` | ~35 | Adoption request schemas (with contact info) |

### Repositories (5 files)
| File | Lines | Purpose |
|---|---|---|
| `repositories/__init__.py` | 0 | Package marker |
| `repositories/user_repository.py` | ~30 | User CRUD operations |
| `repositories/pet_repository.py` | ~80 | Pet queries + filters + pagination |
| `repositories/photo_repository.py` | ~35 | Photo CRUD + count |
| `repositories/adoption_request_repository.py` | ~140 | Full request lifecycle + bulk ops |

### Services (4 files)
| File | Lines | Purpose |
|---|---|---|
| `services/__init__.py` | 0 | Package marker |
| `services/auth_service.py` | ~110 | Register, authenticate, JWT, delete cascade |
| `services/pet_service.py` | ~190 | Pet CRUD, photos, status transitions |
| `services/adoption_service.py` | ~170 | Request lifecycle, accept/reject/waitlist |

### Routers (4 files)
| File | Lines | Purpose |
|---|---|---|
| `routers/__init__.py` | 0 | Package marker |
| `routers/users.py` | ~45 | Auth endpoints (register, login, me, delete) |
| `routers/pets.py` | ~150 | Pet CRUD + photos + photo serving |
| `routers/requests.py` | ~120 | Adoption request lifecycle |

### Application Entry (2 files)
| File | Lines | Purpose |
|---|---|---|
| `main.py` | ~40 | FastAPI app, routers, startup, /health |
| `seed.py` | ~180 | Idempotent seed (5 users, 8 pets, 12 photos, 10 requests) |

### Infrastructure (4 files)
| File | Lines | Purpose |
|---|---|---|
| `Dockerfile` | ~15 | python:3.11-slim + deps |
| `manifests/deployment.yml` | ~55 | K8s Deployment (probes, env, security) |
| `manifests/service.yml` | ~12 | K8s Service (ClusterIP:8000) |
| `garden.yml` | ~50 | Garden Build + Deploy + Test + Sync |

### Tests (5 files)
| File | Lines | Purpose |
|---|---|---|
| `tests/__init__.py` | 0 | Package marker |
| `tests/conftest.py` | ~80 | Fixtures (SQLite in-memory, TestClient, helpers) |
| `tests/test_auth.py` | ~100 | Auth flow tests (register, login, delete) |
| `tests/test_pets.py` | ~160 | Pet CRUD + photos + status tests |
| `tests/test_adoption_requests.py` | ~150 | Request lifecycle tests |

### Project-Level (2 files)
| File | Lines | Purpose |
|---|---|---|
| `project.garden.yml` | ~63 | Garden project config + PostgreSQL Helm deploy |
| `.gitignore` (updated) | +11 | Added Python + Garden entries |

---

## API Endpoints Summary

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | /users/register | No | Register new user |
| POST | /users/login | No | Authenticate, get JWT |
| GET | /users/me | Yes | Get current user profile |
| DELETE | /users/me | Yes | Delete account (cascade) |
| GET | /pets | No | List available pets (paginated, filterable) |
| GET | /pets/mine | Yes | List my published pets |
| GET | /pets/{id} | No | Pet detail with photos |
| POST | /pets | Yes (Pub/Found) | Create pet |
| PUT | /pets/{id} | Yes (owner) | Update pet |
| PATCH | /pets/{id}/status | Yes (owner) | Change pet status |
| POST | /pets/{id}/photos | Yes (owner) | Upload photo |
| DELETE | /pets/{id}/photos/{pid} | Yes (owner) | Delete photo |
| GET | /pets/{id}/photos/{pid} | No | Serve photo image |
| POST | /pets/{id}/requests | Yes (Adopter) | Send adoption request |
| GET | /requests/mine | Yes | My sent requests |
| PATCH | /requests/{id}/cancel | Yes (adopter) | Cancel request |
| GET | /pets/{id}/requests | Yes (owner) | Requests for my pet |
| PATCH | /requests/{id}/review | Yes (owner) | Mark in review |
| PATCH | /requests/{id}/accept | Yes (owner) | Accept request |
| PATCH | /requests/{id}/reject | Yes (owner) | Reject request |
| GET | /health | No | Health check |

---

## Running Locally

```bash
# 1. Start minikube
minikube start --addons=ingress

# 2. Point Docker to minikube
eval $(minikube -p minikube docker-env)

# 3. Start development
garden dev

# 4. Access
# Backend: http://backend:8000 (internal, via BFF only)
# Health: kubectl port-forward svc/backend 8000:8000, then http://localhost:8000/health
```
