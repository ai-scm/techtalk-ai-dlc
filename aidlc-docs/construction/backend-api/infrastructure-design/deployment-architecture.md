# Deployment Architecture — Unit 1: Backend API

**Generated**: 2026-06-30
**Stage**: CONSTRUCTION — Infrastructure Design
**Unit**: Backend API

---

## Local Development Architecture

```
Developer Machine
├── minikube (K8s cluster)
│   ├── NGINX Ingress Controller (managed by Garden)
│   │
│   ├── Pod: db (PostgreSQL 16)
│   │   └── Container: postgresql
│   │       ├── Port: 5432
│   │       └── No persistence (ephemeral)
│   │
│   ├── Pod: backend (FastAPI)
│   │   └── Container: backend
│   │       ├── Port: 8000
│   │       ├── Env: DATABASE_URL, JWT_SECRET, etc.
│   │       └── Sync: watchmedo auto-restart (hot-reload)
│   │
│   ├── Service: db (ClusterIP:5432)
│   └── Service: backend (ClusterIP:8000)
│
├── Docker daemon (minikube's)
│   ├── Image: backend (built by Garden)
│   └── Image: postgresql (pulled from Bitnami)
│
└── Garden.io (orchestrator)
    ├── Watches source files
    ├── Syncs changes to pod
    └── Triggers auto-restart via watchmedo
```

---

## Build Pipeline (Garden)

```
Source Code Change
       |
       v
Garden detects change (file watcher)
       |
       ├── If Dockerfile changed or new dependency:
       │       → garden build backend (rebuild image)
       │       → garden deploy backend (redeploy pod)
       │
       └── If .py file changed:
               → Garden sync (copies file to pod)
               → watchmedo detects change
               → uvicorn auto-restarts
```

---

## Deploy Dependencies (Garden DAG)

```
deploy.db (Helm: PostgreSQL)
    |
    v
deploy.backend (K8s manifests)
    - depends on: build.backend, deploy.db
    - waits for: db pod ready (readiness probe)
    - then: applies deployment.yml + service.yml
    - patches: image with built image ID
```

---

## Database Lifecycle (Local)

| Event | Behavior |
|---|---|
| `garden dev` (first time) | Helm installs PostgreSQL con PVC, backend crea tablas + ejecuta seed script |
| `garden dev` (subsequent) | PostgreSQL pod arranca con datos persistidos en PVC, seed detecta datos existentes y no hace nada |
| Pod restart (crash/redeploy) | Datos intactos (PVC persiste independiente del pod) |
| `minikube stop` + `start` | Datos intactos (PVC persiste en minikube) |
| `minikube delete` | Datos perdidos (PVC eliminado). Próximo `garden dev` → seed repopula |
| `garden cleanup namespace` | Datos perdidos (PVC eliminado). Próximo `garden dev` → seed repopula |

### Seed Script Behavior:
- **Idempotente**: verifica si la DB está vacía antes de insertar
- **Automático**: se ejecuta en el startup del backend (evento `on_startup`)
- **Datos útiles**: 5 usuarios (todos los roles), 8 mascotas (todos los estados), 12 fotos, 10 solicitudes (todos los estados)
- **Credenciales conocidas**: todos con password `password123` para facilitar testing manual

---

## File Structure (Final)

```
/backend/
├── garden.yml                  # Build + Deploy + Test actions
├── Dockerfile                  # python:3.11-slim + deps + uvicorn
├── manifests/
│   ├── deployment.yml          # K8s Deployment (port 8000, health probes, env vars)
│   └── service.yml             # K8s Service (ClusterIP)
├── requirements.txt            # Production dependencies
├── requirements-dev.txt        # Test dependencies
├── main.py                     # FastAPI app + create_all() + seed + health endpoint
├── seed.py                     # Seed script (datos de prueba, idempotente)
├── routers/                    # API endpoints
├── services/                   # Business logic
├── repositories/               # Data access
├── models/                     # SQLAlchemy models
├── schemas/                    # Pydantic schemas
├── core/                       # Config, security, exceptions, database
└── tests/                      # Unit tests
```

---

## Scaling Notes (Future — Cloud)

For Unit 4 (Infrastructure/CDK), the Backend API will be deployed as:
- **AWS Lambda** with API Gateway (or ECS Fargate if Lambda cold starts are problematic)
- **RDS PostgreSQL** (managed, multi-AZ if needed)
- **Secrets Manager** for JWT_SECRET and DATABASE_URL

The local K8s setup is designed to mirror the production topology (service-to-service DNS resolution, same env vars, same ports).
