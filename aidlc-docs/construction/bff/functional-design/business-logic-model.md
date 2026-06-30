# Business Logic Model — Unit 2: BFF

**Generated**: 2026-06-30
**Stage**: CONSTRUCTION — Functional Design
**Unit**: BFF (Backend For Frontend)

---

## Overview

The BFF is a **thin proxy/orchestration layer** between the Frontend and the Backend API. It does NOT contain business logic — that lives in the Backend. The BFF is responsible for:

1. **Auth orchestration**: Login/register flow, returning JWT + redirect info
2. **JWT validation**: Verifying tokens before forwarding requests
3. **Request forwarding**: Proxying all requests to the Backend API
4. **Response adaptation**: Optionally simplifying/transforming responses
5. **Error normalization**: Consistent error format for the frontend

---

## Auth Flow (Login)

```
Frontend                    BFF                         Backend API
   |                         |                              |
   |--POST /api/auth/login-->|                              |
   |   {email, password}     |                              |
   |                         |--POST /users/login---------->|
   |                         |   {email, password}          |
   |                         |                              |
   |                         |<--{access_token, role}-------|
   |                         |                              |
   |                         | Add redirect_url based on role
   |                         |                              |
   |<--{access_token, role,  |                              |
   |    redirect_url}--------|                              |
```

### Redirect Logic by Role

| Role | redirect_url |
|---|---|
| ADOPTER | `/catalog` |
| PUBLISHER | `/pets/mine` |
| FOUNDATION | `/pets/mine` |

---

## Auth Flow (Register)

```
Frontend                    BFF                         Backend API
   |                         |                              |
   |--POST /api/auth/register->|                            |
   |   {email,password,      |                              |
   |    confirm,role,name}   |                              |
   |                         |--POST /users/register------->|
   |                         |   {same payload}             |
   |                         |                              |
   |                         |<--{user created, 201}--------|
   |                         |                              |
   |                         | Auto-login: POST /users/login|
   |                         |--POST /users/login---------->|
   |                         |<--{access_token, role}-------|
   |                         |                              |
   |<--{access_token, role,  |                              |
   |    redirect_url, 201}---|                              |
```

After successful register, the BFF auto-authenticates and returns the token so the user doesn't have to login separately.

---

## Proxy Flow (All Other Requests)

```
Frontend                    BFF                         Backend API
   |                         |                              |
   |--GET /api/pets?...----->|                              |
   |   Authorization: Bearer |                              |
   |                         | Validate JWT (if present)    |
   |                         | Forward request with same    |
   |                         | headers + body               |
   |                         |                              |
   |                         |--GET /pets?...-------------->|
   |                         |   Authorization: Bearer      |
   |                         |                              |
   |                         |<--{response}-----------------|
   |                         |                              |
   |<--{response}------------|                              |
```

### Proxy Rules:
- **Public endpoints** (GET /pets, GET /pets/{id}): Forward without JWT validation
- **Protected endpoints**: Validate JWT expiration before forwarding (fail fast)
- **File uploads** (POST /pets/{id}/photos): Stream multipart data to backend
- **Photo serving** (GET /pets/{id}/photos/{pid}): Stream response back to frontend

---

## BFF Endpoint Mapping

| BFF Endpoint | Backend Endpoint | Auth Required | Special Logic |
|---|---|---|---|
| POST /api/auth/login | POST /users/login | No | Add redirect_url to response |
| POST /api/auth/register | POST /users/register + POST /users/login | No | Auto-login after register |
| GET /api/users/me | GET /users/me | Yes | Pure proxy |
| DELETE /api/users/me | DELETE /users/me | Yes | Clear session hint in response |
| GET /api/pets | GET /pets | No | Pure proxy |
| GET /api/pets/mine | GET /pets/mine | Yes | Pure proxy |
| GET /api/pets/{id} | GET /pets/{id} | No | Pure proxy |
| POST /api/pets | POST /pets | Yes | Pure proxy |
| PUT /api/pets/{id} | PUT /pets/{id} | Yes | Pure proxy |
| PATCH /api/pets/{id}/status | PATCH /pets/{id}/status | Yes | Pure proxy |
| POST /api/pets/{id}/photos | POST /pets/{id}/photos | Yes | Stream multipart |
| DELETE /api/pets/{id}/photos/{pid} | DELETE /pets/{id}/photos/{pid} | Yes | Pure proxy |
| GET /api/pets/{id}/photos/{pid} | GET /pets/{id}/photos/{pid} | No | Stream response |
| POST /api/pets/{id}/requests | POST /pets/{id}/requests | Yes | Pure proxy |
| GET /api/requests/mine | GET /requests/mine | Yes | Pure proxy |
| PATCH /api/requests/{id}/cancel | PATCH /requests/{id}/cancel | Yes | Pure proxy |
| GET /api/pets/{id}/requests | GET /pets/{id}/requests | Yes | Pure proxy |
| PATCH /api/requests/{id}/review | PATCH /requests/{id}/review | Yes | Pure proxy |
| PATCH /api/requests/{id}/accept | PATCH /requests/{id}/accept | Yes | Pure proxy |
| PATCH /api/requests/{id}/reject | PATCH /requests/{id}/reject | Yes | Pure proxy |

---

## JWT Validation Logic (BFF-side)

The BFF does a **lightweight validation** (decode + check expiration) before forwarding. The Backend API does the **full validation** (user exists, permissions).

```python
def validate_token_if_required(token: Optional[str], requires_auth: bool):
    if not requires_auth:
        return  # public endpoint, skip
    if not token:
        raise HTTPException(401, "Authentication required")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        # Check expiration (python-jose does this automatically)
    except JWTError:
        raise HTTPException(401, "Invalid or expired token")
```

---

## Error Normalization

The BFF catches Backend API errors and normalizes them:

```python
# Backend returns various error formats
# BFF ensures consistent format for frontend:
{
    "detail": "Human-readable message",
    "code": "ERROR_CODE",  # NOT_FOUND, FORBIDDEN, VALIDATION_ERROR, CONFLICT, AUTHENTICATION_ERROR
    "status": 404  # HTTP status code
}
```

If the Backend is unreachable → BFF returns 503 Service Unavailable.

---

## Configuration

| Variable | Value (local) | Purpose |
|---|---|---|
| BACKEND_URL | `http://backend:8000` | Backend API base URL (K8s DNS) |
| JWT_SECRET | `dev-secret-change-in-production` | Same secret as Backend (for validation) |
| PORT | `8001` | BFF listening port |
| PYTHONUNBUFFERED | `1` | Logging |
