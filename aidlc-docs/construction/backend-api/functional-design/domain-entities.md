# Domain Entities — Unit 1: Backend API

**Generated**: 2026-06-30
**Stage**: CONSTRUCTION — Functional Design
**Unit**: Backend API

---

## Entity Relationship Diagram (Text)

```
+------------------+       1:N       +------------------+       1:N       +------------------+
|      User        | ─────────────> |       Pet        | ─────────────> |      Photo       |
+------------------+                 +------------------+                 +------------------+
| PK: id (UUID)   |                 | PK: id (UUID)   |                 | PK: id (UUID)   |
| email (unique)   |                 | FK: publisher_id |                 | FK: pet_id       |
| password_hash    |                 | name             |                 | data (bytea)     |
| role (enum)      |                 | species (enum)   |                 | filename         |
| phone            |                 | size (enum)      |                 | content_type     |
| created_at       |                 | age_group (enum) |                 | size_bytes       |
+------------------+                 | location         |                 | created_at       |
        |                            | health_status    |                 +------------------+
        |                            | description      |
        |        1:N                 | status (enum)    |
        └──────────────────────────> | created_at       |
         (as adopter)                | updated_at       |
                |                    +------------------+
                |                            |
                |                            | 1:N
                v                            v
        +----------------------------------------------+
        |            AdoptionRequest                    |
        +----------------------------------------------+
        | PK: id (UUID)                                |
        | FK: pet_id                                   |
        | FK: adopter_id                               |
        | FK: publisher_id (denormalized for queries)  |
        | status (enum)                                |
        | message (text, optional)                     |
        | created_at                                   |
        | updated_at                                   |
        +----------------------------------------------+
```

---

## Table: `users`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | PK, DEFAULT uuid_generate_v4() | |
| `email` | `VARCHAR(255)` | NOT NULL, UNIQUE | Login identifier |
| `password_hash` | `VARCHAR(255)` | NOT NULL | bcrypt hash |
| `role` | `VARCHAR(20)` | NOT NULL, CHECK (role IN ('ADOPTER','PUBLISHER','FOUNDATION')) | Immutable after creation |
| `name` | `VARCHAR(100)` | NOT NULL | Display name |
| `phone` | `VARCHAR(20)` | NULL | Shared with publisher on accept |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | NOT NULL, DEFAULT NOW() | |

### Indexes
- `users_pkey` — PRIMARY KEY (`id`)
- `users_email_key` — UNIQUE (`email`)

---

## Table: `pets`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | PK, DEFAULT uuid_generate_v4() | |
| `publisher_id` | `UUID` | NOT NULL, FK → users(id) ON DELETE CASCADE | Owner |
| `name` | `VARCHAR(100)` | NOT NULL | Pet name |
| `species` | `VARCHAR(20)` | NOT NULL, CHECK (species IN ('DOG','CAT','BIRD','RABBIT','OTHER')) | Normalized |
| `size` | `VARCHAR(20)` | NOT NULL, CHECK (size IN ('SMALL','MEDIUM','LARGE')) | |
| `age_group` | `VARCHAR(20)` | NOT NULL, CHECK (age_group IN ('PUPPY','YOUNG','ADULT','SENIOR')) | |
| `location` | `VARCHAR(100)` | NOT NULL | City/zone |
| `health_status` | `VARCHAR(255)` | NOT NULL | Free text description |
| `description` | `TEXT` | NOT NULL | Detailed description |
| `status` | `VARCHAR(20)` | NOT NULL, DEFAULT 'AVAILABLE', CHECK (status IN ('AVAILABLE','IN_PROCESS','ADOPTED')) | |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | NOT NULL, DEFAULT NOW() | |
| `updated_at` | `TIMESTAMP WITH TIME ZONE` | NOT NULL, DEFAULT NOW() | Updated on any change |

### Indexes
- `pets_pkey` — PRIMARY KEY (`id`)
- `pets_publisher_id_idx` — INDEX (`publisher_id`)
- `pets_status_species_idx` — INDEX (`status`, `species`) — for catalog filter by species
- `pets_status_location_idx` — INDEX (`status`, `location`) — for catalog filter by location
- `pets_status_created_idx` — INDEX (`status`, `created_at` DESC) — for catalog default sort

---

