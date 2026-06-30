# Business Rules — Unit 1: Backend API

**Generated**: 2026-06-30
**Stage**: CONSTRUCTION — Functional Design
**Unit**: Backend API

---

## BR-01: Registration Rules

| Rule | Description | Enforcement |
|---|---|---|
| BR-01.1 | Email must be unique across all users | DB UNIQUE constraint + service validation |
| BR-01.2 | Password must be ≥8 characters | Pydantic schema validation |
| BR-01.3 | Password and confirm_password must match | Pydantic schema validation |
| BR-01.4 | Role must be one of: ADOPTER, PUBLISHER, FOUNDATION | Enum validation |
| BR-01.5 | Role is immutable after registration | No update endpoint for role |
| BR-01.6 | Email is stored lowercase (case-insensitive login) | Service normalizes before save |

---

## BR-02: Authentication Rules

| Rule | Description | Enforcement |
|---|---|---|
| BR-02.1 | Login requires valid email + password combination | bcrypt.verify() in AuthService |
| BR-02.2 | JWT contains: user_id, role, exp (expiration) | JWT payload structure |
| BR-02.3 | JWT expires after 24 hours | exp claim in token |
| BR-02.4 | Invalid/expired JWT returns 401 Unauthorized | Middleware validation |
| BR-02.5 | Error messages never reveal if email exists | Generic "invalid credentials" on failure |

---

## BR-03: Pet Publication Rules

| Rule | Description | Enforcement |
|---|---|---|
| BR-03.1 | Only PUBLISHER or FOUNDATION roles can create pets | Role check in PetService |
| BR-03.2 | All mandatory fields required: name, species, size, age_group, location, health_status, description | Pydantic schema |
| BR-03.3 | Species, size, age_group must be valid enum values | Enum validation |
| BR-03.4 | New pets always start with status = AVAILABLE | Service sets default |
| BR-03.5 | Only the pet's publisher can edit the pet | Ownership check: user.id == pet.publisher_id |
| BR-03.6 | Cannot edit a pet with status ADOPTED | Status check in PetService |

---

## BR-04: Photo Rules

| Rule | Description | Enforcement |
|---|---|---|
| BR-04.1 | Maximum 3 photos per pet | Count check before insert |
| BR-04.2 | Maximum file size: 5 MB (5,242,880 bytes) | Pydantic + DB CHECK constraint |
| BR-04.3 | Only JPG (image/jpeg) and PNG (image/png) accepted | Content-type validation |
| BR-04.4 | Only the pet's publisher can upload/delete photos | Ownership check |
| BR-04.5 | Photos are stored as raw binary (bytea) | Repository stores bytes directly |

---

## BR-05: Catalog & Filter Rules

| Rule | Description | Enforcement |
|---|---|---|
| BR-05.1 | Catalog only shows pets with status = AVAILABLE | WHERE clause in query |
| BR-05.2 | Default sort: created_at DESC (newest first) | ORDER BY in query |
| BR-05.3 | Pagination: offset-based (page + page_size, default 20, max 100) | Query params validation |
| BR-05.4 | Filters: species, location (via SQL index), size, age_group (via WHERE) | SQL conditions |
| BR-05.5 | Catalog is publicly accessible (no auth required) | No JWT dependency on GET /pets |
| BR-05.6 | Pet detail is publicly accessible | No JWT dependency on GET /pets/{id} |

---

## BR-06: Adoption Request Rules

| Rule | Description | Enforcement |
|---|---|---|
| BR-06.1 | Only ADOPTER role can create requests | Role check |
| BR-06.2 | Maximum 3 active requests per adopter simultaneously | Count WHERE status IN ('SENT','IN_REVIEW','WAITLISTED') |
| BR-06.3 | Cannot send request to a pet not in AVAILABLE status | Pet status check |
| BR-06.4 | Cannot send duplicate request (same adopter + same pet, if active exists) | Unique constraint check |
| BR-06.5 | New requests start with status = SENT | Service sets default |
| BR-06.6 | Adopter cannot send request to their own pet | adopter_id != pet.publisher_id check |

---

## BR-07: Request Management Rules (Publisher Actions)

