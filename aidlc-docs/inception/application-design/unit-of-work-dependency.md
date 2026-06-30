# Unit of Work Dependencies — App de Adopción de Mascotas

**Generated**: 2026-06-30
**Stage**: INCEPTION — Units Generation

---

## Dependency Matrix

| Unit | Depends On (runtime) | Depends On (build) | Depended By |
|---|---|---|---|
| Backend API | PostgreSQL (DB) | — | BFF |
| BFF | Backend API | — | Frontend |
| Frontend | BFF | — | — |
| Infrastructure | — | Backend, BFF, Frontend (artifacts) | All (cloud deploy) |

---

## Dependency Chain

```
PostgreSQL (Helm chart, local)
      |
      v
Backend API (port 8000)
      |
      v
BFF (port 8001)
      |
      v
Frontend (port 3000)

[Separate path]
Infrastructure (CDK) → deploys all to AWS
```

---

## Development Order

| Orden | Unit | Justificación | Prerequisito |
|---|---|---|---|
| 1 | **Backend API** | Contiene toda la lógica de negocio y schema de DB. Sin backend, nada funciona. | PostgreSQL (via Garden Helm deploy) |
| 2 | **BFF** | Proxy al backend. Necesita backend funcionando para probar. | Backend API deployed locally |
| 3 | **Frontend** | UI que consume el BFF. Necesita BFF+Backend para flujos completos. | BFF deployed locally |
| 4 | **Infrastructure** | CDK para cloud. Solo se necesita cuando las 3 unidades de servicio funcionan localmente. | Backend + BFF + Frontend working locally |

---

## Garden Deploy Dependencies (Local Dev)

```yaml
# Dependency chain in Garden
deploy.db                    # PostgreSQL Helm (no dependencies)
deploy.backend               # depends: [build.backend, deploy.db]
deploy.bff                   # depends: [build.bff, deploy.backend]
deploy.frontend              # depends: [build.frontend, deploy.bff]
```

### Garden DAG (Build + Deploy)

```
build.backend ──→ deploy.backend ──────────────────┐
                       ↑                           │
                  deploy.db                        │
                                                   │
build.bff ─────→ deploy.bff ───────────────────────┤
                       ↑                           │
                  deploy.backend                   ├──→ (all running)
                                                   │
build.frontend ─→ deploy.frontend ─────────────────┘
                       ↑
                  deploy.bff
```

---

## Inter-Unit Communication

| From | To | Protocol | URL (local K8s) | Notes |
|---|---|---|---|---|
| Frontend | BFF | HTTP REST | `http://bff:8001` (via Ingress `/api`) | Frontend uses relative `/api/*` path |
| BFF | Backend | HTTP REST | `http://backend:8000` | Internal service DNS |
| Backend | PostgreSQL | TCP/SQL | `postgresql://postgres:password@db:5432/dog_keeper_db` | SQLAlchemy connection |

---

## Shared Resources

| Resource | Owner Unit | Used By | How |
|---|---|---|---|
| PostgreSQL schema | Backend API | Only Backend API | Direct SQL via SQLAlchemy |
| JWT Secret | Backend API (generates) | BFF (validates) | Shared env var / secret |
| API Contract | Backend API (defines) | BFF (consumes) | OpenAPI spec auto-generated |

---

## Testing Dependencies

| Test Type | Unit | Dependencies |
|---|---|---|
| Unit tests (Backend) | Backend API | None (mocked DB) |
| Unit tests (BFF) | BFF | None (mocked backend client) |
| Unit tests (Frontend) | Frontend | None (mocked API) |
| Integration tests | All | deploy.db + deploy.backend + deploy.bff + deploy.frontend |

---

## CONSTRUCTION Phase Execution Plan

For each unit in order, the CONSTRUCTION per-unit loop executes:

| Unit | Functional Design | Infrastructure Design | Code Generation |
|---|---|---|---|
| 1. Backend API | ✅ (models, state machine, business rules) | ✅ (Dockerfile, K8s manifests, garden.yml, DB Helm) | ✅ |
| 2. BFF | ✅ (proxy logic, auth flow, response adaptation) | ✅ (Dockerfile, K8s manifests, garden.yml) | ✅ |
| 3. Frontend | ✅ (components, pages, routing, API client) | ✅ (Dockerfile, K8s manifests, Ingress, garden.yml) | ✅ |
| 4. Infrastructure | ⏭️ SKIP (no business logic) | ✅ (CDK stacks design) | ✅ |

After all units: **Build and Test** (instructions for local Garden dev + unit/integration/e2e tests)
