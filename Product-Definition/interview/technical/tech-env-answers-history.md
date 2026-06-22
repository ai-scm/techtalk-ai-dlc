# Technical Environment Interview — Answers History (append-only)

## Section T1–T2: Entorno y Lenguajes — validated 2026-06-21T01:10:00Z

**T1 — Runtime environment**: A (Solo nube).

**T2 — Cloud provider**: A (AWS).

**T3 — Deployment model**: A (Serverless — Lambda + API Gateway + DynamoDB).

**T5 — Required languages**:

| Lenguaje | Versión | Propósito | Justificación |
| --- | --- | --- | --- |
| Python | 3.12.x | Backend con FastAPI en AWS Lambda | APIs rápidas y simples para la POC, buena legibilidad, validación de datos y lógica de negocio sencilla |
| TypeScript | 5.x | Frontend con React | Tipado estático, menos errores, mantenimiento de componentes/formularios/llamadas al backend |
| TypeScript | 5.x | IaC con AWS CDK | Infra versionada, reutilizable y consistente con el lenguaje del frontend |
| HTML | HTML5 | Estructura de vistas del frontend | Pantallas semánticas y accesibles (catálogo, detalle, formularios, gestión de solicitudes) |
| CSS | CSS3 / Tailwind CSS | Estilos, diseño responsive y UX | Interfaz moderna y adaptable a móviles |
| JSON | Estándar | Intercambio de datos frontend↔backend | Comunicación estructurada entre React y FastAPI |

**T7 — Prohibited languages**: B (Ninguno — no hay lenguaje explícitamente prohibido).

### Section T1–T2 Complete — 2026-06-21T01:10:00Z

## Section T3+T5: Frameworks, Arquitectura y Datos — validated 2026-06-21T01:20:00Z

**T8 — Required frameworks**:

| Framework | Dominio | Justificación |
| --- | --- | --- |
| FastAPI | Backend / API | APIs REST en Python; validación de datos, OpenAPI automático, despliegue serverless |
| React | Frontend | Interfaz modular y dinámica para catálogo, formularios y gestión de solicitudes |
| Tailwind CSS | Frontend / Estilos | Interfaz moderna, responsive y consistente con poco esfuerzo de diseño |
| AWS CDK | IaC | Infraestructura versionada en TypeScript, despliegues repetibles |
| Pydantic | Backend / Validación | Validación de modelos de entrada/salida en FastAPI |

**T10 — Prohibited libraries**: Ninguna. Para la POC no hay restricciones específicas; se priorizarán dependencias mantenidas, livianas y compatibles con FastAPI/React/AWS, evaluando cada una por mantenimiento, seguridad y compatibilidad.

**T13 — API style**: A (REST, descrita con OpenAPI).

**T14 — Data patterns**: B (Documento / NoSQL — DynamoDB).

**Nota / ambigüedad detectada**: El catálogo del MVP requiere filtros por especie, tamaño, edad y ubicación. Con DynamoDB esto exige diseño de GSIs o un patrón de acceso bien definido (o un índice de búsqueda). Se registra como open question técnica.

### Section T3+T5 Complete — 2026-06-21T01:20:00Z

## Section T6+T7: Seguridad y Testing — validated 2026-06-21T01:30:00Z

**T17 — Authentication method**: A (OAuth2 / OIDC con IdP externo — Amazon Cognito, gestiona registro, login y roles adoptante/publicador/fundación).

**T20 — Secrets management**: A (AWS Secrets Manager / Parameter Store).

**T22 — Test types required**: A, B, D (Unitarias, Integración, End-to-end).

### Section T6+T7 Complete — 2026-06-21T01:30:00Z

## Technical Interview — ALL CORE QUESTIONS COMPLETE — 2026-06-21T01:30:00Z

## Open Question Resolved (decisión técnica) — 2026-06-21T01:40:00Z

**OQ-T-1 (Estrategia de consulta/filtrado del catálogo sobre DynamoDB)** — DECISIÓN: Mantener DynamoDB como base principal con diseño orientado a access patterns y GSIs simples. NO se incorpora OpenSearch ni Aurora Serverless en el MVP.

Atributos normalizados: species, size, ageGroup, location, status, createdAt.
Estados de publicación: AVAILABLE, IN_PROCESS, ADOPTED.

GSIs previstos:
- Índice por status + species (mascotas disponibles por especie).
- Índice por status + location (mascotas disponibles por ubicación).
- GSI compuesto / sort key compuesta para especie + ubicación.
Filtros secundarios (tamaño, edad) se aplican en backend (FastAPI) sobre conjuntos ya acotados por la consulta principal. Prohibido usar scans completos de tabla como estrategia principal.

Patrones de acceso del MVP:
| Patrón de acceso | Estrategia |
| --- | --- |
| Ver mascotas disponibles | Consulta por status = AVAILABLE |
| Filtrar por especie | GSI status + species |
| Filtrar por ubicación | GSI status + location |
| Filtrar por especie y ubicación | GSI compuesto o sort key compuesta |
| Filtrar por tamaño o edad | Filtro secundario sobre resultados acotados |
| Ver detalle de mascota | Consulta directa por petId |
| Ver mascotas de un usuario/fundación | Consulta por publisherId |

Criterio de evolución futura:
- Búsqueda por texto libre / filtros combinados dinámicos / geobúsqueda avanzada -> OpenSearch.
- Reportes complejos con joins o agregaciones relacionales / transaccionalidad fuerte -> Aurora Serverless / RDS.
OpenSearch y Aurora Serverless quedan explícitamente fuera del alcance inicial, documentados como alternativas futuras.
