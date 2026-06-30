# Functional Design — Unit 3: Frontend

**Generated**: 2026-06-30
**Stage**: CONSTRUCTION — Functional Design
**Unit**: Frontend (React + TypeScript + Tailwind CSS)

---

## Overview

The Frontend is a React SPA organized by feature. It communicates ONLY with the BFF (`/api/*`). State is managed with React hooks (useState + useContext). Tailwind CSS for styling.

---

## Page Map & Routing

| Route | Page | Auth Required | Role | Description |
|---|---|---|---|---|
| `/login` | LoginPage | No | — | Email + password login form |
| `/register` | RegisterPage | No | — | Registration form (email, password, confirm, role, name) |
| `/catalog` | CatalogPage | No | — | Browseable list of available pets with filters |
| `/catalog/:petId` | PetDetailPage | No | — | Full pet detail with photos and "send request" button |
| `/pets/mine` | MyPetsPage | Yes | Publisher/Foundation | List of my published pets |
| `/pets/new` | CreatePetPage | Yes | Publisher/Foundation | Create new pet publication |
| `/pets/:petId/edit` | EditPetPage | Yes | Publisher/Foundation | Edit existing pet |
| `/pets/:petId/requests` | PetRequestsPage | Yes | Publisher/Foundation | Manage requests for a pet |
| `/requests/mine` | MyRequestsPage | Yes | Adopter | My sent adoption requests |
| `/account` | AccountPage | Yes | Any | View profile + delete account |

---

## Component Hierarchy

```
App
├── AuthProvider (context: user, token, login, logout, register)
├── Router
│   ├── PublicRoute (no auth required)
│   │   ├── LoginPage
│   │   ├── RegisterPage
│   │   ├── CatalogPage
│   │   └── PetDetailPage
│   ├── ProtectedRoute (requires auth)
│   │   ├── MyPetsPage (Publisher/Foundation)
│   │   ├── CreatePetPage (Publisher/Foundation)
│   │   ├── EditPetPage (Publisher/Foundation)
│   │   ├── PetRequestsPage (Publisher/Foundation)
│   │   ├── MyRequestsPage (Adopter)
│   │   └── AccountPage (Any)
│   └── NotFoundPage
└── Layout
    ├── Navbar (logo, navigation links based on role, logout)
    └── Main content area
```

---

## Feature: Auth (`features/auth/`)

### LoginPage
- **Fields**: email (EmailStr), password (min 8 chars)
- **Actions**: Submit → POST /api/auth/login → on success, store token + redirect to `redirect_url`
- **Validation**: Client-side (email format, password length)
- **Error states**: Invalid credentials message
- **data-testid**: `login-form`, `login-email-input`, `login-password-input`, `login-submit-button`, `login-error-message`

### RegisterPage
- **Fields**: email, password, confirm_password, role (select: Adoptante/Publicador/Fundación), name
- **Actions**: Submit → POST /api/auth/register → on success, store token + redirect
- **Validation**: password == confirm_password, email format, name required
- **data-testid**: `register-form`, `register-email-input`, `register-password-input`, `register-confirm-input`, `register-role-select`, `register-name-input`, `register-submit-button`

### useAuth (Context Hook)
- **State**: `{ user: UserResponse | null, token: string | null, isLoading: boolean }`
- **Methods**: `login(email, password)`, `register(data)`, `logout()`, `isAuthenticated: boolean`
- **Storage**: Token persisted in localStorage
- **On mount**: Check localStorage for token, validate (decode expiration client-side)

### ProtectedRoute
- Wraps routes requiring auth
- Redirects to `/login` if not authenticated
- Optionally checks role (e.g., only Publisher/Foundation for /pets/mine)

---

## Feature: Catalog (`features/catalog/`)

### CatalogPage
- **Data**: GET /api/pets with filter params + pagination
- **Components**: FilterBar + PetCard grid + Pagination controls
- **State**: `{ pets: PetResponse[], total: number, page: number, filters: PetFilters }`
- **data-testid**: `catalog-page`, `catalog-pet-list`, `catalog-empty-message`

### FilterBar
- **Filters**: species (select), location (text input), size (select), age_group (select)
- **Actions**: onChange → update parent state → re-fetch with new params
- **data-testid**: `filter-species-select`, `filter-location-input`, `filter-size-select`, `filter-age-select`, `filter-clear-button`

### PetCard
- **Props**: pet (PetResponse)
- **Display**: Photo (first, or placeholder), name, species, size, location, age_group
- **Actions**: Click → navigate to `/catalog/:petId`
- **data-testid**: `pet-card-{petId}`

### PetDetailPage
- **Data**: GET /api/pets/{petId}
- **Display**: All pet info + photo gallery + publisher info (name only)
- **Actions**: "Enviar solicitud" button (if authenticated as Adopter + pet AVAILABLE)
- **State**: `{ pet: PetDetailResponse | null, isLoading, error }`
- **data-testid**: `pet-detail-page`, `pet-detail-name`, `pet-detail-photos`, `pet-detail-request-button`

### Pagination
- **Props**: page, total, pageSize, onChange
- **Display**: Page numbers / prev+next buttons
- **data-testid**: `pagination-prev`, `pagination-next`, `pagination-page-{n}`

