# Unit of Work — Story Map — App de Adopción de Mascotas

**Generated**: 2026-06-30
**Stage**: INCEPTION — Units Generation

---

## Story-to-Unit Mapping

| Story | Title | Unit 1: Backend | Unit 2: BFF | Unit 3: Frontend | Unit 4: Infra |
|---|---|---|---|---|---|
| US-01 | Registro de usuario con selección de rol | ✅ Primary | ✅ Proxy | ✅ UI | |
| US-02 | Inicio de sesión | ✅ Primary | ✅ Auth orchestration | ✅ UI | |
| US-03 | Crear publicación de mascota | ✅ Primary | ✅ Proxy | ✅ UI | |
| US-04 | Editar publicación de mascota | ✅ Primary | ✅ Proxy | ✅ UI | |
| US-05 | Subir fotos a una publicación | ✅ Primary | ✅ Proxy (multipart) | ✅ UI | |
| US-06 | Eliminar foto de una publicación | ✅ Primary | ✅ Proxy | ✅ UI | |
| US-07 | Ver catálogo de mascotas disponibles | ✅ Primary | ✅ Proxy | ✅ UI | |
| US-08 | Filtrar mascotas por especie | ✅ Primary | ✅ Proxy | ✅ UI | |
| US-09 | Filtrar mascotas por ubicación | ✅ Primary | ✅ Proxy | ✅ UI | |
| US-10 | Filtrar mascotas por tamaño y edad | ✅ Primary | ✅ Proxy | ✅ UI | |
| US-11 | Ver información completa de una mascota | ✅ Primary | ✅ Proxy | ✅ UI | |
| US-12 | Enviar solicitud de adopción | ✅ Primary | ✅ Proxy | ✅ UI | |
| US-13 | Ver mis solicitudes enviadas | ✅ Primary | ✅ Proxy | ✅ UI | |
| US-14 | Cancelar solicitud enviada | ✅ Primary | ✅ Proxy | ✅ UI | |
| US-15 | Ver solicitudes recibidas para una mascota | ✅ Primary | ✅ Proxy | ✅ UI | |
| US-16 | Aceptar una solicitud | ✅ Primary | ✅ Proxy | ✅ UI | |
| US-17 | Rechazar una solicitud | ✅ Primary | ✅ Proxy | ✅ UI | |
| US-18 | Poner solicitud en revisión | ✅ Primary | ✅ Proxy | ✅ UI | |
| US-19 | Confirmar adopción completada | ✅ Primary | ✅ Proxy | ✅ UI | |
| US-20 | Reactivar mascota | ✅ Primary | ✅ Proxy | ✅ UI | |
| US-21 | Eliminar cuenta de adoptante | ✅ Primary | ✅ Proxy + redirect | ✅ UI | |
| US-22 | Eliminar cuenta de publicador/fundación | ✅ Primary | ✅ Proxy + redirect | ✅ UI | |

---

## Stories per Unit (Role Summary)

### Unit 1: Backend API — 22 stories (Primary implementation)
All 22 stories have their primary business logic in the Backend API. This unit is the "source of truth" for:
- Data validation and persistence
- State machine enforcement
- Business rules (limits, waitlist, cascade)
- Authentication (bcrypt + JWT generation)

### Unit 2: BFF — 22 stories (Proxy + orchestration)
All 22 stories pass through the BFF. Special responsibilities:
- **US-01, US-02**: Auth orchestration (login/register flow, JWT return, redirect by role)
- **US-05**: Multipart proxy (forwarding file uploads)
- **US-21, US-22**: Session cleanup + redirect to login after account deletion
- **All others**: Thin proxy with JWT validation

### Unit 3: Frontend — 22 stories (UI implementation)
All 22 stories have corresponding UI elements:
- **US-01, US-02**: Auth pages (login, register forms)
- **US-03, US-04, US-05, US-06**: Publishing pages (create/edit pet, photo management)
- **US-07, US-08, US-09, US-10, US-11**: Catalog pages (list, filters, detail)
- **US-12, US-13, US-14**: Adopter request pages (send, view, cancel)
- **US-15, US-16, US-17, US-18**: Publisher request management pages
- **US-19, US-20**: Status management UI
- **US-21, US-22**: Account deletion confirmation

### Unit 4: Infrastructure — 0 stories (cross-cutting)
No stories map directly to infrastructure. This unit enables cloud deployment of all 3 service units.

---

## Feature-to-Unit Responsibility Matrix

| Feature | Backend (logic) | BFF (proxy) | Frontend (UI) |
|---|---|---|---|
| Auth (registro/login) | Hash, JWT, user CRUD | Orchestrate login flow, return redirect | Forms, token storage |
| Publishing (mascotas) | CRUD, validation, status | Forward requests | Create/edit forms, photo upload |
| Photos | Store/retrieve bytea, validate limits | Forward multipart | Upload component, gallery |
| Catalog (búsqueda) | SQL queries + filters + pagination | Forward with optional session | List, cards, filter bar |
| Adoption (solicitudes) | State machine, limits, waitlist | Forward with role check | Request forms, status display |
| Account management | Cascade delete | Forward + session cleanup | Confirmation dialog |

---

## Development Velocity Indicator

| Unit | Complexity | Estimated Stories (unique logic) | Notes |
|---|---|---|---|
| Backend API | High | 22 (all primary logic) | Most complex: state machines, cascades, DB |
| BFF | Low | ~3 unique (auth flow, multipart, redirect) | Mostly thin proxy |
| Frontend | Medium | 22 (all UI) | Many pages but straightforward CRUD UI |
| Infrastructure | Medium | 0 | CDK stacks, networking, permissions |
