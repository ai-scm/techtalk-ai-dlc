# Component Methods — App de Adopción de Mascotas

**Generated**: 2026-06-30 (rev. 2 — BFF introduced)
**Stage**: INCEPTION — Application Design
**Note**: Signatures de alto nivel. Business rules detalladas se definen en Functional Design (CONSTRUCTION).

---

## BFF — Routers (Proxy + Auth Orchestration)

### `routers/auth.py`

| Método | Endpoint | Propósito | Input | Output |
|---|---|---|---|---|
| `login` | `POST /api/auth/login` | Recibir credenciales, llamar backend, retornar JWT + redirect info | `LoginRequest(email, password)` | `TokenResponse(access_token, token_type, role, redirect_url)` |
| `register` | `POST /api/auth/register` | Recibir datos de registro, llamar backend, retornar JWT | `RegisterRequest(email, password, confirm_password, role)` | `TokenResponse(access_token, token_type, role, redirect_url)` |

### `routers/pets.py` (proxy)

| Método | Endpoint | Propósito | Input | Output |
|---|---|---|---|---|
| `list_pets` | `GET /api/pets` | Validar sesión (opcional), proxy al backend | Query params + JWT header (opcional) | `PaginatedResponse[PetResponse]` |
| `get_pet` | `GET /api/pets/{pet_id}` | Proxy al backend | Path param | `PetDetailResponse` |
| `create_pet` | `POST /api/pets` | Validar JWT, proxy al backend | `CreatePetRequest` + JWT | `PetResponse` |
| `update_pet` | `PUT /api/pets/{pet_id}` | Validar JWT, proxy al backend | `UpdatePetRequest` + JWT | `PetResponse` |
| `update_status` | `PATCH /api/pets/{pet_id}/status` | Validar JWT, proxy al backend | `StatusUpdateRequest` + JWT | `PetResponse` |
| `get_my_pets` | `GET /api/pets/mine` | Validar JWT, proxy al backend | JWT | `List[PetResponse]` |
| `upload_photo` | `POST /api/pets/{pet_id}/photos` | Validar JWT, proxy multipart al backend | Multipart file + JWT | `PhotoResponse` |
| `delete_photo` | `DELETE /api/pets/{pet_id}/photos/{photo_id}` | Validar JWT, proxy al backend | Path params + JWT | `204` |

### `routers/requests.py` (proxy)

| Método | Endpoint | Propósito | Input | Output |
|---|---|---|---|---|
| `create_request` | `POST /api/pets/{pet_id}/requests` | Validar JWT (adopter), proxy al backend | JWT | `AdoptionRequestResponse` |
| `get_my_requests` | `GET /api/requests/mine` | Validar JWT, proxy al backend | JWT | `List[AdoptionRequestResponse]` |
| `cancel_request` | `PATCH /api/requests/{request_id}/cancel` | Validar JWT, proxy al backend | JWT | `AdoptionRequestResponse` |
| `get_pet_requests` | `GET /api/pets/{pet_id}/requests` | Validar JWT (publisher), proxy al backend | JWT | `List[AdoptionRequestDetailResponse]` |
| `review_request` | `PATCH /api/requests/{request_id}/review` | Validar JWT, proxy | JWT | `AdoptionRequestResponse` |
| `accept_request` | `PATCH /api/requests/{request_id}/accept` | Validar JWT, proxy | JWT | `AdoptionRequestResponse` |
| `reject_request` | `PATCH /api/requests/{request_id}/reject` | Validar JWT, proxy | JWT | `AdoptionRequestResponse` |

### `routers/users.py` (proxy)

| Método | Endpoint | Propósito | Input | Output |
|---|---|---|---|---|
| `get_me` | `GET /api/users/me` | Validar JWT, proxy al backend | JWT | `UserResponse` |
| `delete_account` | `DELETE /api/users/me` | Validar JWT, proxy al backend, clear session info | JWT | `204 + redirect to login` |

### BFF Helper modules

| Módulo | Propósito |
|---|---|
| `middleware/auth.py` | Dependency que decodifica JWT y valida expiración antes de proxy |
| `client/backend_client.py` | HTTP client (httpx/aiohttp) para llamar al Backend API |
| `config.py` | BACKEND_URL, JWT_SECRET, etc. |

---

## Backend API — Routers (Endpoints)

### `routers/users.py`

| Método | Endpoint | Propósito | Input | Output |
|---|---|---|---|---|
| `register` | `POST /users/register` | Registrar nuevo usuario | `RegisterRequest(email, password, confirm_password, role)` | `UserResponse(id, email, role)` |
| `login` | `POST /users/login` | Autenticar y obtener JWT | `LoginRequest(email, password)` | `TokenResponse(access_token, token_type)` |
| `get_me` | `GET /users/me` | Obtener perfil del usuario actual | JWT header | `UserResponse` |
| `delete_account` | `DELETE /users/me` | Eliminar cuenta del usuario actual | JWT header | `204 No Content` |

