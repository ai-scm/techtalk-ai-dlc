# Services — App de Adopción de Mascotas

**Generated**: 2026-06-30 (rev. 2 — BFF introduced)
**Stage**: INCEPTION — Application Design

---

## Service Architecture

```
BFF (FastAPI - port 8001)
      |  (HTTP client calls)
      v
Router Layer (HTTP - port 8000)
      |
      v
Service Layer (Business Logic + Orchestration)
      |
      v
Repository Layer (Data Access - SQLAlchemy)
      |
      v
PostgreSQL
```

The BFF is a thin proxy/orchestration layer. All business logic lives in the Backend API Services. The Frontend only communicates with the BFF.

---

## Service 1: AuthService

| Campo | Detalle |
|---|---|
| **Responsabilidad** | Registro, autenticación, gestión de sesiones y eliminación de cuentas |
| **Dependencias** | `UserRepository`, módulo de hashing (bcrypt), módulo JWT |
| **Patrón** | Stateless — cada request lleva JWT, no hay sesión en servidor |

### Orchestration Patterns

| Operación | Flujo |
|---|---|
| **Register** | Validar email único → Hash password (bcrypt) → Crear usuario con rol → Retornar user |
| **Login** | Buscar user por email → Verificar password vs hash → Generar JWT con user_id + role → Retornar token |
| **Delete Account** | Obtener user → Llamar `PetService.delete_pets_by_user()` → Llamar `AdoptionService.cancel_requests_by_adopter()` → Eliminar user |

### Cross-Service Calls (Cascade on Delete)
- `AuthService.delete_user()` → `PetService.delete_pets_by_user()`
- `AuthService.delete_user()` → `AdoptionService.cancel_requests_by_adopter()`

---

## Service 2: PetService

| Campo | Detalle |
|---|---|
| **Responsabilidad** | Publicación de mascotas, catálogo, filtros, fotos, cambio de estado |
| **Dependencias** | `PetRepository`, `PhotoRepository`, `AdoptionService` (para cascada de estado) |
| **Validaciones clave** | Ownership (solo el publicador dueño puede modificar), límite de fotos (3), formato/tamaño de foto, transiciones de estado válidas |

### Orchestration Patterns

| Operación | Flujo |
|---|---|
| **Create Pet** | Validar rol (PUBLISHER/FOUNDATION) → Crear pet con status=AVAILABLE → Retornar |
| **Upload Photo** | Validar ownership → Contar fotos (≤3) → Validar formato (JPG/PNG) y tamaño (≤5MB) → Guardar bytea → Retornar |
| **Change Status to ADOPTED** | Validar ownership → Validar transición (IN_PROCESS→ADOPTED) → Update status → Cancelar solicitudes WAITLISTED → Retornar |
| **Reactivate (IN_PROCESS→AVAILABLE)** | Validar ownership → Update status → Cancel solicitud ACCEPTED → Reactivar WAITLISTED → Retornar |
| **Delete Pets by User** | Obtener pet_ids del usuario → Llamar `AdoptionService.cancel_requests_for_pets(pet_ids)` → Eliminar fotos → Eliminar pets |

### State Machine (Pet Status)
```
AVAILABLE ──→ IN_PROCESS ──→ ADOPTED
    ^              |
    └──────────────┘ (reactivate)
```

---

## Service 3: AdoptionService

| Campo | Detalle |
|---|---|
| **Responsabilidad** | Solicitudes de adopción: crear, cancelar, aceptar, rechazar, gestionar waitlist |
| **Dependencias** | `AdoptionRequestRepository`, `PetRepository` (para validar disponibilidad y cambiar estado) |
| **Validaciones clave** | Límite de 3 solicitudes activas, mascota debe estar AVAILABLE, no duplicar solicitud, transiciones válidas |

### Orchestration Patterns

| Operación | Flujo |
|---|---|
| **Create Request** | Validar pet AVAILABLE → Contar solicitudes activas del adoptante (≤3) → Verificar no duplicada → Crear con status=SENT → Retornar |
| **Accept Request** | Validar ownership de pet → Validar estado (SENT/IN_REVIEW) → Update request status=ACCEPTED → Update pet status=IN_PROCESS → Waitlist demás solicitudes pendientes → Retornar |
| **Reject Request** | Validar ownership → Validar estado (SENT/IN_REVIEW/WAITLISTED) → Update status=REJECTED → Liberar cupo del adoptante → Retornar |
| **Cancel Request** | Validar que el adoptante es dueño de la solicitud → Validar estado (SENT/IN_REVIEW) → Update status=CANCELLED → Liberar cupo → Retornar |

### State Machine (AdoptionRequest Status)
```
SENT ──→ IN_REVIEW ──→ ACCEPTED
 |            |              |
 |            ├──→ REJECTED  └──→ WAITLISTED
 |            |
 └──→ CANCELLED (por adoptante o cascada)
```

### Solicitudes "Activas" (cuentan para el límite de 3)
- SENT
- IN_REVIEW
- WAITLISTED

### Solicitudes "Inactivas" (no cuentan)
- ACCEPTED (ya se concretó)
- REJECTED
- CANCELLED

---

## Service Interaction Map

```
BFF (thin proxy)
    └──→ Backend API (all calls via HTTP client)

AuthService
    ├──→ UserRepository
    ├──→ PetService (cascade delete)
    └──→ AdoptionService (cascade delete)

PetService
    ├──→ PetRepository
    ├──→ PhotoRepository
    └──→ AdoptionService (cascade: cancel requests for deleted pets, waitlist management)

AdoptionService
    ├──→ AdoptionRequestRepository
    └──→ PetRepository (read: validar disponibilidad; write: cambiar estado en accept)
```

---

## Cross-Cutting Concerns

| Concern | Implementación |
|---|---|
| **Autenticación** | Dependency injection de `get_current_user` en routers via FastAPI `Depends()` |
| **Autorización** | Validación de ownership en cada service method (if user.id != resource.owner_id → 403) |
| **Transacciones** | SQLAlchemy session con commit/rollback, especialmente en operaciones de cascada |
| **Error Handling** | Custom exceptions (`NotFoundError`, `ForbiddenError`, `ValidationError`) capturadas por exception handlers globales |
| **Paginación** | Offset-based (LIMIT/OFFSET SQL) — suficiente para la POC con <200 mascotas |
