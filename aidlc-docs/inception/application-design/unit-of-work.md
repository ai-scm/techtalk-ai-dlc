# Units of Work — App de Adopción de Mascotas

**Generated**: 2026-06-30
**Stage**: INCEPTION — Units Generation

---

## Overview

| Unit | Nombre | Tecnología | Puerto (dev) | Deploy Target |
|---|---|---|---|---|
| 1 | Backend API | Python 3.12 + FastAPI + SQLAlchemy | 8000 | Lambda (cloud) / K8s pod (local) |
| 2 | BFF | Python 3.12 + FastAPI + httpx | 8001 | Lambda (cloud) / K8s pod (local) |
| 3 | Frontend | TypeScript + React + Tailwind | 3000 | S3+CloudFront (cloud) / K8s pod (local) |
| 4 | Infrastructure | TypeScript + AWS CDK | — | CloudFormation stacks |

**Development Order**: Backend → BFF → Frontend → Infrastructure (AWS)

**Local Dev**: Garden.io + Minikube. Each service unit includes Dockerfile + K8s manifests + garden.yml.

---

## Unit 1: Backend API

| Campo | Detalle |
|---|---|
| **Directorio** | `/backend/` |
| **Tecnología** | Python 3.12, FastAPI, SQLAlchemy, Pydantic, bcrypt, PyJWT |
| **Puerto** | 8000 |
| **Responsabilidad** | Toda la lógica de negocio, autenticación, acceso a datos, gestión de fotos |
| **DB** | PostgreSQL (schema + migrations gestionados aquí) |

### Estructura interna
```
/backend/
├── garden.yml              # Garden Build + Deploy + Test actions
├── Dockerfile              # Python 3.11-slim, uvicorn
├── manifests/
│   ├── deployment.yml      # K8s Deployment (port 8000)
│   └── service.yml         # K8s Service (ClusterIP)
├── requirements.txt        # Dependencias de producción
├── requirements-dev.txt    # pytest, etc.
├── main.py                 # FastAPI app entrypoint
├── routers/
│   ├── users.py
│   ├── pets.py
│   └── requests.py
├── services/
│   ├── auth_service.py
│   ├── pet_service.py
│   └── adoption_service.py
├── repositories/
│   ├── user_repository.py
│   ├── pet_repository.py
│   ├── photo_repository.py
│   └── adoption_request_repository.py
├── models/
│   ├── user.py
│   ├── pet.py
│   ├── photo.py
│   └── adoption_request.py
├── schemas/
│   ├── user.py
│   ├── pet.py
│   ├── photo.py
│   └── request.py
├── core/
│   ├── database.py         # SQLAlchemy engine + session
│   ├── security.py         # bcrypt + JWT helpers
│   ├── exceptions.py       # Custom exception classes
│   └── config.py           # Settings (env vars)
└── tests/
    └── ...
```