### `routers/pets.py`

| Método | Endpoint | Propósito | Input | Output |
|---|---|---|---|---|
| `create_pet` | `POST /pets` | Crear publicación de mascota | `CreatePetRequest(name, species, age_group, size, location, health_status, description)` | `PetResponse` |
| `get_pets` | `GET /pets` | Listar mascotas disponibles (catálogo) | Query params: `species?, location?, size?, age_group?, cursor?, limit?` | `PaginatedResponse[PetResponse]` |
| `get_pet` | `GET /pets/{pet_id}` | Ver detalle de mascota | Path param: `pet_id` | `PetDetailResponse` (incluye fotos) |
| `update_pet` | `PUT /pets/{pet_id}` | Editar información de mascota | `UpdatePetRequest(...)` | `PetResponse` |
| `update_pet_status` | `PATCH /pets/{pet_id}/status` | Cambiar estado de publicación | `StatusUpdateRequest(status)` | `PetResponse` |
| `upload_photo` | `POST /pets/{pet_id}/photos` | Subir foto a mascota | Multipart: `file` (JPG/PNG, ≤5MB) | `PhotoResponse(id, url)` |
| `delete_photo` | `DELETE /pets/{pet_id}/photos/{photo_id}` | Eliminar foto | Path params | `204 No Content` |
| `get_my_pets` | `GET /pets/mine` | Mascotas publicadas por el usuario actual | JWT header | `List[PetResponse]` |

### `routers/requests.py`

| Método | Endpoint | Propósito | Input | Output |
|---|---|---|---|---|
| `create_request` | `POST /pets/{pet_id}/requests` | Enviar solicitud de adopción | `CreateAdoptionRequest(message?)` | `AdoptionRequestResponse` |
| `get_my_requests` | `GET /requests/mine` | Ver mis solicitudes enviadas (adoptante) | JWT header | `List[AdoptionRequestResponse]` |
| `cancel_request` | `PATCH /requests/{request_id}/cancel` | Cancelar solicitud | Path param | `AdoptionRequestResponse` |
| `get_pet_requests` | `GET /pets/{pet_id}/requests` | Ver solicitudes recibidas (publicador) | Path param + JWT | `List[AdoptionRequestDetailResponse]` |
| `review_request` | `PATCH /requests/{request_id}/review` | Marcar solicitud en revisión | Path param | `AdoptionRequestResponse` |
| `accept_request` | `PATCH /requests/{request_id}/accept` | Aceptar solicitud | Path param | `AdoptionRequestResponse` |
| `reject_request` | `PATCH /requests/{request_id}/reject` | Rechazar solicitud | Path param | `AdoptionRequestResponse` |

---

## Backend API — Services (Lógica de Negocio)

### `services/auth_service.py`

| Método | Propósito | Input | Output |
|---|---|---|---|
| `register_user(data)` | Crear usuario con password hasheado | `RegisterRequest` | `User` |
| `authenticate(email, password)` | Verificar credenciales y generar JWT | `str, str` | `TokenResponse` |
| `get_current_user(token)` | Decodificar JWT y retornar usuario | `str` | `User` |
| `delete_user(user_id)` | Eliminar cuenta con cascada | `UUID` | `None` |

### `services/pet_service.py`

| Método | Propósito | Input | Output |
|---|---|---|---|
| `create_pet(user_id, data)` | Crear publicación validando rol | `UUID, CreatePetRequest` | `Pet` |
| `list_available_pets(filters, cursor, limit)` | Catálogo con filtros y paginación | `PetFilters, str?, int` | `PaginatedResult[Pet]` |
| `get_pet(pet_id)` | Obtener detalle de mascota | `UUID` | `Pet` |
| `update_pet(user_id, pet_id, data)` | Editar mascota validando ownership | `UUID, UUID, UpdatePetRequest` | `Pet` |
| `change_status(user_id, pet_id, new_status)` | Cambiar estado validando transición | `UUID, UUID, PetStatus` | `Pet` |
| `upload_photo(user_id, pet_id, file)` | Subir foto validando límites | `UUID, UUID, UploadFile` | `Photo` |
| `delete_photo(user_id, pet_id, photo_id)` | Eliminar foto validando ownership | `UUID, UUID, UUID` | `None` |
| `delete_pets_by_user(user_id)` | Eliminar todas las mascotas de un usuario (cascada) | `UUID` | `None` |

### `services/adoption_service.py`

