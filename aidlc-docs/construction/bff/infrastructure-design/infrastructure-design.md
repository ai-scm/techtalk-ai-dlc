# Infrastructure Design — Unit 2: BFF

**Generated**: 2026-06-30
**Stage**: CONSTRUCTION — Infrastructure Design
**Unit**: BFF (Backend For Frontend)
**Environment**: Local Development (Garden.io + Minikube)

---

## Overview

| Componente | Tecnología | Propósito |
|---|---|---|
| Dockerfile | python:3.11-slim | Imagen del servicio BFF |
| K8s Deployment | deployment.yml | Pod del BFF (port 8001) |
| K8s Service | service.yml | ClusterIP para acceso desde Frontend/Ingress |
| Garden Build | garden.yml (Build) | Construir imagen Docker |
| Garden Deploy | garden.yml (Deploy) | Deploy + sync + hot-reload |
| Garden Test | garden.yml (Test) | Tests unitarios |

---

## Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN useradd --create-home --shell /bin/bash app && \
    chown -R app:app /app
USER app

EXPOSE 8001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
```

---

## Kubernetes Manifests

### `manifests/deployment.yml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bff
spec:
  replicas: 1
  selector:
    matchLabels:
      app: bff
  template:
    metadata:
      labels:
        app: bff
    spec:
      containers:
        - name: bff
          image: bff
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 8001
              name: http
              protocol: TCP
          env:
            - name: BACKEND_URL
              value: "http://backend:8000"
            - name: PORT
              value: "8001"
            - name: JWT_SECRET
              value: "dev-secret-change-in-production"
            - name: PYTHONUNBUFFERED
              value: "1"
            - name: PYTHONDONTWRITEBYTECODE
              value: "1"
          command:
            - sh
            - -c
            - "uvicorn main:app --host 0.0.0.0 --port 8001"
          livenessProbe:
            httpGet:
              path: /health
              port: 8001
            initialDelaySeconds: 30
            periodSeconds: 30
            timeoutSeconds: 10
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /health
              port: 8001
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
  name: bff
spec:
  type: ClusterIP
  ports:
    - name: http
      port: 8001
      protocol: TCP
      targetPort: 8001
  selector:
    app: bff
```

---

## Garden Configuration (`garden.yml`)

```yaml
kind: Build
name: bff
type: container
description: Build the BFF image

---
kind: Deploy
name: bff
type: kubernetes
description: Deploy the BFF
dependencies:
  - build.bff
  - deploy.backend
spec:
  manifestFiles: [./manifests/*]
  defaultTarget:
    kind: Deployment
    name: bff
  patchResources:
    - kind: Deployment
      name: bff
      patch:
        spec:
          template:
            spec:
              containers:
                - name: bff
                  image: ${actions.build.bff.outputs.deploymentImageId}
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
          - >-
            watchmedo auto-restart
            --directory=/app
            --pattern="*.py"
            --recursive
            -- uvicorn main:app --host 0.0.0.0 --port 8001 --reload

---
kind: Test
name: unit-bff
type: container
description: Unit test the BFF
dependencies: [build.bff]
spec:
  image: ${actions.build.bff.outputs.deploymentImageId}
  args: ["/bin/sh", "-c", "pip install -r requirements-dev.txt && python -m pytest -v"]
```

---

## Dependencies

### requirements.txt
```
fastapi==0.115.0
uvicorn[standard]==0.30.0
httpx==0.27.0
python-jose[cryptography]==3.3.0
pydantic==2.7.0
pydantic-settings==2.3.0
python-multipart==0.0.9
watchdog==4.0.0
```

### requirements-dev.txt
```
pytest==8.2.0
pytest-asyncio==0.23.0
respx==0.21.0
```

**Note**: `httpx` is the HTTP client for calling the Backend API. `respx` mocks httpx in tests.

---

## Environment Variables

| Variable | Value (local) | Purpose |
|---|---|---|
| `BACKEND_URL` | `http://backend:8000` | Backend API URL (K8s DNS) |
| `JWT_SECRET` | `dev-secret-change-in-production` | Same as Backend (for token validation) |
| `PORT` | `8001` | BFF listening port |
| `PYTHONUNBUFFERED` | `1` | Output sin buffer |
| `PYTHONDONTWRITEBYTECODE` | `1` | No .pyc files |

---

## Network Topology

```
minikube cluster
├── namespace: dog-keeper-<username>
│   ├── pod: db (PostgreSQL, port 5432)
│   ├── pod: backend (FastAPI, port 8000)
│   ├── pod: bff (FastAPI, port 8001) ← NEW
│   ├── svc: db (ClusterIP → db:5432)
│   ├── svc: backend (ClusterIP → backend:8000)
│   └── svc: bff (ClusterIP → bff:8001)
```

The BFF is accessed by the Frontend via Ingress (`/api` path → bff:8001).

---

## File Structure

```
/bff/
├── garden.yml
├── Dockerfile
├── manifests/
│   ├── deployment.yml
│   └── service.yml
├── requirements.txt
├── requirements-dev.txt
├── main.py                 # FastAPI app + /health
├── routers/
│   ├── __init__.py
│   ├── auth.py             # Login/register orchestration
│   ├── pets.py             # Proxy pet operations
│   ├── requests.py         # Proxy adoption requests
│   └── users.py            # Proxy user operations
├── middleware/
│   └── auth.py             # JWT validation dependency
├── client/
│   └── backend_client.py   # httpx async client
├── core/
│   └── config.py           # BFF settings
└── tests/
    ├── __init__.py
    ├── conftest.py
    └── test_auth.py
```
