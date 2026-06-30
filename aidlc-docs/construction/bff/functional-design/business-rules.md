# Business Rules — Unit 2: BFF

**Generated**: 2026-06-30
**Stage**: CONSTRUCTION — Functional Design
**Unit**: BFF (Backend For Frontend)

---

## BR-BFF-01: Auth Orchestration

| Rule | Description |
|---|---|
| BR-BFF-01.1 | Login: forward credentials to backend, add `redirect_url` to response based on role |
| BR-BFF-01.2 | Register: forward to backend, then auto-login (call /users/login), return combined response with token + redirect |
| BR-BFF-01.3 | Redirect URLs: ADOPTER→`/catalog`, PUBLISHER→`/pets/mine`, FOUNDATION→`/pets/mine` |
| BR-BFF-01.4 | If backend returns auth error, forward as-is (don't reveal internal details) |

---

## BR-BFF-02: JWT Validation (Fail-Fast)

| Rule | Description |
|---|---|
| BR-BFF-02.1 | For protected endpoints: validate JWT signature + expiration BEFORE forwarding |
| BR-BFF-02.2 | For public endpoints: skip JWT validation entirely (pass through any headers) |
| BR-BFF-02.3 | Invalid/missing token on protected endpoint → 401 immediately (don't call backend) |
| BR-BFF-02.4 | BFF uses the SAME JWT_SECRET as Backend for validation |

---

## BR-BFF-03: Request Forwarding

| Rule | Description |
|---|---|
| BR-BFF-03.1 | Forward all headers from frontend to backend (especially Authorization) |
| BR-BFF-03.2 | Forward query parameters as-is |
| BR-BFF-03.3 | Forward request body as-is (JSON or multipart) |
| BR-BFF-03.4 | For multipart uploads: stream directly, do not buffer entire file in memory |
| BR-BFF-03.5 | Forward the HTTP method as-is (GET, POST, PUT, PATCH, DELETE) |

---

## BR-BFF-04: Response Handling

| Rule | Description |
|---|---|
| BR-BFF-04.1 | Forward backend response status code to frontend |
| BR-BFF-04.2 | Forward backend response body to frontend (JSON or streaming) |
| BR-BFF-04.3 | For photo serving: stream binary response with correct Content-Type header |
| BR-BFF-04.4 | If backend is unreachable → return 503 `{"detail": "Service temporarily unavailable", "code": "SERVICE_UNAVAILABLE"}` |

---

## BR-BFF-05: Error Normalization

| Rule | Description |
|---|---|
| BR-BFF-05.1 | All errors returned to frontend use consistent format: `{detail, code, status}` |
| BR-BFF-05.2 | Backend errors are forwarded with their original status code |
| BR-BFF-05.3 | BFF-originated errors (JWT invalid, backend unreachable) use same format |
| BR-BFF-05.4 | Never expose internal backend URLs or stack traces to frontend |

---

## BR-BFF-06: CORS & Security

| Rule | Description |
|---|---|
| BR-BFF-06.1 | BFF handles CORS for the frontend (allow origin from frontend host) |
| BR-BFF-06.2 | Backend does NOT need CORS (only receives requests from BFF, internal) |
| BR-BFF-06.3 | BFF strips sensitive internal headers before forwarding response to frontend |

---

## Public vs Protected Endpoints

| Endpoint Pattern | Auth Required |
|---|---|
| POST /api/auth/* | No (login/register) |
| GET /api/pets (list) | No |
| GET /api/pets/{id} (detail) | No |
| GET /api/pets/{id}/photos/{pid} | No |
| All other endpoints | Yes |
