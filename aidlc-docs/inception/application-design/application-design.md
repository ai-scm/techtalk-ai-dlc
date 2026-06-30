# Application Design — App de Adopción de Mascotas (Consolidated)

**Generated**: 2026-06-30 (rev. 2 — BFF introduced)
**Stage**: INCEPTION — Application Design

---

## Architecture Overview

```
+------------------+     HTTPS/REST      +------------------+     HTTP/REST      +------------------+     SQL/TCP      +------------------+
|                  | -----------------> |                  | ----------------> |                  | --------------> |                  |
|    Frontend      |      /api/*        |       BFF        |    internal       |   Backend API    |                 |   PostgreSQL     |
|  React + TS +    | <----------------- | FastAPI (proxy)  | <---------------- |  FastAPI + SA +  | <-------------- |                  |
|  Tailwind        |     JSON           |   port 8001      |     JSON          |  Pydantic        |    Results       |  Users, Pets,    |
|                  |                    |                  |                   |   port 8000      |                 |  Requests, Photos|
+------------------+                    +------------------+                   +------------------+                 +------------------+
       |                                                                              
       v                                                                              
 S3 + CloudFront                                                                      
 (static hosting)                                                                     
```

**Key Rule**: Frontend NEVER talks directly to Backend API. All traffic goes through the BFF (`/api/*`).

---

## Technical Stack (Updated — rev. 2)

| Layer | Technology | Notes |
|---|---|---|
| **Frontend** | TypeScript 5.x + React + Tailwind CSS | State: React hooks nativos. Org: por feature. Calls only BFF. |
| **BFF** | Python 3.12 + FastAPI | Proxy + auth orchestration + response adaptation. Port 8001. |
| **Backend** | Python 3.12 + FastAPI + Pydantic + SQLAlchemy | 3 capas: Routers → Services → Repositories. Port 8000. |
| **Database** | PostgreSQL | Única DB: users, pets, requests, photos (bytea) |
| **Auth** | bcrypt (hashing) + PyJWT (tokens) | Propio: email+password, JWT stateless |
| **Compute** | AWS Lambda + API Gateway | Backend + BFF serverless |
| **Frontend Hosting** | S3 + CloudFront | SPA estática |
| **IaC** | TypeScript + AWS CDK | RDS, Lambda x2, API GW, S3, CloudFront |

---

## Design Decisions Summary

| Decision | Choice | Rationale |
|---|---|---|
| BFF pattern | Sí — BFF entre Frontend y Backend | Frontend desacoplado del backend interno; login/redirect centralizado en BFF |
| Backend layers | 3 capas (Routers → Services → Repos) | Separación clara de concerns, testable |
| Router organization | Por entidad (users, pets, requests) | Mapeo natural a recursos REST |
| State management | React hooks nativos (useState + useContext) | Simple para POC, sin dependencias extra |
| Frontend organization | Por feature (auth, catalog, publishing, adoption) | Cohesión funcional |
| Photo storage | PostgreSQL bytea | Simplifica POC (sin S3), aceptable para ~750MB |
| Authentication | bcrypt + JWT propio | Sin dependencia de Cognito, control total |
| Authorization | Validación inline en services (ownership check) | Simple, directo, suficiente para 3 roles |
| Pagination | Offset-based (LIMIT/OFFSET) | Suficiente para POC (<200 registros) |

---

## Component Summary

| Component | Type | Port (dev) | Files/Structure |
|---|---|---|---|
| **Frontend** | React SPA | 3000 | `features/{auth,catalog,publishing,adoption}/` |
| **BFF** | FastAPI proxy | 8001 | `routers/{auth,pets,requests}.py` (thin proxy) |
| **Backend - Routers** | FastAPI routers | 8000 | `routers/{users,pets,requests}.py` |
| **Backend - Services** | Business logic | — | `services/{auth,pet,adoption}_service.py` |
| **Backend - Repositories** | Data access | — | `repositories/{user,pet,photo,adoption_request}_repository.py` |
| **Backend - Models** | SQLAlchemy models | — | `models/{user,pet,photo,adoption_request}.py` |
| **Backend - Schemas** | Pydantic schemas | — | `schemas/{user,pet,photo,request}.py` |
| **Infrastructure** | CDK stacks | — | `infra/stacks/{database,backend,bff,frontend}.ts` |

---

## API Surface

### BFF endpoints (exposed to Frontend, prefix `/api`)

| Resource | Endpoints | Auth |
|---|---|---|
| `/api/auth` | POST login, POST register | No |
| `/api/pets` | GET list, GET detail, POST create, PUT update, PATCH status, GET mine | Varies |
| `/api/pets/{id}/photos` | POST upload, DELETE | Yes (owner) |
| `/api/requests` | POST create, GET mine, PATCH cancel/review/accept/reject | Yes (role) |
| `/api/users/me` | GET, DELETE | Yes |

### Backend endpoints (internal, called only by BFF)

| Resource | Endpoints | Notes |
|---|---|---|
| `/users` | POST register, POST login, GET by-id, DELETE | Service-to-service |
| `/pets` | Full CRUD + status + photos | Internal only |
| `/requests` | Full lifecycle | Internal only |

---

## Key Business Rules (high-level)

| Rule | Enforcement Point |
|---|---|
| Max 3 active requests per adopter | `AdoptionService.create_request()` |
| Max 3 photos per pet (JPG/PNG, ≤5MB) | `PetService.upload_photo()` |
| Only owner can modify pet/photos | `PetService.*()` — ownership check |
| Valid state transitions only | `PetService.change_status()`, `AdoptionService.*()` |
| Accept → waitlist others | `AdoptionService.accept_request()` |
| Delete account → cascade all | `AuthService.delete_user()` |
| Reactivate → restore waitlisted | `PetService.change_status(AVAILABLE)` |
| Frontend only talks to BFF | Infra routing: `/api/*` → BFF |

---

## Detailed Design Reference

For complete details, see:
- `components.md` — Component definitions and responsibilities (5 components)
- `component-methods.md` — Method signatures per layer (Backend + BFF + Frontend)
- `services.md` — Service orchestration and state machines
- `component-dependency.md` — Dependency matrix and data flows (with BFF)