| Método | Propósito | Input | Output |
|---|---|---|---|
| `create_request(adopter_id, pet_id)` | Crear solicitud validando límites y disponibilidad | `UUID, UUID` | `AdoptionRequest` |
| `get_adopter_requests(adopter_id)` | Listar solicitudes del adoptante | `UUID` | `List[AdoptionRequest]` |
| `cancel_request(adopter_id, request_id)` | Cancelar solicitud validando estado | `UUID, UUID` | `AdoptionRequest` |
| `get_pet_requests(publisher_id, pet_id)` | Listar solicitudes para una mascota (validando ownership) | `UUID, UUID` | `List[AdoptionRequest]` |
| `review_request(publisher_id, request_id)` | Pasar a IN_REVIEW | `UUID, UUID` | `AdoptionRequest` |
| `accept_request(publisher_id, request_id)` | Aceptar solicitud (trigger: waitlist + status change) | `UUID, UUID` | `AdoptionRequest` |
| `reject_request(publisher_id, request_id)` | Rechazar solicitud | `UUID, UUID` | `AdoptionRequest` |
| `cancel_requests_by_adopter(adopter_id)` | Cancelar todas las solicitudes de un adoptante (cascada) | `UUID` | `None` |
| `cancel_requests_for_pets(pet_ids)` | Cancelar solicitudes de mascotas eliminadas (cascada) | `List[UUID]` | `None` |

---

## Backend API — Repositories (Acceso a Datos)

### `repositories/user_repository.py`

| Método | Propósito |
|---|---|
| `create(user)` | Insertar usuario en DB |
| `get_by_id(user_id)` | Buscar usuario por ID |
| `get_by_email(email)` | Buscar usuario por email |
| `delete(user_id)` | Eliminar usuario |

### `repositories/pet_repository.py`

| Método | Propósito |
|---|---|
| `create(pet)` | Insertar mascota |
| `get_by_id(pet_id)` | Buscar mascota por ID |
| `list_available(filters, cursor, limit)` | Query con filtros SQL + paginación |
| `list_by_publisher(publisher_id)` | Mascotas de un publicador |
| `update(pet_id, data)` | Actualizar campos |
| `update_status(pet_id, status)` | Actualizar estado |
| `delete_by_publisher(publisher_id)` | Eliminar todas las mascotas de un publicador |

### `repositories/photo_repository.py`

| Método | Propósito |
|---|---|
| `create(photo)` | Insertar foto (bytea) |
| `get_by_pet(pet_id)` | Listar fotos de una mascota |
| `count_by_pet(pet_id)` | Contar fotos (para validar límite) |
| `delete(photo_id)` | Eliminar foto |
| `delete_by_pet(pet_id)` | Eliminar todas las fotos de una mascota |

### `repositories/adoption_request_repository.py`

| Método | Propósito |
|---|---|
| `create(request)` | Insertar solicitud |
| `get_by_id(request_id)` | Buscar solicitud por ID |
| `list_by_adopter(adopter_id)` | Solicitudes enviadas por un adoptante |
| `list_by_pet(pet_id)` | Solicitudes para una mascota |
| `count_active_by_adopter(adopter_id)` | Contar solicitudes activas (para validar límite de 3) |
| `update_status(request_id, status)` | Actualizar estado de solicitud |
| `waitlist_pending_for_pet(pet_id, exclude_id)` | Pasar solicitudes pendientes a WAITLISTED |
| `cancel_by_adopter(adopter_id)` | Cancelar todas de un adoptante |
| `cancel_by_pet_ids(pet_ids)` | Cancelar todas para una lista de mascotas |
| `reactivate_waitlisted_for_pet(pet_id)` | Reactivar solicitudes en espera |

---

## Frontend — Features (organización por feature)

### `features/auth/`

| Componente | Propósito |
|---|---|
| `LoginPage` | Formulario de login (email + password) |
| `RegisterPage` | Formulario de registro (email + password + confirm + rol) |
| `useAuth` (hook) | Context provider con user, token, login(), logout(), register() |
| `ProtectedRoute` | Wrapper que redirige si no autenticado |

### `features/catalog/`

| Componente | Propósito |
|---|---|
| `CatalogPage` | Listado de mascotas con filtros y paginación |
| `PetCard` | Tarjeta de mascota en el catálogo |
| `PetDetailPage` | Vista de detalle con fotos y botón de solicitud |
| `FilterBar` | Controles de filtro (especie, ubicación, tamaño, edad) |

### `features/publishing/`

| Componente | Propósito |
|---|---|
| `MyPetsPage` | Listado de mascotas publicadas por el usuario |
| `CreatePetPage` | Formulario de creación de mascota |
| `EditPetPage` | Formulario de edición |
| `PhotoUploader` | Componente de subida de fotos (max 3, validación) |

### `features/adoption/`

| Componente | Propósito |
|---|---|
| `MyRequestsPage` | Solicitudes enviadas por el adoptante |
| `PetRequestsPage` | Solicitudes recibidas para una mascota (publicador) |
| `RequestCard` | Tarjeta de solicitud con acciones (aceptar/rechazar/cancelar) |
