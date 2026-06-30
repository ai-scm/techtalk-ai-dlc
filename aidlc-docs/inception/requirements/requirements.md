# Requirements Document — App de Adopción de Mascotas

**Generated**: 2026-06-30T04:20:47Z
**Stage**: INCEPTION — Requirements Analysis
**Depth**: Standard
**Source**: Product-Definition/ (Discovery outputs) + requirement-verification-questions.md (user answers)

---

## Intent Analysis Summary

| Dimension | Valor |
|---|---|
| **User Request** | Construir una aplicación para adoptar mascotas que conecte adoptantes con mascotas disponibles en refugios, fundaciones y particulares |
| **Request Type** | New Project (Greenfield) |
| **Scope Estimate** | Multiple Components — Frontend (React), Backend (FastAPI/Lambda), IaC (CDK), Storage (DynamoDB/S3), Auth (Cognito) |
| **Complexity Estimate** | Moderate — 10 features MVP, 3 roles, 6 estados de adopción, DynamoDB access patterns, serverless |
| **First Delivery** | POC con metas absolutas (línea base 0) |

---

## 1. Functional Requirements

### FR-01: Registro e Inicio de Sesión con Roles

| Campo | Detalle |
|---|---|
| **Descripción** | El sistema permite crear cuentas y autenticarse con diferenciación de roles |
| **Roles** | Adoptante, Persona que publica, Fundación |
| **Proveedor de autenticación** | Amazon Cognito (OAuth2/OIDC) |
| **Modelo de fundación** | Una cuenta = un usuario (sin multi-usuario en la POC) |
| **Criterios de aceptación** | Un usuario puede registrarse eligiendo su rol, iniciar sesión, y acceder solo a las funcionalidades de su rol |

### FR-02: Publicar Mascota en Adopción

| Campo | Detalle |
|---|---|
| **Descripción** | Personas que publican y fundaciones pueden crear publicaciones de mascotas disponibles para adopción |
| **Datos obligatorios** | Nombre, especie, edad, tamaño, ubicación, estado de salud, descripción |
| **Atributos normalizados** | `species`, `size`, `ageGroup`, `location`, `status`, `createdAt` |
| **Estado inicial** | `AVAILABLE` |
| **Criterios de aceptación** | Una publicación creada aparece en el catálogo con estado AVAILABLE y todos los datos obligatorios |

### FR-03: Agregar Fotos de la Mascota

| Campo | Detalle |
|---|---|
| **Descripción** | El publicador puede adjuntar fotos a la publicación de una mascota |
| **Máximo de fotos** | 3 por mascota |
| **Tamaño máximo** | 5 MB por foto |
| **Formatos aceptados** | JPG, PNG |
| **Almacenamiento** | Amazon S3 |
| **Criterios de aceptación** | El sistema valida formato y tamaño antes de subir; rechaza archivos que excedan los límites; muestra las fotos en el detalle de la mascota |

### FR-04: Consultar Catálogo de Mascotas Disponibles

| Campo | Detalle |
|---|---|
| **Descripción** | Adoptantes pueden explorar un listado de mascotas con estado AVAILABLE |
| **Estrategia de consulta** | DynamoDB + GSIs (status+species, status+location, compuesto especie+ubicación) |
| **Paginación** | Requerida (cursor-based, compatible con DynamoDB) |
| **Criterios de aceptación** | El catálogo muestra solo mascotas con status AVAILABLE; soporta paginación; no ejecuta table scans completos |

### FR-05: Filtrar Mascotas por Criterios Básicos

| Campo | Detalle |
|---|---|
| **Descripción** | Adoptantes pueden filtrar el catálogo por especie, ubicación, tamaño y edad |
| **Filtros principales (GSI)** | Especie, ubicación |
| **Filtros secundarios (backend)** | Tamaño (`size`), grupo de edad (`ageGroup`) — aplicados sobre conjuntos ya acotados por consulta GSI |
| **Prohibición** | No se permiten scans completos de tabla como estrategia principal |
| **Criterios de aceptación** | Los filtros reducen resultados de forma coherente; combinaciones de filtros funcionan correctamente |

### FR-06: Ver Detalle de una Mascota

| Campo | Detalle |
|---|---|
| **Descripción** | Adoptantes pueden ver la información completa de una mascota, incluyendo fotos |
| **Estrategia de consulta** | Consulta directa por `petId` |
| **Datos visibles** | Todos los datos obligatorios + fotos + estado de la publicación |
| **Criterios de aceptación** | La vista de detalle muestra toda la información registrada y las fotos de la mascota |

### FR-07: Enviar Solicitud de Adopción