### Garden Actions
- **Build**: `container` (Dockerfile)
- **Deploy**: `kubernetes` (manifests/*)
- **Test**: `container` (unit tests with pytest)
- **Sync**: one-way-replica + watchmedo auto-restart

---

## Unit 2: BFF (Backend For Frontend)

| Campo | Detalle |
|---|---|
| **Directorio** | `/bff/` |
| **Tecnología** | Python 3.12, FastAPI, httpx (HTTP client) |
| **Puerto** | 8001 |
| **Responsabilidad** | Proxy de requests, auth orchestration, response adaptation, redirect logic |
| **Dependencia runtime** | Backend API (HTTP, `http://backend:8000` en K8s) |

### Estructura interna
```
/bff/
├── garden.yml              # Garden Build + Deploy + Test actions
├── Dockerfile              # Python 3.11-slim, uvicorn
├── manifests/
│   ├── deployment.yml      # K8s Deployment (port 8001)
│   └── service.yml         # K8s Service (ClusterIP)
├── requirements.txt
├── requirements-dev.txt
├── main.py                 # FastAPI app entrypoint
├── routers/
│   ├── auth.py             # Login/register orchestration
│   ├── pets.py             # Proxy pet operations
│   ├── requests.py         # Proxy adoption request operations
│   └── users.py            # Proxy user operations
├── middleware/
│   └── auth.py             # JWT validation dependency
├── client/
│   └── backend_client.py   # httpx client for Backend API calls
├── core/
│   └── config.py           # BACKEND_URL, JWT_SECRET, etc.
└── tests/
    └── ...
```

### Garden Actions
- **Build**: `container` (Dockerfile)
- **Deploy**: `kubernetes` (manifests/*), depends on `deploy.backend`
- **Test**: `container` (unit tests)
- **Sync**: one-way-replica + watchmedo auto-restart

---

## Unit 3: Frontend

| Campo | Detalle |
|---|---|
| **Directorio** | `/frontend/` |
| **Tecnología** | TypeScript 5.x, React, Tailwind CSS, Next.js (o Vite) |
| **Puerto** | 3000 |
| **Responsabilidad** | UI, navegación, formularios, llamadas al BFF |
| **Dependencia runtime** | BFF (HTTP, `/api` prefix via Ingress) |

### Estructura interna
```
/frontend/
├── garden.yml              # Garden Build + Deploy actions
├── Dockerfile              # node:20-alpine, multi-stage
├── manifests/
│   ├── deployment.yml      # K8s Deployment (port 3000)
│   ├── service.yml         # K8s Service (ClusterIP)
│   └── ingress.yml         # Ingress: / → frontend, /api → bff
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── src/
│   ├── app/                # App shell, routing
│   ├── features/
│   │   ├── auth/           # LoginPage, RegisterPage, useAuth
│   │   ├── catalog/        # CatalogPage, PetCard, PetDetailPage, FilterBar
│   │   ├── publishing/     # MyPetsPage, CreatePetPage, EditPetPage, PhotoUploader
│   │   └── adoption/       # MyRequestsPage, PetRequestsPage, RequestCard
│   ├── components/         # Shared UI components
│   ├── hooks/              # Shared hooks
│   └── services/           # API client (calls /api/*)
└── tests/
    └── ...
```

### Garden Actions
- **Build**: `container` with `targetStage: development` (local) / `runner` (prod)
- **Deploy**: `kubernetes` (manifests/* + ingress), depends on `deploy.bff`
- **Sync**: one-way-replica on `src/`, `npm run dev`
- **Port-forward**: localhost:3000

---

## Unit 4: Infrastructure (AWS CDK)

| Campo | Detalle |
|---|---|
| **Directorio** | `/infra/` |
| **Tecnología** | TypeScript 5.x, AWS CDK |
| **Responsabilidad** | Definir y desplegar recursos AWS para producción/staging |
| **Cuándo se desarrolla** | ÚLTIMO — después de que las 3 unidades de servicio funcionan localmente con Garden |

### Estructura interna
```
/infra/
├── package.json
├── tsconfig.json
├── cdk.json
├── bin/
│   └── app.ts              # CDK app entrypoint
├── lib/
│   ├── database-stack.ts   # RDS PostgreSQL
│   ├── backend-stack.ts    # Lambda + API Gateway (backend)
│   ├── bff-stack.ts        # Lambda + API Gateway (BFF)
│   ├── frontend-stack.ts   # S3 + CloudFront
│   └── networking-stack.ts # VPC, Security Groups
└── test/
    └── ...
```

### No Garden actions — CDK se despliega con `cdk deploy`, no con Garden.

---

## Project-Level Files

```
/ (workspace root)
├── project.garden.yml      # Garden project config (apiVersion: garden.io/v2)
├── .gitignore
├── README.md
├── backend/                # Unit 1
├── bff/                    # Unit 2
├── frontend/               # Unit 3
└── infra/                  # Unit 4
```

### project.garden.yml (local dev orchestration)
- `kind: Project`, `name: dog-keeper`
- Environment: `local` with Minikube context
- Provider: `local-kubernetes` with `buildMode: local-docker`
- Variables: `postgresUsername`, `postgresDatabase`, `postgresPassword`
- DB deploy: Helm chart (bitnami/postgresql) para desarrollo local

---

## Local Development Flow

1. `minikube start --addons=ingress`
2. `eval $(minikube -p minikube docker-env)`
3. `garden dev` → builds, deploys, syncs all services + DB
4. Access via `http://dog-keeper.local.app.garden` or `localhost:3000` (port-forward)

---

## Cloud Deployment Flow (future, Unit 4)

1. `cd infra && npm install`
2. `cdk deploy --all`
3. Deploys: VPC → RDS → Backend Lambda → BFF Lambda → Frontend S3+CF
