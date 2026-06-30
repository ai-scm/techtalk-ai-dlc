# Domain Entities — Unit 2: BFF

**Generated**: 2026-06-30
**Stage**: CONSTRUCTION — Functional Design
**Unit**: BFF (Backend For Frontend)

---

## Overview

The BFF does NOT have its own database or domain entities. It operates on request/response objects that pass through between Frontend and Backend.

---

## BFF-Specific Types

### AuthLoginResponse (BFF enriches backend response)

```python
class AuthLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    redirect_url: str  # Added by BFF based on role
```

### AuthRegisterResponse (BFF enriches after auto-login)

```python
class AuthRegisterResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    redirect_url: str
    user_id: str
```

### ErrorResponse (BFF normalized error format)

```python
class ErrorResponse(BaseModel):
    detail: str
    code: str  # NOT_FOUND, FORBIDDEN, VALIDATION_ERROR, CONFLICT, AUTHENTICATION_ERROR, SERVICE_UNAVAILABLE
    status: int
```

---

## Backend Client Configuration

```python
class BFFSettings(BaseSettings):
    BACKEND_URL: str = "http://backend:8000"
    JWT_SECRET: str = "dev-secret-change-in-production"
    PORT: int = 8001
    PYTHONUNBUFFERED: str = "1"
    PYTHONDONTWRITEBYTECODE: str = "1"
```

---

## No Persistence

The BFF is completely stateless:
- No database tables
- No file storage
- No session store
- All state lives in JWT tokens (passed by frontend on each request)