---

## Feature: Publishing (`features/publishing/`)

### MyPetsPage
- **Data**: GET /api/pets/mine
- **Display**: List of my pets with status badges (AVAILABLE/IN_PROCESS/ADOPTED)
- **Actions**: Click pet → Edit, Click "Nueva mascota" → CreatePetPage, Click "Solicitudes" → PetRequestsPage
- **data-testid**: `my-pets-page`, `my-pets-list`, `my-pets-new-button`

### CreatePetPage
- **Fields**: name, species (select), size (select), age_group (select), location, health_status, description
- **Actions**: Submit → POST /api/pets → redirect to MyPetsPage
- **Photo upload**: After creation, navigate to edit page for photo upload
- **data-testid**: `create-pet-form`, `create-pet-submit-button`

### EditPetPage
- **Data**: GET /api/pets/{petId} (verify ownership via mine list)
- **Sections**: Pet info form + Photo manager
- **Actions**: Update → PUT /api/pets/{petId}, Status change → PATCH /api/pets/{petId}/status
- **data-testid**: `edit-pet-form`, `edit-pet-save-button`, `edit-pet-status-select`

### PhotoUploader
- **Props**: petId, currentPhotos (list), maxPhotos=3
- **Display**: Current photos + upload button (if < 3)
- **Validation**: File type (JPG/PNG), size (≤5MB), count (≤3)
- **Actions**: Upload → POST /api/pets/{petId}/photos, Delete → DELETE /api/pets/{petId}/photos/{photoId}
- **data-testid**: `photo-uploader`, `photo-upload-input`, `photo-delete-button-{photoId}`

---

## Feature: Adoption (`features/adoption/`)

### MyRequestsPage (Adopter)
- **Data**: GET /api/requests/mine
- **Display**: List of requests with pet name, status badge, date
- **Actions**: Cancel button (for SENT/IN_REVIEW requests)
- **data-testid**: `my-requests-page`, `my-requests-list`, `request-cancel-button-{requestId}`

### PetRequestsPage (Publisher/Foundation)
- **Data**: GET /api/pets/{petId}/requests
- **Display**: List of requests with adopter name, status, date, message
- **Actions**: Accept, Reject, Mark in Review buttons (based on current status)
- **Contact info**: Show adopter email+phone when status=ACCEPTED
- **data-testid**: `pet-requests-page`, `request-accept-button-{id}`, `request-reject-button-{id}`, `request-review-button-{id}`

### RequestCard
- **Props**: request (AdoptionRequestResponse/Detail), onAction
- **Display**: Status badge, adopter info, date, message, action buttons
- **Conditional**: Contact info only shown for ACCEPTED status
- **data-testid**: `request-card-{requestId}`

---

## Feature: Account (`features/account/`)

### AccountPage
- **Data**: GET /api/users/me
- **Display**: Email, name, role, created_at
- **Actions**: "Eliminar cuenta" button → confirmation modal → DELETE /api/users/me → logout + redirect to /login
- **data-testid**: `account-page`, `account-delete-button`, `account-delete-confirm-button`

---

## Shared Components (`components/`)

| Component | Props | Purpose |
|---|---|---|
| `Navbar` | user, onLogout | Top navigation bar with role-based links |
| `StatusBadge` | status, type ('pet'\|'request') | Colored badge for status display |
| `LoadingSpinner` | — | Loading indicator |
| `ErrorMessage` | message | Error display |
| `ConfirmModal` | title, message, onConfirm, onCancel | Confirmation dialog |
| `EmptyState` | message, icon? | Empty list placeholder |

---

## API Service (`services/api.ts`)

Centralized API client:

```typescript
const API_BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: HeadersInit = { ...options?.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(options?.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!response.ok) {
    const error = await response.json();
    throw new ApiError(error.detail, error.code, response.status);
  }
  return response.json();
}
```

### API Methods:
- `auth.login(email, password)`, `auth.register(data)`
- `pets.list(filters, page)`, `pets.get(id)`, `pets.create(data)`, `pets.update(id, data)`, `pets.updateStatus(id, status)`, `pets.getMine()`
- `photos.upload(petId, file)`, `photos.delete(petId, photoId)`, `photos.getUrl(petId, photoId)`
- `requests.create(petId, message?)`, `requests.getMine()`, `requests.cancel(id)`, `requests.getForPet(petId)`, `requests.accept(id)`, `requests.reject(id)`, `requests.review(id)`
- `users.getMe()`, `users.deleteMe()`

---

## Form Validation Rules (Client-Side)

| Form | Field | Rule |
|---|---|---|
| Login | email | Required, valid email format |
| Login | password | Required, min 8 chars |
| Register | email | Required, valid email format |
| Register | password | Required, min 8 chars |
| Register | confirm | Must match password |
| Register | role | Required, one of 3 options |
| Register | name | Required, 1-100 chars |
| Create Pet | All fields | Required |
| Create Pet | name | 1-100 chars |
| Create Pet | location | 1-100 chars |
| Photo Upload | file | Required, JPG/PNG only, ≤5MB |
