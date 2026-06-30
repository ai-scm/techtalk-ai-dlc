# Business Logic Model — Unit 1: Backend API

**Generated**: 2026-06-30
**Stage**: CONSTRUCTION — Functional Design
**Unit**: Backend API

---

## AuthService — Detailed Logic

### `register_user(data: RegisterRequest) → User`

**Preconditions:**
- `data.email` not already registered (case-insensitive)
- `data.password == data.confirm_password`
- `data.password` length ≥ 8
- `data.role` is valid enum value

**Logic:**
1. Normalize email to lowercase
2. Check email uniqueness via `UserRepository.get_by_email()`
3. If exists → raise `ConflictError("Email already registered")`
4. Hash password with bcrypt (rounds=12)
5. Create User entity with: id=uuid4(), email, password_hash, role, name, phone=None
6. Save via `UserRepository.create(user)`
7. Return created User

**Postconditions:**
- New user exists in DB with hashed password
- No JWT generated here (user must login separately)

---

### `authenticate(email: str, password: str) → TokenResponse`

**Preconditions:**
- email and password provided (non-empty)

**Logic:**
1. Normalize email to lowercase
2. Fetch user via `UserRepository.get_by_email(email)`
3. If not found → raise `AuthenticationError("Invalid credentials")`
4. Verify password: `bcrypt.verify(password, user.password_hash)`
5. If mismatch → raise `AuthenticationError("Invalid credentials")` (same message)
6. Generate JWT: payload = `{sub: user.id, role: user.role, exp: now() + 24h}`
7. Sign JWT with secret key (HS256)
8. Return `TokenResponse(access_token=jwt, token_type="bearer", role=user.role)`

**Postconditions:**
- Valid JWT returned (24h expiration)
- No session stored server-side (stateless)

---

### `delete_user(user_id: UUID) → None`

**Preconditions:**
- User exists with given ID

**Logic (transaction):**
1. Fetch user via `UserRepository.get_by_id(user_id)`
2. If not found → raise `NotFoundError`
3. Get all pet_ids owned by user: `PetRepository.list_ids_by_publisher(user_id)`
4. If user has pets (role=PUBLISHER/FOUNDATION):
   a. Cancel all non-terminal requests for those pets: `AdoptionRequestRepository.cancel_by_pet_ids(pet_ids)`
   b. (Pets + photos deleted by DB CASCADE when user is deleted)
5. If user has sent requests (role=ADOPTER or mixed):
   a. Cancel all active requests by adopter: `AdoptionRequestRepository.cancel_by_adopter(user_id)`
6. Delete user: `UserRepository.delete(user_id)` (DB CASCADE handles rest)
7. Commit transaction

**Postconditions:**
- User, their pets, photos, and all associated requests are removed
- Affected adopters' active request counts implicitly updated

---

## PetService — Detailed Logic

### `create_pet(user_id: UUID, data: CreatePetRequest) → Pet`

**Preconditions:**
- User role is PUBLISHER or FOUNDATION

**Logic:**
1. Fetch user, validate role ∈ {PUBLISHER, FOUNDATION}
2. If wrong role → raise `ForbiddenError("Only publishers can create pets")`
3. Create Pet entity: id=uuid4(), publisher_id=user_id, status=AVAILABLE, all fields from data
4. Save via `PetRepository.create(pet)`
5. Return created Pet

---

### `list_available_pets(filters: PetFilters, page: int, page_size: int) → PaginatedResult[Pet]`

**Preconditions:**
- page ≥ 1, page_size ∈ [1, 100]

**Logic:**
1. Build query: `SELECT * FROM pets WHERE status = 'AVAILABLE'`
2. Apply filters (if provided):
   - `species` → `AND species = :species`
   - `location` → `AND location ILIKE :location` (case-insensitive partial match)
   - `size` → `AND size = :size`
   - `age_group` → `AND age_group = :age_group`
3. ORDER BY `created_at DESC`
4. Apply pagination: `OFFSET (page-1)*page_size LIMIT page_size`
5. Execute count query (same WHERE, no LIMIT) for total
6. Return `PaginatedResult(items=pets, total=count, page=page, page_size=page_size)`

**Note:** Photos NOT included in list response (only in detail).