| Campo | Detalle |
|---|---|
| **Descripción** | Un adoptante puede enviar una solicitud/intención de adopción para una mascota disponible |
| **Límite de solicitudes activas** | Máximo 3 solicitudes activas simultáneamente por adoptante |
| **Estado inicial de solicitud** | `SENT` (Enviada) |
| **Validaciones** | No se puede enviar solicitud a mascota no disponible; no se puede exceder el límite de 3 activas |
| **Criterios de aceptación** | La solicitud se registra, el publicador es notificado, el adoptante ve su solicitud en su lista; el sistema rechaza la 4ta solicitud activa |

### FR-08: Gestionar Solicitudes Recibidas

| Campo | Detalle |
|---|---|
| **Descripción** | Publicadores y fundaciones pueden revisar solicitudes recibidas y cambiar su estado |
| **Acciones disponibles** | Ver lista de solicitudes, aceptar una solicitud, rechazar solicitudes |
| **Comportamiento al aceptar** | La mascota pasa a estado `IN_PROCESS`; las demás solicitudes pendientes quedan en lista de espera (no se rechazan automáticamente) |
| **Información compartida al aceptar** | Email y teléfono del adoptante se comparten con el publicador |
| **Criterios de aceptación** | El publicador puede ver todas las solicitudes de una mascota, aceptar/rechazar individualmente; al aceptar, las demás solicitudes quedan visibles en espera |

### FR-09: Cambiar Estado de la Publicación

| Campo | Detalle |
|---|---|
| **Descripción** | Publicadores pueden cambiar el estado de su mascota según avance el proceso |
| **Estados válidos** | `AVAILABLE` → `IN_PROCESS` → `ADOPTED` |
| **Transiciones** | AVAILABLE→IN_PROCESS (al aceptar solicitud), IN_PROCESS→ADOPTED (adopción confirmada), IN_PROCESS→AVAILABLE (si adopción no se concreta y se reactiva) |
| **Impacto en lista de espera** | Si vuelve a AVAILABLE, las solicitudes en espera se reactivan |
| **Criterios de aceptación** | Solo transiciones válidas son permitidas; el cambio de estado se refleja en catálogo y detalle |

### FR-10: Eliminación de Cuenta

| Campo | Detalle |
|---|---|
| **Descripción** | Un usuario puede eliminar su cuenta |
| **Comportamiento en cascada** | Se eliminan todas sus publicaciones; se cancelan todas las solicitudes asociadas (enviadas y recibidas) |
| **Criterios de aceptación** | Tras eliminar cuenta, las publicaciones del usuario desaparecen del catálogo; los adoptantes con solicitudes a esas mascotas ven sus solicitudes canceladas |

---

## 2. Non-Functional Requirements

### NFR-01: Disponibilidad

| Campo | Detalle |
|---|---|
| **Target** | Best-effort — sin SLA formal |
| **Justificación** | POC para validar producto; caídas ocasionales son aceptables |
| **Implicación técnica** | No se requieren configuraciones multi-AZ, health checks avanzados, ni failover automático |

### NFR-02: Rendimiento

| Campo | Detalle |
|---|---|
| **Latencia máxima** | 5 segundos por operación (lectura y escritura) |
| **Usuarios concurrentes** | Menos de 50 simultáneos |
| **Implicación técnica** | Lambda con configuración por defecto (sin provisioned concurrency); DynamoDB on-demand; S3 estándar |

### NFR-03: Escalabilidad

| Campo | Detalle |
|---|---|
| **Target POC** | 200 mascotas publicadas, 100 adoptantes, 20 publicadores (métricas de éxito del vision document) |
| **Estrategia** | Serverless (Lambda + DynamoDB on-demand) escala automáticamente; para la POC no se requiere diseño de escalabilidad explícito |

### NFR-04: Seguridad (Base, sin extensión)

| Campo | Detalle |
|---|---|
| **Autenticación** | Amazon Cognito (OAuth2/OIDC) |
| **Autorización** | Roles en Cognito (adoptante, publicador, fundación); validación en backend |
| **Cifrado** | TLS en tránsito (API Gateway), cifrado en reposo en DynamoDB y S3 (por defecto AWS) |
| **Secretos** | AWS Secrets Manager / Parameter Store; nunca en repositorio |
| **Validación de entrada** | Pydantic schemas en FastAPI (borde de API) |
| **Extensión Security Baseline** | NO habilitada (decisión del usuario) |

### NFR-05: Testing

| Campo | Detalle |
|---|---|
| **Cobertura unitaria** | >60% en lógica de negocio crítica (servicios, repositorios) |
| **Tipos de test** | Unitarios, integración, e2e |
| **Herramientas sugeridas** | pytest (backend), Vitest/Jest + React Testing Library (frontend), Playwright (e2e) |
| **Property-Based Testing** | Parcial — solo para funciones puras y round-trips de serialización |
| **Extensión Resiliency Baseline** | NO habilitada (decisión del usuario) |

---

## 3. Data Model (Conceptual)

### Entidades Principales

