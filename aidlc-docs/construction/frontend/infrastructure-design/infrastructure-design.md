# Infrastructure Design — Unit 3: Frontend

**Generated**: 2026-06-30
**Stage**: CONSTRUCTION — Infrastructure Design
**Unit**: Frontend (React + TypeScript + Tailwind)
**Environment**: Local Development (Garden.io + Minikube)

---

## Overview

| Componente | Tecnología | Propósito |
|---|---|---|
| Dockerfile | node:20-alpine (multi-stage) | Imagen del frontend (dev stage) |
| K8s Deployment | deployment.yml | Pod del frontend (port 3000) |
| K8s Service | service.yml | ClusterIP |
| K8s Ingress | ingress.yml | Routes: / → frontend, /api → bff |
| Garden Build | garden.yml (Build) | Construir imagen Docker |
| Garden Deploy | garden.yml (Deploy) | Deploy + sync + port-forward |

---

## Dockerfile (Multi-stage)

```dockerfile
FROM node:20-alpine AS base

# Stage: deps
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

# Stage: development (used by Garden for local dev with sync)
FROM base AS development
WORKDIR /app
ENV NODE_ENV=development
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package*.json ./
COPY . /app
RUN chown -R nextjs:nodejs /app
USER nextjs
EXPOSE 3000
CMD ["npm", "run", "dev"]
```

**Note**: Using Vite (React SPA) instead of Next.js for simplicity. The `development` stage runs `npm run dev` with hot-reload.

---

## Kubernetes Manifests

### `manifests/deployment.yml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
spec:
  replicas: 1
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
        - name: frontend
          image: frontend
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 3000
              name: http
              protocol: TCP
          env:
            - name: NODE_ENV
              value: "development"
            - name: PORT
              value: "3000"
            - name: VITE_API_BASE_URL
              value: "/api"
          livenessProbe:
            httpGet:
              path: /
              port: 3000
            initialDelaySeconds: 60
            periodSeconds: 30
            timeoutSeconds: 10
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 10
            failureThreshold: 3
          resources:
            limits:
              memory: 2Gi
              cpu: 1000m
            requests:
              cpu: 200m
              memory: 512Mi
          securityContext:
            allowPrivilegeEscalation: false
            runAsNonRoot: true
            runAsUser: 1001
      restartPolicy: Always
```

### `manifests/service.yml`

```yaml
apiVersion: v1
kind: Service
metadata:
  name: frontend
spec:
  type: ClusterIP
  ports:
    - name: http
      port: 3000
      protocol: TCP
      targetPort: 3000
  selector:
    app: frontend
```

### `manifests/ingress.yml`

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: frontend
spec:
  ingressClassName: nginx
  rules:
    - host: frontend.local
      http:
        paths:
          - backend:
              service:
                name: frontend
                port:
                  number: 3000
            path: /
            pathType: Prefix
          - backend:
              service:
                name: bff
                port:
                  number: 8001
            path: /api
            pathType: Prefix
```

**Garden patches** the host to `dog-keeper.local.app.garden` via `patchResources`.

---

## Garden Configuration (`garden.yml`)

```yaml
kind: Build
name: frontend
type: container
description: Build the frontend image
spec:
  targetStage: development

---
kind: Deploy
name: frontend
type: kubernetes
description: Deploy the frontend
dependencies:
  - build.frontend
  - deploy.bff
spec:
  manifestFiles: [./manifests/*]
  defaultTarget:
    kind: Deployment
    name: frontend
  patchResources:
    - kind: Deployment
      name: frontend
      patch:
        spec:
          template:
            spec:
              containers:
                - name: frontend
                  image: ${actions.build.frontend.outputs.deploymentImageId}
    - kind: Ingress
      name: frontend
      patch:
        spec:
          ingressClassName: nginx
          rules:
            - host: ${var.hostname}
              http:
                paths:
                  - backend:
                      service:
                        name: frontend
                        port:
                          number: 3000
                    path: /
                    pathType: Prefix
                  - backend:
                      service:
                        name: bff
                        port:
                          number: 8001
                    path: /api
                    pathType: Prefix
  sync:
    paths:
      - sourcePath: src
        containerPath: /app/src
        mode: one-way-replica
        exclude: [node_modules, .next, dist]
    overrides:
      - command: [npm, run, dev]
  portForwards:
    - name: http
      resource: Service/frontend
      targetPort: 3000
      localPort: 3000
```

---

## Technology Stack

| Tool | Version | Purpose |
|---|---|---|
| Vite | 5.x | Build tool + dev server (fast HMR) |
| React | 18.x | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 3.x | Utility-first CSS |
| React Router | 6.x | Client-side routing |

---

## File Structure

```
/frontend/
├── garden.yml
├── Dockerfile
├── manifests/
│   ├── deployment.yml
│   ├── service.yml
│   └── ingress.yml
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── index.html
├── src/
│   ├── main.tsx              # React entry point
│   ├── App.tsx               # Router + AuthProvider
│   ├── services/
│   │   └── api.ts            # Centralized API client
│   ├── context/
│   │   └── AuthContext.tsx   # Auth state + provider
│   ├── components/           # Shared UI components
│   │   ├── Navbar.tsx
│   │   ├── ProtectedRoute.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── ErrorMessage.tsx
│   │   ├── ConfirmModal.tsx
│   │   └── EmptyState.tsx
│   ├── features/
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   └── RegisterPage.tsx
│   │   ├── catalog/
│   │   │   ├── CatalogPage.tsx
│   │   │   ├── PetCard.tsx
│   │   │   ├── PetDetailPage.tsx
│   │   │   ├── FilterBar.tsx
│   │   │   └── Pagination.tsx
│   │   ├── publishing/
│   │   │   ├── MyPetsPage.tsx
│   │   │   ├── CreatePetPage.tsx
│   │   │   ├── EditPetPage.tsx
│   │   │   └── PhotoUploader.tsx
│   │   ├── adoption/
│   │   │   ├── MyRequestsPage.tsx
│   │   │   ├── PetRequestsPage.tsx
│   │   │   └── RequestCard.tsx
│   │   └── account/
│   │       └── AccountPage.tsx
│   └── types/
│       └── index.ts          # Shared TypeScript types
└── tests/
    └── ...
```

---

## Access (Local Dev)

| Method | URL |
|---|---|
| Port-forward | http://localhost:3000 |
| Ingress | http://dog-keeper.local.app.garden |
| API (via Ingress) | http://dog-keeper.local.app.garden/api/* → BFF |

---

## Garden DAG (Complete)

```
deploy.db → deploy.backend → deploy.bff → deploy.frontend
```
