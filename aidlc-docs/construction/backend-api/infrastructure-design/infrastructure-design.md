# Infrastructure Design — Unit 1: Backend API

**Generated**: 2026-06-30
**Stage**: CONSTRUCTION — Infrastructure Design
**Unit**: Backend API
**Environment**: Local Development (Garden.io + Minikube)

---

## Overview

La infraestructura del Backend API para desarrollo local se compone de:

| Componente | Tecnología | Propósito |
|---|---|---|
| Dockerfile | python:3.11-slim | Imagen del servicio backend |
| K8s Deployment | deployment.yml | Pod del backend (port 8000) |
| K8s Service | service.yml | ClusterIP para acceso interno |
| Garden Build | garden.yml (Build) | Construir imagen Docker |
| Garden Deploy | garden.yml (Deploy) | Deploy + sync + hot-reload |
| Garden Test | garden.yml (Test) | Tests unitarios en contenedor efímero |
| PostgreSQL | Helm chart (bitnami) | Base de datos local |

---

## Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependencias Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código
COPY . .

# Crear usuario no-root
RUN useradd --create-home --shell /bin/bash app && \
    chown -R app:app /app
USER app

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Notas del Dockerfile:
- `libpq5` requerido para psycopg2-binary (driver PostgreSQL)
- `curl` para health checks
- Usuario no-root (`app`, UID 1000) por seguridad
- `python:3.11-slim` como imagen base (consistente con steering docs)

---

## Kubernetes Manifests

### `manifests/deployment.yml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  replicas: 1
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
        - name: backend
          image: backend
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 8000
              name: http
              protocol: TCP
          env:
            - name: DATABASE_URL
              value: "postgresql://postgres:password@db:5432/dog_keeper_db"
            - name: PYTHONUNBUFFERED
              value: "1"
            - name: JWT_SECRET
              value: "dev-secret-change-in-production"
            - name: JWT_EXPIRATION_HOURS
              value: "24"
          command:
            - sh
            - -c
            - "uvicorn main:app --host 0.0.0.0 --port 8000"
          livenessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 30
            periodSeconds: 30
            timeoutSeconds: 10
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 10
            periodSeconds: 10
            timeoutSeconds: 10
            failureThreshold: 3
          resources:
            limits:
              memory: 512Mi
              cpu: 500m
            requests:
              cpu: 100m
              memory: 256Mi
          securityContext:
            allowPrivilegeEscalation: false
            runAsNonRoot: true
            runAsUser: 1000
      restartPolicy: Always
```

### `manifests/service.yml`

```yaml
apiVersion: v1
kind: Service
metadata:
  name: backend
spec:
  type: ClusterIP
  ports:
    - name: http
      port: 8000
      protocol: TCP
      targetPort: 8000
  selector:
    app: backend
```

---

## Garden Configuration (`garden.yml`)

```yaml
kind: Build
name: backend
type: container
description: Build the backend API image

---
kind: Deploy
name: backend
type: kubernetes
description: Deploy the backend API
dependencies:
  - build.backend
  - deploy.db
