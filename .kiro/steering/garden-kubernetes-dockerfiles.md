# Garden.io - Manifiestos Kubernetes y Dockerfiles

## Estructura de Manifiestos

Cada servicio con deploy tipo `kubernetes` debe tener una carpeta `manifests/` con:
- `deployment.yml` — Define el Deployment del servicio.
- `service.yml` — Define el Service (ClusterIP).
- `ingress.yml` (solo frontend) — Define el Ingress con reglas de ruteo.

---

## Deployment (Patrón para servicios Python)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: <nombre-servicio>
spec:
  replicas: 1
  selector:
    matchLabels:
      app: <nombre-servicio>
  template:
    metadata:
      labels:
        app: <nombre-servicio>
    spec:
      containers:
        - name: <nombre-servicio>
          image: <nombre-servicio>  # Placeholder - Garden lo reemplaza via patchResources
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: <puerto>
              name: http
              protocol: TCP
          env:
            - name: PYTHONUNBUFFERED
              value: "1"
            # ... variables específicas del servicio
          command:
            - sh
            - -c
            - "<comando de inicio>"
          livenessProbe:
            httpGet:
              path: /health
              port: <puerto>
            initialDelaySeconds: 30
            periodSeconds: 30
            timeoutSeconds: 10
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /health
              port: <puerto>
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

### Reglas para Deployments:
- La imagen en el manifiesto es un **placeholder** (mismo nombre que el servicio). Garden la reemplaza con `patchResources`.
- `imagePullPolicy: IfNotPresent` es obligatorio para builds locales (no hay registry externo).
- Siempre incluir `livenessProbe` y `readinessProbe` con endpoint `/health`.
- Usar `securityContext` con `runAsNonRoot: true`.
- El frontend necesita más recursos (2Gi memory, 1000m CPU) y tiempos de inicio más largos en las probes.

---

## Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: <nombre-servicio>
spec:
  type: ClusterIP
  ports:
    - name: http
      port: <puerto>
      protocol: TCP
      targetPort: <puerto>
  selector:
    app: <nombre-servicio>
```

### Puertos por servicio:
| Servicio | Puerto |
|----------|--------|
| backend  | 8000   |
| bff      | 8001   |
| frontend | 3000   |
| db       | 5432   |

---

## Ingress (solo frontend)

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: frontend
spec:
  ingressClassName: nginx
  rules:
    - host: frontend.local  # Placeholder - Garden lo parchea
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

El Ingress base es un placeholder. Garden lo parchea con el hostname correcto (`dog-keeper.local.app.garden`) via `patchResources` en el `garden.yml` del frontend.

---

## Dockerfiles

### Servicios Python (backend, bff):
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*
# Para backend: agregar libpq5 (para psycopg2-binary)

# Instalar dependencias Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código
COPY . .

# Crear usuario no-root
RUN useradd --create-home --shell /bin/bash app && \
    chown -R app:app /app
USER app

EXPOSE <puerto>

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "<puerto>"]
```

### Frontend Next.js (multi-stage):
```dockerfile
FROM node:20-alpine AS base

# Stage: deps - instalar dependencias
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

# Stage: development - para modo sync de Garden
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

# Stage: runner - para producción
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
# ... (build de producción con standalone output)
CMD ["node", "server.js"]
```

### Reglas para Dockerfiles:
- Para **desarrollo local** con Garden sync, el frontend usa el stage `development` (configurado con `targetStage` en garden.yml).
- Los servicios Python incluyen `watchdog` en `requirements.txt` para el hot-reload con `watchmedo`.
- Siempre usar usuarios no-root.
- Incluir `curl` para health checks (o `wget` en Alpine).
- Las imágenes son `python:3.11-slim` para Python y `node:20-alpine` para Node.js.

---

## Variables de Entorno por Servicio

### Backend:
```yaml
DATABASE_URL: "postgresql://postgres:password@db:5432/dog_keeper_db"
PYTHONUNBUFFERED: "1"
```

### BFF:
```yaml
BACKEND_URL: "http://backend:8000"
PORT: "8001"
PYTHONUNBUFFERED: "1"
PYTHONDONTWRITEBYTECODE: "1"
```

### Frontend:
```yaml
NODE_ENV: "development"
PORT: "3000"
HOSTNAME: "0.0.0.0"
NEXT_PUBLIC_BFF_URL: "/api"
```

Las URLs entre servicios usan los nombres DNS de Kubernetes (nombre del Service).
