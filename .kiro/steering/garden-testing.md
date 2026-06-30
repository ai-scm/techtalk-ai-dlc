# Garden.io - Tests (Unitarios e Integración)

## Tests Unitarios (tipo: container)

Los tests unitarios corren en un contenedor efímero usando la imagen del servicio.

### Patrón para servicios Python:
```yaml
kind: Test
name: unit-<servicio>
type: container
description: Unit test the <servicio>
dependencies: [build.<servicio>]
spec:
  image: ${actions.build.<servicio>.outputs.deploymentImageId}
  args: ["/bin/sh", "-c", "pip install -r requirements-dev.txt && python -m pytest -v"]
```

### Reglas para Tests Unitarios:
- Dependen **solo del build**, no del deploy (no necesitan el cluster corriendo).
- Se ejecutan en un contenedor efímero que se destruye al finalizar.
- El contenedor usa la imagen del servicio, así que ya tiene las dependencias de producción instaladas.
- Las dependencias de desarrollo (`pytest`, etc.) se instalan en tiempo de ejecución via `requirements-dev.txt`.
- El formato del nombre es `unit-<servicio>`.

### Ejecución:
```bash
# Ejecutar todos los tests
garden test

# Ejecutar un test específico
garden test unit-backend
garden test unit-bff

# Ejecutar tests con output detallado
garden test --force  # fuerza re-ejecución aunque no haya cambios
```

---

## Tests de Integración (tipo: container)

Los tests de integración se ejecutan dentro del cluster, con acceso a todos los servicios desplegados.

### Estructura:
```
integration-tests/
├── garden.yaml          # Configuración de Garden (Build + Test)
├── Dockerfile           # Imagen con pytest y dependencias
├── requirements.txt     # pytest, requests, etc.
├── conftest.py          # Fixtures y configuración compartida
├── pytest.ini           # Configuración de pytest
├── test_service_health.py
├── test_service_communication.py
├── test_data_flow.py
└── test_end_to_end_workflows.py
```

### Configuración en `integration-tests/garden.yaml`:
```yaml
kind: Build
name: integration-tests
type: container
description: Build the integration test runner image

---
kind: Test
name: integration-tests
type: container
description: Ejecuta las pruebas de integración E2E dentro del clúster
dependencies:
  - build.integration-tests
  - deploy.frontend
  - deploy.bff
  - deploy.backend
  - deploy.db
spec:
  image: ${actions.build.integration-tests.outputs.deploymentImageId}
  env:
    FRONTEND_URL: "http://frontend:3000"
    BFF_URL: "http://bff:8001"
    BACKEND_URL: "http://backend:8000"
    DATABASE_URL: "postgresql://postgres:password@db:5432/dog_keeper_db"
  args:
    - python
    - -m
    - pytest
    - -v
```

### Dockerfile de tests de integración:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
```

### Reglas para Tests de Integración:
- Dependen de **todos los deploys** (toda la infraestructura debe estar corriendo).
- Se comunican con los servicios usando los nombres DNS del cluster (e.g., `http://backend:8000`).
- Las URLs de los servicios se pasan como variables de entorno en `spec.env`.
- Usan un Dockerfile minimalista que solo instala pytest y las dependencias de test.
- El contenedor se ejecuta dentro del mismo namespace de Kubernetes, por lo que tiene acceso de red a todos los servicios.

### Ejecución:
```bash
# Ejecutar tests de integración (requiere cluster con servicios desplegados)
garden test integration-tests

# Forzar re-ejecución
garden test integration-tests --force
```

---

## Orden de Ejecución (DAG de dependencias)

```
build.backend ──→ deploy.backend ────────────────┐
                       ↑                         │
                  deploy.db                      │
                                                 │
build.bff ─────→ deploy.bff ─────────────────────┤
                       ↑                         │
                  deploy.backend                 ├──→ test.integration-tests
                                                 │
build.frontend ─→ deploy.frontend ───────────────┤
                       ↑                         │
                  deploy.bff                     │
                                                 │
build.integration-tests ─────────────────────────┘
```

Tests unitarios (independientes del cluster):
```
build.backend ──→ test.unit-backend
build.bff ──────→ test.unit-bff
```

---

## Comandos Útiles de Garden para Testing

```bash
# Ver resultados de tests anteriores
garden get test-result unit-backend

# Logs de un deploy (útil para debugear tests que fallan)
garden logs backend
garden logs bff

# Estado del proyecto
garden get status

# Limpiar todo y empezar de cero
garden cleanup namespace
```