spec:
  manifestFiles: [./manifests/*]
  defaultTarget:
    kind: Deployment
    name: backend
  patchResources:
    - kind: Deployment
      name: backend
      patch:
        spec:
          template:
            spec:
              containers:
                - name: backend
                  image: ${actions.build.backend.outputs.deploymentImageId}
  sync:
    paths:
      - sourcePath: .
        containerPath: /app
        mode: one-way-replica
        exclude: [.venv, __pycache__, "*.pyc", .pytest_cache, tests]
    overrides:
      - command:
          - /bin/sh
          - -c
          - >
            watchmedo auto-restart
            --directory=/app
            --pattern="*.py"
            --recursive
            -- uvicorn main:app --host 0.0.0.0 --port 8000 --reload

---
kind: Test
name: unit-backend
type: container
description: Unit test the backend API
dependencies: [build.backend]
spec:
  image: ${actions.build.backend.outputs.deploymentImageId}
  args: ["/bin/sh", "-c", "pip install -r requirements-dev.txt && python -m pytest -v"]
```

---

## PostgreSQL (Helm Deploy — project-level)

Definido en `project.garden.yml` o un `db/garden.yml` separado:

```yaml
kind: Deploy
name: db
type: helm
description: Deploy a PostgreSQL database for local development
spec:
  chart:
    name: postgresql
    repo: https://charts.bitnami.com/bitnami
    version: 15.5.21
  values:
    fullnameOverride: db
    image:
      registry: docker.io
      repository: bitnami/postgresql
      tag: 16.3.0-debian-12-r23
      pullPolicy: IfNotPresent
    auth:
      username: postgres
      database: dog_keeper_db
      postgresPassword: password
    primary:
      persistence:
        enabled: true
        size: 1Gi
      resources:
        limits:
          memory: 512Mi
          cpu: 500m
        requests:
          memory: 256Mi
          cpu: 100m
```

### Notas:
- `fullnameOverride: db` — el servicio DNS es simplemente `db` en el cluster
- **`persistence.enabled: true`** — los datos sobreviven restarts de pods y reinicios de `garden dev`
- `size: 1Gi` — suficiente para la POC (usuarios + mascotas + fotos bytea)
- Los datos se pierden solo si se ejecuta `minikube delete` o `garden cleanup namespace`
- Connection string: `postgresql://postgres:password@db:5432/dog_keeper_db`

---

## Seed Script (Datos de Prueba)

El Backend incluye un script de seed que popula la DB con datos de prueba cuando está vacía. Se ejecuta automáticamente al iniciar la aplicación.

### Estrategia:
1. Al startup, después de `create_all()`, verificar si la tabla `users` está vacía
2. Si está vacía → ejecutar seed con datos de prueba
3. Si ya tiene datos → no hacer nada (idempotente)

### Archivo: `seed.py`

```python
"""
Seed script — popula la DB con datos de prueba para desarrollo local.
Se ejecuta automáticamente al iniciar si la DB está vacía.
"""

def seed_database(db_session):
    """Seed only if DB is empty (idempotent)."""
    from models.user import User
    
    user_count = db_session.query(User).count()
    if user_count > 0:
        return  # DB already has data, skip
    
    # Crear usuarios de prueba (uno por rol)
    # Crear mascotas de prueba con distintos estados
    # Crear solicitudes en distintos estados
    # Crear fotos de ejemplo
    ...
```

### Datos de prueba incluidos:

| Entidad | Cantidad | Detalle |
|---|---|---|
| Usuarios | 5 | 2 adoptantes, 2 publicadores, 1 fundación |
| Mascotas | 8 | 5 AVAILABLE, 2 IN_PROCESS, 1 ADOPTED (variedad de especie/tamaño/ubicación) |
| Fotos | 12 | 1-3 fotos por mascota (imágenes placeholder pequeñas) |
| Solicitudes | 10 | Variedad de estados: SENT, IN_REVIEW, ACCEPTED, WAITLISTED, REJECTED, CANCELLED |

### Credenciales de prueba:

| Email | Password | Rol |
|---|---|---|
| `adopter1@test.com` | `password123` | ADOPTER |
| `adopter2@test.com` | `password123` | ADOPTER |
| `publisher1@test.com` | `password123` | PUBLISHER |
| `publisher2@test.com` | `password123` | PUBLISHER |
| `foundation1@test.com` | `password123` | FOUNDATION |

### Integración en `main.py`:

```python
@app.on_event("startup")
async def startup():
    # 1. Crear tablas si no existen
    Base.metadata.create_all(bind=engine)
    
    # 2. Seed si la DB está vacía
    with SessionLocal() as db:
        seed_database(db)
        db.commit()
```

---

## Database Schema Initialization

El Backend API debe crear las tablas al iniciar (o via migraciones). Opciones:

### Opción A: SQLAlchemy `create_all()` (POC)
```python
# En main.py o startup event
from core.database import engine, Base
from models import user, pet, photo, adoption_request  # importar para registrar modelos

Base.metadata.create_all(bind=engine)
```

### Opción B: Alembic migrations (producción-ready)
```
alembic/
├── env.py
├── versions/
│   └── 001_initial_schema.py
└── alembic.ini
```

**Decisión para POC**: Usar `create_all()` al startup. Simple y suficiente para desarrollo local.

---

## Health Check Endpoint

```python
@app.get("/health")
async def health():
    return {"status": "ok"}
```

Requerido por las probes de Kubernetes (liveness + readiness).

---

## Environment Variables

| Variable | Valor (local dev) | Propósito |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:password@db:5432/dog_keeper_db` | Connection string |
| `PYTHONUNBUFFERED` | `1` | Output sin buffer para logs |
| `JWT_SECRET` | `dev-secret-change-in-production` | Clave para firmar JWT |
| `JWT_EXPIRATION_HOURS` | `24` | Duración del token |

---

## Dependencies (requirements.txt)

```
fastapi==0.115.0
uvicorn[standard]==0.30.0
sqlalchemy==2.0.30
psycopg2-binary==2.9.9
pydantic==2.7.0
pydantic-settings==2.3.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.9
watchdog==4.0.0
```

### Dependencies (requirements-dev.txt)

```
pytest==8.2.0
pytest-asyncio==0.23.0
httpx==0.27.0
factory-boy==3.3.0
```

---

## Network Topology (Local K8s)

```
minikube cluster
├── namespace: dog-keeper-<username>
│   ├── pod: db (PostgreSQL, port 5432)
│   ├── pod: backend (FastAPI, port 8000)
│   ├── svc: db (ClusterIP → db pod:5432)
│   └── svc: backend (ClusterIP → backend pod:8000)
```

El Backend solo es accesible dentro del cluster (vía BFF). No tiene Ingress propio.