---

### `get_pet(pet_id: UUID) → PetDetail`

**Logic:**
1. Fetch pet via `PetRepository.get_by_id(pet_id)`
2. If not found → raise `NotFoundError`
3. Fetch photos via `PhotoRepository.get_by_pet(pet_id)`
4. Return PetDetail (pet fields + photos list with base64 encoded data or URL endpoint)

---

### `upload_photo(user_id: UUID, pet_id: UUID, file: UploadFile) → Photo`

**Preconditions:**
- User owns the pet
- Pet has < 3 photos
- File is JPG or PNG
- File size ≤ 5MB

**Logic:**
1. Fetch pet, validate `pet.publisher_id == user_id` → else `ForbiddenError`
2. Count photos: `PhotoRepository.count_by_pet(pet_id)`
3. If count ≥ 3 → raise `ValidationError("Maximum 3 photos per pet")`
4. Validate content_type ∈ {'image/jpeg', 'image/png'} → else `ValidationError`
5. Read file bytes, validate `len(bytes) <= 5_242_880` → else `ValidationError`
6. Create Photo: id=uuid4(), pet_id, data=bytes, filename, content_type, size_bytes=len(bytes)
7. Save via `PhotoRepository.create(photo)`
8. Return created Photo (without data field in response — just id, filename, content_type, size)

---

### `change_status(user_id: UUID, pet_id: UUID, new_status: PetStatus) → Pet`

**Preconditions:**
- User owns the pet
- Transition is valid

**Logic:**
1. Fetch pet, validate ownership
2. Validate transition (see BR-09 state machine):
   - Current AVAILABLE → new must be IN_PROCESS (but this is triggered by accept_request, not directly)
   - Current IN_PROCESS → new can be ADOPTED or AVAILABLE
   - Current ADOPTED → no transitions allowed → raise `ValidationError`
3. **If IN_PROCESS → ADOPTED:**
   a. Cancel all WAITLISTED requests for this pet: `AdoptionRequestRepository.bulk_update_status(pet_id, from='WAITLISTED', to='CANCELLED')`
   b. Update pet status to ADOPTED
4. **If IN_PROCESS → AVAILABLE (reactivate):**
   a. Cancel the ACCEPTED request: `AdoptionRequestRepository.cancel_accepted_for_pet(pet_id)`
   b. Reactivate WAITLISTED → SENT: `AdoptionRequestRepository.bulk_update_status(pet_id, from='WAITLISTED', to='SENT')`
   c. Update pet status to AVAILABLE
5. Save and return updated Pet

---

### `delete_pets_by_user(user_id: UUID) → List[UUID]`

**Logic:**
1. Get pet_ids: `PetRepository.list_ids_by_publisher(user_id)`
2. Return pet_ids (actual deletion handled by DB CASCADE on user delete)

---

## AdoptionService — Detailed Logic

### `create_request(adopter_id: UUID, pet_id: UUID, message: str?) → AdoptionRequest`

**Preconditions:**
- User role is ADOPTER
- Pet exists and status = AVAILABLE
- Adopter has < 3 active requests
- Adopter hasn't already sent active request to this pet
- Adopter is not the pet's publisher

**Logic:**
1. Fetch pet via `PetRepository.get_by_id(pet_id)`
2. If not found → raise `NotFoundError`
3. If `pet.status != AVAILABLE` → raise `ValidationError("Pet is not available for adoption")`
4. If `pet.publisher_id == adopter_id` → raise `ValidationError("Cannot adopt your own pet")`
5. Count active: `AdoptionRequestRepository.count_active_by_adopter(adopter_id)`
6. If count ≥ 3 → raise `ValidationError("Maximum 3 active requests reached")`
7. Check duplicate: `AdoptionRequestRepository.exists_active(adopter_id, pet_id)`
8. If exists → raise `ConflictError("You already have an active request for this pet")`
9. Create request: id=uuid4(), pet_id, adopter_id, publisher_id=pet.publisher_id, status=SENT, message
10. Save via `AdoptionRequestRepository.create(request)`
11. Return created request

---

### `accept_request(publisher_id: UUID, request_id: UUID) → AdoptionRequest`