## Table: `photos`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | PK, DEFAULT uuid_generate_v4() | |
| `pet_id` | `UUID` | NOT NULL, FK → pets(id) ON DELETE CASCADE | |
| `data` | `BYTEA` | NOT NULL | Raw image binary |
| `filename` | `VARCHAR(255)` | NOT NULL | Original filename |
| `content_type` | `VARCHAR(50)` | NOT NULL, CHECK (content_type IN ('image/jpeg','image/png')) | |
| `size_bytes` | `INTEGER` | NOT NULL, CHECK (size_bytes <= 5242880) | Max 5MB = 5*1024*1024 |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | NOT NULL, DEFAULT NOW() | |

### Indexes
- `photos_pkey` — PRIMARY KEY (`id`)
- `photos_pet_id_idx` — INDEX (`pet_id`)

### Application-Level Constraint
- Max 3 photos per pet (enforced in PetService, not DB constraint)

---

## Table: `adoption_requests`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | PK, DEFAULT uuid_generate_v4() | |
| `pet_id` | `UUID` | NOT NULL, FK → pets(id) ON DELETE CASCADE | |
| `adopter_id` | `UUID` | NOT NULL, FK → users(id) ON DELETE CASCADE | |
| `publisher_id` | `UUID` | NOT NULL, FK → users(id) ON DELETE CASCADE | Denormalized for query efficiency |
| `status` | `VARCHAR(20)` | NOT NULL, DEFAULT 'SENT', CHECK (status IN ('SENT','IN_REVIEW','ACCEPTED','REJECTED','WAITLISTED','CANCELLED')) | |
| `message` | `TEXT` | NULL | Optional message from adopter |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | NOT NULL, DEFAULT NOW() | |
| `updated_at` | `TIMESTAMP WITH TIME ZONE` | NOT NULL, DEFAULT NOW() | |

### Indexes
- `adoption_requests_pkey` — PRIMARY KEY (`id`)
- `adoption_requests_pet_id_idx` — INDEX (`pet_id`)
- `adoption_requests_adopter_id_idx` — INDEX (`adopter_id`)
- `adoption_requests_publisher_id_idx` — INDEX (`publisher_id`)
- `adoption_requests_adopter_active_idx` — INDEX (`adopter_id`, `status`) WHERE status IN ('SENT','IN_REVIEW','WAITLISTED') — for counting active requests

### Unique Constraint
- `adoption_requests_unique_adopter_pet` — UNIQUE (`adopter_id`, `pet_id`) WHERE status NOT IN ('CANCELLED','REJECTED') — prevents duplicate active requests

---

## Enums (Application-Level)

### UserRole
```python
class UserRole(str, Enum):
    ADOPTER = "ADOPTER"
    PUBLISHER = "PUBLISHER"
    FOUNDATION = "FOUNDATION"
```

### PetSpecies
```python
class PetSpecies(str, Enum):
    DOG = "DOG"
    CAT = "CAT"
    BIRD = "BIRD"
    RABBIT = "RABBIT"
    OTHER = "OTHER"
```

### PetSize
```python
class PetSize(str, Enum):
    SMALL = "SMALL"
    MEDIUM = "MEDIUM"
    LARGE = "LARGE"
```

### PetAgeGroup
```python
class PetAgeGroup(str, Enum):
    PUPPY = "PUPPY"
    YOUNG = "YOUNG"
    ADULT = "ADULT"
    SENIOR = "SENIOR"
```

### PetStatus
```python
class PetStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    IN_PROCESS = "IN_PROCESS"
    ADOPTED = "ADOPTED"
```

### RequestStatus
```python
class RequestStatus(str, Enum):
    SENT = "SENT"
    IN_REVIEW = "IN_REVIEW"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    WAITLISTED = "WAITLISTED"
    CANCELLED = "CANCELLED"
```

---

## Cascade Behavior (ON DELETE)

| Parent | Child | ON DELETE | Behavior |
|---|---|---|---|
| `users` | `pets` | CASCADE | Deleting user deletes all their pets |
| `users` | `adoption_requests` (adopter_id) | CASCADE | Deleting adopter deletes their requests |
| `users` | `adoption_requests` (publisher_id) | CASCADE | Deleting publisher deletes requests to their pets |
| `pets` | `photos` | CASCADE | Deleting pet deletes its photos |
| `pets` | `adoption_requests` | CASCADE | Deleting pet deletes its requests |

**Note**: Application-level cascade logic (in AuthService) handles additional business rules (e.g., changing request statuses to CANCELLED before delete, freeing adopter quotas). The DB CASCADE is a safety net.
