# Garden.io - Acciones Build, Deploy y Sync

## Acción Build (tipo: container)

Construye una imagen Docker del servicio usando el Dockerfile del directorio.

```yaml
kind: Build
name: <nombre-servicio>
type: container
description: Build the <nombre-servicio>
```

### Reglas para Builds:
- `type: container` usa el Dockerfile del mismo directorio.
- El nombre del Build se referencia en otros lugares como `build.<nombre>`.
- Para el frontend, se puede especificar `targetStage` para multi-stage builds:
  ```yaml
  spec:
    buildArgs:
      NEXT_PUBLIC_BFF_URL: /api
    targetStage: "${environment.name == 'local' ? 'development' : 'runner'}"
  ```
- La imagen resultante se referencia con: `${actions.build.<nombre>.outputs.deploymentImageId}`

---

## Acción Deploy (tipo: kubernetes)

Despliega manifiestos de Kubernetes con soporte de sync para hot-reload.

```yaml
kind: Deploy
name: <nombre-servicio>
type: kubernetes
description: Deploy the <nombre-servicio>
dependencies:
  - build.<nombre-servicio>
  - deploy.<dependencia>  # otros servicios que necesita
spec:
  manifestFiles: [./manifests/*]
  defaultTarget:
    kind: Deployment
    name: <nombre-servicio>
  patchResources:
    - kind: Deployment
      name: <nombre-servicio>
      patch:
        spec:
          template:
            spec:
              containers:
                - name: <nombre-servicio>
                  image: ${actions.build.<nombre-servicio>.outputs.deploymentImageId}
```

### Reglas para Deploys Kubernetes:
- Los manifiestos van en `<servicio>/manifests/` (deployment.yml, service.yml, ingress.yml).
- `patchResources` reemplaza la imagen placeholder del manifiesto con la imagen real construida por Garden.
- `defaultTarget` indica cuál es el Deployment principal para operaciones de sync y logs.
- Las dependencias se declaran con el formato `build.<nombre>` o `deploy.<nombre>`.

### Cadena de dependencias actual:
```
deploy.db → deploy.backend → deploy.bff → deploy.frontend
```

---

## Acción Deploy (tipo: helm)

Para la base de datos PostgreSQL se usa un chart de Helm:

```yaml
kind: Deploy
name: db
type: helm
description: Deploy a PostgreSQL database
spec:
  chart:
    name: postgresql
    repo: https://charts.bitnami.com/bitnami
    version: 15.5.21
  values:
    fullnameOverride: db
    image:
      registry: docker.io
      repository: bitnamilegacy/postgresql
      tag: 16.3.0-debian-12-r23
      pullPolicy: IfNotPresent
    auth:
      username: ${var.postgresUsername || 'postgres'}
      database: ${var.postgresDatabase || 'dog_keeper_db'}
      postgresPassword: ${var.postgresPassword || 'password'}
    primary:
      persistence:
        enabled: false
      resources:
        limits:
          memory: 512Mi
          cpu: 500m
        requests:
          memory: 256Mi
          cpu: 100m
```

### Reglas para Helm Deploys:
- Usar `fullnameOverride` para que el nombre del servicio DNS sea predecible (e.g., `db`).
- `persistence.enabled: false` para desarrollo local (datos efímeros).
- Las variables de proyecto se interpolan con `${var.nombreVariable}`.

---

## Sync (Hot-Reload en desarrollo)

El sync va dentro de la acción `Deploy` bajo `spec.sync`:

### Servicios Python (backend, bff):
```yaml
spec:
  sync:
    paths:
      - sourcePath: .
        containerPath: /app
        mode: one-way-replica
        exclude: [.venv, __pycache__, "*.pyc", .pytest_cache]
    overrides:
      - command:
          - /bin/sh
          - -c
          - >
            watchmedo auto-restart
            --directory=/app
            --pattern="*.py"
            --recursive
            -- uvicorn main:app --host 0.0.0.0 --port <puerto> --reload
```

### Frontend Next.js:
```yaml
spec:
  sync:
    paths:
      - sourcePath: src
        containerPath: /app/src
        mode: one-way-replica
        exclude: [node_modules, .next]
    overrides:
      - command: [npm, run, dev]
```

### Reglas de Sync:
- `mode: one-way-replica` — Sincroniza archivos locales al contenedor (no al revés).
- `overrides.command` — Reemplaza el CMD del contenedor durante `garden dev` para usar un proceso con hot-reload.
- Para Python: usar `watchmedo auto-restart` (del paquete `watchdog` en requirements.txt).
- Para Next.js: sincronizar solo `src/` y usar `npm run dev`.
- Las exclusiones deben incluir artefactos de build y dependencias.

---

## Port Forwards

Para exponer servicios localmente sin pasar por el Ingress:

```yaml
spec:
  portForwards:
    - name: http
      resource: Service/<nombre-servicio>
      targetPort: <puerto>
      localPort: <puerto-local>
```

Actualmente solo el frontend tiene port-forward configurado (puerto 3000).

---

## Patch de Ingress

Garden puede parchear el Ingress para configurar el hostname dinámicamente:

```yaml
spec:
  patchResources:
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
```

El Ingress rutea `/` al frontend y `/api` al BFF.