**Preconditions:**
- Publisher owns the pet linked to this request
- Request status is SENT or IN_REVIEW
- No other ACCEPTED request exists for this pet

**Logic (transaction):**
1. Fetch request via `AdoptionRequestRepository.get_by_id(request_id)`
2. If not found → raise `NotFoundError`
3. Validate `request.publisher_id == publisher_id` → else `ForbiddenError`
4. Validate `request.status ∈ {SENT, IN_REVIEW}` → else `ValidationError("Cannot accept request in current status")`
5. Check no existing ACCEPTED: `AdoptionRequestRepository.exists_accepted_for_pet(request.pet_id)`
6. If exists → raise `ConflictError("Another request is already accepted for this pet")`
7. Update request status → ACCEPTED
8. Update pet status → IN_PROCESS: `PetRepository.update_status(request.pet_id, IN_PROCESS)`
9. Waitlist others: `AdoptionRequestRepository.waitlist_pending_for_pet(request.pet_id, exclude_id=request_id)`
   - Updates all requests for same pet where status IN (SENT, IN_REVIEW) → WAITLISTED
10. Commit transaction
11. Return updated request (with adopter contact info: email + phone)

---

### `reject_request(publisher_id: UUID, request_id: UUID) → AdoptionRequest`

**Preconditions:**
- Publisher owns the pet
- Request status is SENT, IN_REVIEW, or WAITLISTED

**Logic:**
1. Fetch request, validate ownership and status
2. Update status → REJECTED
3. Return updated request

---

### `cancel_request(adopter_id: UUID, request_id: UUID) → AdoptionRequest`

**Preconditions:**
- Adopter owns this request
- Request status is SENT or IN_REVIEW

**Logic:**
1. Fetch request via `AdoptionRequestRepository.get_by_id(request_id)`
2. Validate `request.adopter_id == adopter_id` → else `ForbiddenError`
3. Validate `request.status ∈ {SENT, IN_REVIEW}` → else `ValidationError("Cannot cancel in current status")`
4. Update status → CANCELLED
5. Return updated request

---

### `review_request(publisher_id: UUID, request_id: UUID) → AdoptionRequest`

**Preconditions:**
- Publisher owns the pet
- Request status is SENT

**Logic:**
1. Fetch request, validate ownership
2. Validate `request.status == SENT` → else `ValidationError`
3. Update status → IN_REVIEW
4. Return updated request

---

### `cancel_requests_by_adopter(adopter_id: UUID) → None`

**Logic:**
1. Bulk update: all requests where `adopter_id = :id` AND status IN ('SENT','IN_REVIEW','WAITLISTED') → CANCELLED
2. Execute via `AdoptionRequestRepository.cancel_by_adopter(adopter_id)`

---

### `cancel_requests_for_pets(pet_ids: List[UUID]) → None`

**Logic:**
1. Bulk update: all requests where `pet_id IN (:ids)` AND status IN ('SENT','IN_REVIEW','ACCEPTED','WAITLISTED') → CANCELLED
2. Execute via `AdoptionRequestRepository.cancel_by_pet_ids(pet_ids)`

---

## Cross-Cutting Logic

### JWT Token Structure

```json
{
  "sub": "uuid-of-user",
  "role": "ADOPTER|PUBLISHER|FOUNDATION",
  "exp": 1719756000,
  "iat": 1719669600
}
```

### get_current_user Dependency (FastAPI)

```python
async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    payload = decode_jwt(token)  # raises 401 if invalid/expired
    user = UserRepository.get_by_id(payload["sub"])
    if not user:
        raise HTTPException(401, "User not found")
    return user
```

### Error Response Format

```json
{
  "detail": "Human-readable error message",
  "code": "ERROR_CODE",
  "field": "field_name (optional, for validation errors)"
}
```

### Error Codes

| Code | HTTP Status | Description |
|---|---|---|
| `NOT_FOUND` | 404 | Resource not found |
| `FORBIDDEN` | 403 | Not authorized to perform action |
| `VALIDATION_ERROR` | 422 | Input validation failed |
| `CONFLICT` | 409 | Resource conflict (duplicate email, duplicate request) |
| `AUTHENTICATION_ERROR` | 401 | Invalid or expired credentials/token |
