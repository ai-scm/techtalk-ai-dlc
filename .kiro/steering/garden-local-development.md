# Garden.io - Desarrollo Local con Kubernetes

## Configuración del Proyecto

Este proyecto usa **Garden.io v2 API** (`apiVersion: garden.io/v2`) con un cluster local de Minikube para desarrollo con paridad de contenedores.

### Archivo Principal: `project.garden.yml` (raíz del proyecto)

```yaml
apiVersion: garden.io/v2
kind: Project
name: dog-keeper
defaultEnvironment: local
dotIgnoreFile: .gitignore

variables:
  postgresUsername: postgres
  postgresDatabase: dog_keeper_db
  postgresPassword: password
  userNamespace: dog-keeper-${kebabCase(local.username)}

environments:
  - name: local
    defaultNamespace: ${var.userNamespace}
    variables:
      baseHostname: local.app.garden
      bffUrl: /api

providers:
  - name: container
    gardenContainerBuilder:
      enabled: false
  - name: local-kubernetes
    environments: [local]
    namespace: ${environment.namespace}
    defaultHostname: ${var.baseHostname}
    buildMode: local-docker
    setupIngressController: nginx
    context: minikube
```

### Convenciones obligatorias:
- `buildMode: local-docker` — Las imágenes se construyen con el Docker daemon de Minikube (no se pushean a registry).
- `context: minikube` — Siempre usar el contexto de Minikube.
- `setupIngressController: nginx` — Garden configura NGINX Ingress automáticamente.
- Cada servicio vive en su propia carpeta con un archivo `garden.yml`.
- Las variables del proyecto se referencian con `${var.nombreVariable}`.

---

## Preparación del Cluster (Minikube)

### Pasos obligatorios antes de ejecutar Garden:

```bash
# 1. Iniciar minikube con el addon de ingress
minikube start --addons=ingress

# 2. Apuntar el Docker CLI al daemon de Minikube
eval $(minikube -p minikube docker-env)

# 3. Configurar resolución de hosts (una sola vez)
echo "$(minikube ip) dog-keeper.local.app.garden local.app.garden" | sudo tee -a /etc/hosts
```

### Importante:
- **Siempre** ejecutar `eval $(minikube -p minikube docker-env)` en cada nueva terminal antes de usar Garden.
- El addon de ingress debe estar habilitado para que el Ingress funcione.
- Si se reinicia minikube, la IP puede cambiar y hay que actualizar `/etc/hosts`.

---

## Ejecución del Entorno de Desarrollo

```bash
# Modo desarrollo interactivo (build + deploy + sync + watch)
garden dev

# Solo hacer deploy sin sync
garden deploy

# Build de un servicio específico
garden build backend

# Deploy de un servicio específico
garden deploy backend
```

### Acceso a la aplicación:
- **Frontend (Port-Forward)**: http://localhost:3000
- **Frontend (Ingress)**: http://dog-keeper.local.app.garden
- **BFF API Docs**: http://dog-keeper.local.app.garden/api/docs

---

## Estructura de Archivos Garden por Servicio

Cada servicio tiene su `garden.yml` en su directorio. Un archivo puede contener múltiples acciones separadas por `---`.

### Tipos de acciones (kinds):
- `Build` — Construye la imagen Docker del servicio.
- `Deploy` — Despliega manifiestos de Kubernetes o charts de Helm.
- `Test` — Ejecuta tests en un contenedor efímero.