| Rule | Description | Enforcement |
|---|---|---|
| BR-07.1 | Only the pet's publisher can manage requests for that pet | publisher_id check |
| BR-07.2 | Review: SENT → IN_REVIEW | Status transition validation |
| BR-07.3 | Accept: SENT or IN_REVIEW → ACCEPTED | Status transition validation |
| BR-07.4 | Reject: SENT, IN_REVIEW, or WAITLISTED → REJECTED | Status transition validation |
| BR-07.5 | On Accept: pet status changes to IN_PROCESS | Side effect in AdoptionService |
| BR-07.6 | On Accept: all OTHER pending requests for same pet → WAITLISTED | Bulk update side effect |
| BR-07.7 | On Reject: adopter's active request count decreases (freed quota) | Implicit by status change |
| BR-07.8 | Only one ACCEPTED request per pet at a time | Validation before accept |

---

## BR-08: Request Cancellation Rules (Adopter Actions)

| Rule | Description | Enforcement |
|---|---|---|
| BR-08.1 | Adopter can cancel their own request if status is SENT or IN_REVIEW | Status + ownership check |
| BR-08.2 | Cannot cancel ACCEPTED, REJECTED, or already CANCELLED requests | Status validation |
| BR-08.3 | Cancellation frees one slot of the adopter's 3-request quota | Implicit by status change |

---

## BR-09: Pet Status Transition Rules

### State Machine

```
          create
            |
            v
      +-----------+         accept request        +-------------+        confirm adoption      +----------+
      | AVAILABLE | ─────────────────────────────> | IN_PROCESS  | ──────────────────────────> | ADOPTED  |
      +-----------+                                +-------------+                              +----------+
            ^                                            |
            |                reactivate                  |
            └────────────────────────────────────────────┘
```

| Transition | Trigger | Preconditions | Side Effects |
|---|---|---|---|
| AVAILABLE → IN_PROCESS | Publisher accepts a request | Pet has at least one request in SENT/IN_REVIEW | Other pending requests → WAITLISTED |
| IN_PROCESS → ADOPTED | Publisher confirms adoption | Pet has exactly one ACCEPTED request | WAITLISTED requests → CANCELLED |
| IN_PROCESS → AVAILABLE | Publisher reactivates | Pet is in IN_PROCESS | ACCEPTED request → CANCELLED; WAITLISTED → restore to SENT |

### Invalid Transitions (blocked)
- AVAILABLE → ADOPTED (must go through IN_PROCESS)
- ADOPTED → any state (terminal state)
- IN_PROCESS → IN_PROCESS (no-op)

---

## BR-10: Account Deletion Rules

| Rule | Description | Enforcement |
|---|---|---|
| BR-10.1 | Any user can delete their own account | Identity check (JWT user_id) |
| BR-10.2 | Deletion requires explicit confirmation (handled by frontend/BFF) | N/A for backend |
| BR-10.3 | **Adopter deletion cascade**: All active requests → CANCELLED, then user deleted | AuthService orchestrates |
| BR-10.4 | **Publisher/Foundation deletion cascade**: All pets deleted, all requests to those pets → CANCELLED, all photos deleted, then user deleted | AuthService orchestrates |
| BR-10.5 | DB CASCADE handles cleanup if application cascade fails (safety net) | FK ON DELETE CASCADE |

### Deletion Cascade Flow (Publisher/Foundation)

```
1. Get all pet_ids owned by user
2. For each pet: cancel all non-terminal requests (SENT, IN_REVIEW, ACCEPTED, WAITLISTED → CANCELLED)
3. Delete all photos for those pets (via DB CASCADE when pet is deleted)
4. Delete all pets (DB CASCADE deletes photos + requests)
5. Cancel any requests where user is adopter (if they also adopted)
6. Delete user record
```

---

## BR-11: Contact Information Sharing

| Rule | Description | Enforcement |
|---|---|---|
| BR-11.1 | Adopter's email and phone are shared with publisher ONLY when request is ACCEPTED | Response includes contact info only for ACCEPTED requests |
| BR-11.2 | Publisher's contact info is NOT shared with adopter (external contact channels) | Not included in response |
| BR-11.3 | Contact info is visible to publisher in the request detail view | Conditional field in response schema |

---

## BR-12: Active Request Definition

"Active" requests count toward the adopter's limit of 3:

| Status | Counts as Active? | Rationale |
|---|---|---|
| SENT | ✅ Yes | Pending decision |
| IN_REVIEW | ✅ Yes | Being evaluated |
| WAITLISTED | ✅ Yes | Still has chance |
| ACCEPTED | ❌ No | Process concluded for this request |
| REJECTED | ❌ No | Closed |
| CANCELLED | ❌ No | Closed |