| Entidad | Clave Principal | Atributos Clave |
|---|---|---|
| User | `userId` | email, phone, role (ADOPTER/PUBLISHER/FOUNDATION), name, createdAt |
| Pet | `petId` | publisherId, name, species, size, ageGroup, location, healthStatus, description, status (AVAILABLE/IN_PROCESS/ADOPTED), photos[], createdAt |
| AdoptionRequest | `requestId` | petId, adopterId, publisherId, status (SENT/IN_REVIEW/ACCEPTED/REJECTED/WAITLISTED/CANCELLED), createdAt, updatedAt |

### Estados del Proceso de Adopción

```
Mascota:      AVAILABLE ──→ IN_PROCESS ──→ ADOPTED
                  ↑              │
                  └──────────────┘ (si no se concreta)

Solicitud:    SENT ──→ IN_REVIEW ──→ ACCEPTED ──→ (cierre externo)
                           │              │
                           ├──→ REJECTED  └──→ WAITLISTED (otras solicitudes)
                           │
                           └──→ CANCELLED (por eliminación de cuenta o retiro)
```

### DynamoDB Access Patterns

| Patrón | Estrategia |
|---|---|
| Mascotas disponibles | GSI: `status = AVAILABLE` |
| Filtrar por especie | GSI: `status + species` |
| Filtrar por ubicación | GSI: `status + location` |
| Filtrar especie + ubicación | GSI compuesto (sort key compuesta) |
| Filtrar tamaño/edad | Filtro secundario en backend |
| Detalle de mascota | Query por `petId` |
| Mascotas de un publicador | Query por `publisherId` |
| Solicitudes de un adoptante | Query por `adopterId` |
| Solicitudes para una mascota | Query por `petId` (en tabla de solicitudes) |

---

## 4. Technical Constraints (Obligatorias)

Extraídas de `Product-Definition/technical-environment.md` — tratadas como restricciones, no sugerencias.

| Área | Restricción |
|---|---|
| **Backend** | Python 3.12.x + FastAPI + Pydantic |
| **Frontend** | TypeScript 5.x + React + Tailwind CSS |
| **IaC** | TypeScript 5.x + AWS CDK |
| **Cómputo** | AWS Lambda |
| **API** | Amazon API Gateway (REST, OpenAPI) |
| **Base de datos** | Amazon DynamoDB (NoSQL, access patterns + GSIs) |
| **Autenticación** | Amazon Cognito (OAuth2/OIDC) |
| **Almacenamiento** | Amazon S3 (fotos de mascotas) |
| **Secretos** | AWS Secrets Manager / Parameter Store |
| **Comunicación** | REST síncrono (frontend↔backend); contacto adoptante-publicador por canales externos |
| **Estructura** | Frontend / Backend (routers/services/repositories) / Infra (CDK) |

---

## 5. Scope Boundaries

### IN (MVP)

1. Registro e inicio de sesión con roles (Cognito)
2. Publicar mascota con información básica
3. Agregar fotos (max 3, 5MB, JPG/PNG)
4. Catálogo de mascotas disponibles (paginado)
5. Filtros por especie, ubicación, tamaño, edad
6. Ver detalle de mascota
7. Enviar solicitud de adopción (max 3 activas)
8. Gestionar solicitudes (aceptar/rechazar, lista de espera)
9. Cambiar estado de publicación (AVAILABLE→IN_PROCESS→ADOPTED)
10. Eliminación de cuenta con cascada

### OUT (Futuro)

- Mensajería interna / chat
- Motor de matching / recomendaciones / cuestionarios
- Seguimiento post-adopción
- Verificación avanzada del adoptante
- Multi-usuario por fundación
- Métricas de mejora relativa (requieren línea base)

---

## 6. Success Metrics (POC)

| Métrica | Target |
|---|---|
| Mascotas publicadas | 50 |
| Adoptantes registrados | 100 |
| Publicadores registrados | 20 |
| Solicitudes enviadas | 80 |
| Contactos exitosos | 40 |
| Adopciones concretadas | 10 |
| Tiempo para encontrar adoptante | ≤15 días |

---

## 7. Extension Configuration

| Extension | Enabled | Decided At |
|---|---|---|
| Security Baseline | No | Requirements Analysis |
| Resiliency Baseline | No | Requirements Analysis |
| Property-Based Testing | Partial (funciones puras y serialización) | Requirements Analysis |

---

## 8. Open Questions Resolution (from Discovery)

Todas las Open Questions fueron resueltas durante Discovery. Se listan para trazabilidad:

| ID | Resolución |
|---|---|
| OQ-B-1 | POC con metas absolutas; mejora relativa = mediano plazo |
| OQ-B-2 | Seguimiento MVP = solo estados; matching avanzado = futuro |
| OQ-B-3 | Sin mensajería interna; contacto por canales externos |
| OQ-T-1 | DynamoDB + GSIs simples + filtrado backend; OpenSearch/Aurora = futuro |
