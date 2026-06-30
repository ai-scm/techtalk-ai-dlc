# Component Dependencies — App de Adopción de Mascotas

**Generated**: 2026-06-30 (rev. 2 — BFF introduced)
**Stage**: INCEPTION — Application Design

---

## Dependency Matrix

| Component | Depends On | Depended By |
|---|---|---|
| Frontend | BFF | — |
| BFF | Backend API | Frontend |
| Backend API (Routers) | Services | BFF |
| Backend API (Services) | Repositories, other Services | Routers |
| Backend API (Repositories) | PostgreSQL (SQLAlchemy) | Services |
| PostgreSQL | — | Repositories |
| Infrastructure (CDK) | — | All (defines deployment) |

---

## Communication Chain

```
Frontend ──HTTP/REST──→ BFF ──HTTP/REST──→ Backend API ──SQL──→ PostgreSQL
   (3000)              (8001)              (8000)               (5432)
```

**Key rule**: The Frontend NEVER communicates directly with the Backend API. All requests go through the BFF.

---

## Internal Service Dependencies (Backend API)

```
AuthService ───────→ UserRepository
    |
    ├──→ PetService.delete_pets_by_user()          [cascade]
    └──→ AdoptionService.cancel_requests_by_adopter()  [cascade]

PetService ────────→ PetRepository
    |                  PhotoRepository
    └──→ AdoptionService.cancel_requests_for_pets()    [cascade]

AdoptionService ───→ AdoptionRequestRepository
    └──→ PetRepository (read + write status)
```

---

## Data Flow Diagrams

### Flow 1: Login
```
Frontend ──POST /api/auth/login──→ BFF
                                    |
                                    v
                              BFF validates request format
                                    |
                                    v
                              BFF ──POST /users/login──→ Backend API
                                                            |
                                                            v
                                                       AuthService.authenticate()
                                                            |
                                                            v
                                                       PostgreSQL (SELECT user, verify bcrypt)
                                                            |
                                                            v
                              BFF ←── JWT token ←── Backend API
                                    |
                                    v
                              BFF returns JWT + redirect info to Frontend
```

### Flow 2: Consultar Catálogo con Filtros
```
Frontend ──GET /api/pets?species=dog&location=bogota──→ BFF
                                                          |
                                                          v
                                                    BFF validates session (JWT)
                                                          |
                                                          v
                                                    BFF ──GET /pets?...──→ Backend API
                                                                               |
                                                                               v
                                                                          PetService.list_available_pets()
                                                                               |
                                                                               v
                                                                          PostgreSQL (SELECT ...)
                                                                               |
                                                          BFF ←── response ←── Backend API
                                                          |
                                                          v
                                                    BFF adapts/returns response to Frontend
```

### Flow 3: Subir Foto
```
Frontend ──POST /api/pets/{id}/photos (multipart)──→ BFF
                                                       |
                                                       v
                                                 BFF validates session + proxies multipart
                                                       |
                                                       v
                                                 BFF ──POST /pets/{id}/photos──→ Backend API
                                                                                     |
                                                                                     v
                                                                                PetService.upload_photo()
                                                                                     |
                                                                                     v
                                                                                PostgreSQL (INSERT bytea)
```

### Flow 4: Aceptar Solicitud (flujo complejo)
```
Frontend ──PATCH /api/requests/{id}/accept──→ BFF
                                                |
                                                v
                                          BFF validates session + role
                                                |
                                                v
                                          BFF ──PATCH /requests/{id}/accept──→ Backend API
                                                                                    |
                                                                                    v
                                                                              AdoptionService.accept_request()
                                                                                    |
                                                                              (state transitions + waitlist)
                                                                                    |
                                          BFF ←── response ←── Backend API
```

### Flow 5: Eliminar Cuenta (cascada completa)
```
Frontend ──DELETE /api/users/me──→ BFF
                                    |
                                    v
                              BFF validates session
                                    |
                                    v
                              BFF ──DELETE /users/me──→ Backend API
                                                          |
                                                          v
                                                     AuthService.delete_user()
                                                          |
                                                     (cascade: pets, photos, requests)
                                                          |
                              BFF ←── 204 ←── Backend API
                                    |
                                    v
                              BFF clears session, returns redirect to login
```

---

## BFF Responsibilities Detail

| Responsabilidad | Descripción |
|---|---|
| **Session/Auth proxy** | Verifica JWT del frontend antes de reenviar al backend |
| **Login/Register orchestration** | Recibe credenciales, llama backend, retorna JWT + info de redirección |
| **Request forwarding** | Proxea requests al backend agregando headers internos |
| **Response adaptation** | Simplifica/transforma responses si el frontend necesita formato diferente |
| **Error normalization** | Traduce errores del backend a un formato consistente para el frontend |
| **Redirect logic** | Post-login redirige según rol (adoptante→catálogo, publicador→mis mascotas) |

---

## Communication Patterns

| Origen | Destino | Protocolo | Patrón |
|---|---|---|---|
| Frontend → BFF | HTTP REST (via `/api/*`) | Request/Response síncrono |
| BFF → Backend | HTTP REST (servicio interno) | Request/Response síncrono |
| Backend → PostgreSQL | TCP (psycopg2) | Connection pool (SQLAlchemy) |
| Service → Service | In-process call | Inyección de dependencias (FastAPI Depends) |

---

## Deployment Dependencies

```
CDK Stack Deploy Order:
1. VPC + Security Groups
2. RDS PostgreSQL Instance
3. Lambda: Backend API + Environment Variables (DB connection string)
4. Lambda: BFF + Environment Variables (BACKEND_URL=http://backend:8000)
5. API Gateway (routes: /api/* → BFF Lambda)
6. S3 + CloudFront (frontend static hosting, /api/* proxied to API Gateway)
```

---

## Error Propagation

| Capa | Error Type | Handling |
|---|---|---|
| Repository | `SQLAlchemy exceptions` | Wrapped in custom exceptions, rollback transaction |
| Service | `NotFoundError`, `ForbiddenError`, `ValidationError`, `ConflictError` | Raised to Router |
| Backend Router | Custom exceptions | Caught by exception handler → HTTP status codes |
| BFF | Backend error responses | Normalized and forwarded to Frontend with consistent format |
| Frontend | BFF error responses | Parsed and shown to user via error states |
