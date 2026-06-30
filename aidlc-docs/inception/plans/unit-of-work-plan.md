# Unit of Work Plan — App de Adopción de Mascotas

**Stage**: INCEPTION — Units Generation
**Date**: 2026-06-30
**Input**: application-design.md (rev. 2 with BFF), stories.md (22 stories), requirements.md

---

## Execution Checklist

### Part 1: Planning
- [x] Step 1: Create unit of work plan (this document)
- [x] Step 2: Include mandatory unit artifacts
- [x] Step 3: Generate context-appropriate questions (embedded below)
- [x] Step 4: Collect user answers
- [x] Step 5: Analyze answers for ambiguities (none found)
- [x] Step 6: Approval of plan (APPROVED 2026-06-30)

### Part 2: Generation (after approval)
- [x] Step 7: Generate unit-of-work.md
- [x] Step 8: Generate unit-of-work-dependency.md
- [x] Step 9: Generate unit-of-work-story-map.md
- [x] Step 10: Validate completeness (22 stories mapped, all units defined)
- [x] Step 11: Present for approval (APPROVED 2026-06-30)

---

## Proposed Unit Decomposition

Based on the Application Design (5 components: Frontend, BFF, Backend, PostgreSQL, Infrastructure), the natural decomposition is:

| Unit | Component | Technology | Deploy Independently |
|---|---|---|---|
| **Unit 1: Backend API** | Backend API + PostgreSQL schema | Python + FastAPI + SQLAlchemy | Yes (Lambda) |
| **Unit 2: BFF** | Backend For Frontend | Python + FastAPI | Yes (Lambda) |
| **Unit 3: Frontend** | React SPA | TypeScript + React + Tailwind | Yes (S3 + CloudFront) |
| **Unit 4: Infrastructure** | CDK Stacks | TypeScript + AWS CDK | Yes (CloudFormation) |

**Rationale**: Each unit maps to an independently deployable artifact with its own build, test, and deploy cycle. PostgreSQL schema lives with the Backend API (migrations managed by the backend).

---

## Questions — User Input Required

Por favor responda cada pregunta escribiendo la letra después del tag `[Answer]:`.

### Unit Boundaries

## Question 1
¿Está de acuerdo con la descomposición en 4 unidades (Backend API, BFF, Frontend, Infrastructure) o prefiere agrupar de otra forma?

A) Sí — 4 unidades como se propone (Backend, BFF, Frontend, Infra). Cada una con su propio directorio, build y deploy.

B) 3 unidades — combinar BFF y Backend en una sola unidad (un solo servicio FastAPI que sirve como BFF y backend)

C) 3 unidades — combinar Infrastructure con Backend (CDK vive en el mismo directorio/unit que el backend)

D) 2 unidades — Backend (FastAPI con BFF + lógica + DB) + Frontend (React)

X) Otro (por favor describa después del tag [Answer]: abajo)

[Answer]: A

### Development Order

## Question 2
¿En qué orden desea que se desarrollen las unidades durante la CONSTRUCTION phase?

A) Backend primero → BFF → Frontend → Infra al final (bottom-up: primero lógica, luego proxy, luego UI, luego deploy)

B) Infra primero → Backend → BFF → Frontend (infra-first: crear recursos, luego código que los usa)

C) Backend + Infra en paralelo → BFF → Frontend (critical path: DB + backend en paralelo con infra, luego capas superiores)

D) Todas en paralelo con contracts definidos (API contracts primero, luego cada unit se desarrolla independientemente)

X) Otro (por favor describa después del tag [Answer]: abajo)

[Answer]: X - Lo ideal es la opcion A , pero en la parte de infraestructura falta algo y es que si te fijas en los documentos de steering estan las definiciones del uso de garden para el despliegue del cluster de kubernetes en local para el despliegue y desarrollo local y luego luego de eso ahi si deberia estar la infraestructura de AWS para el despliegue en la nube , pero primero se deberia hacer el despliegue local para poder probar y desarrollar las unidades de trabajo.

### Code Organization

## Question 3
¿Qué estructura de directorios prefiere para el monorepo?

A) Flat — cada unidad en la raíz:
```
/backend/
/bff/
/frontend/
/infra/
```

B) Grouped — carpetas por tipo:
```
/services/backend/
/services/bff/
/apps/frontend/
/infra/
```

C) Packages — estilo monorepo con workspace:
```
/packages/backend/
/packages/bff/
/packages/frontend/
/packages/infra/
```

X) Otro (por favor describa después del tag [Answer]: abajo)

[Answer]: A

---

## Mandatory Artifacts to Generate

Después de recibir las respuestas, se generarán:

1. **`unit-of-work.md`** — Definición de cada unidad, responsabilidades, tecnología, estructura de directorios
2. **`unit-of-work-dependency.md`** — Matriz de dependencias entre unidades, orden de build/deploy
3. **`unit-of-work-story-map.md`** — Mapeo de las 22 user stories a unidades
