# Application Design Plan — App de Adopción de Mascotas

**Stage**: INCEPTION — Application Design
**Date**: 2026-06-30
**Input**: requirements.md, stories.md, technical-environment.md

---

## Execution Checklist

- [x] Step 1: Analyze context (requirements + stories + tech constraints)
- [x] Step 2: Create design plan (this document)
- [x] Step 3: Include mandatory design artifacts
- [x] Step 4: Generate context-appropriate questions (embedded below)
- [x] Step 5: Collect user answers
- [x] Step 6: Analyze answers for ambiguities (contradictions detected → clarified)
- [ ] Step 7: Generate design artifacts
  - [x] components.md
  - [x] component-methods.md
  - [x] services.md
  - [x] component-dependency.md
  - [x] application-design.md (consolidated)
- [ ] Step 8: Present for approval

---

## Design Context

### Restricciones técnicas (obligatorias)
- **Backend**: Python 3.12 + FastAPI (routers / services / repositories)
- **Frontend**: TypeScript + React + Tailwind CSS
- **Backened-for-Frontend**: Python 3.12 + FastAPI (orquestación de flujos de negocio y composición de datos)
- **IaC**: TypeScript + AWS CDK
- **API Style**: REST + OpenAPI (auto-generado por FastAPI)
- **DB**: DynamoDB (NoSQL, GSIs, access patterns)
- **Auth**: Amazon Cognito (OAuth2/OIDC, 3 roles)
- **Storage**: S3 (fotos)
- **Compute**: Lambda

### Entidades del dominio
- **User** (3 roles: Adopter, Publisher, Foundation)
- **Pet** (publicación con estado: AVAILABLE/IN_PROCESS/ADOPTED)
- **AdoptionRequest** (solicitud con estado: SENT/IN_REVIEW/ACCEPTED/REJECTED/WAITLISTED/CANCELLED)

### Componentes ya identificados (inferidos del tech stack)
1. **Frontend (React SPA)** — UI, navegación, llamadas a API
2. **Backend API (FastAPI on Lambda)** — Lógica de negocio, validación, persistencia
3. **Database postgres (PostgreSQL)** — Persistencia de datos
4. **BFf (Backend-for-Frontend)** — Orquestación de flujos de negocio y composición de datos
5. **Infrastructure (CDK)** — Definición de recursos AWS

---

## Questions — User Input Required

Por favor responda cada pregunta escribiendo la letra después del tag `[Answer]:`.

### Backend Architecture

## Question 1
¿Qué estructura de capas prefiere para el backend FastAPI?

A) Tres capas clásicas: Routers (endpoints) → Services (lógica de negocio) → Repositories (acceso a DynamoDB)

B) Dos capas: Routers (endpoints) → Services (lógica + acceso a datos directos con boto3)

C) Hexagonal/Ports-and-Adapters: Domain (entidades + puertos) → Adapters (API, DynamoDB, S3, Cognito)

X) Otro (por favor describa después del tag [Answer]: abajo)

[Answer]: A

## Question 2
¿Cómo desea organizar los routers/endpoints del backend?

A) Por recurso/entidad — un router por entidad (users.py, pets.py, requests.py)

B) Por feature/funcionalidad — un router por grupo funcional (auth.py, catalog.py, adoption.py, publishing.py)

C) Por rol de usuario — un router por tipo de usuario (adopter.py, publisher.py, admin.py)

X) Otro (por favor describa después del tag [Answer]: abajo)

[Answer]: A

### Frontend Architecture

## Question 3
¿Qué patrón de manejo de estado desea para el frontend React?

A) React hooks nativos (useState + useContext) — simple, sin librerías externas de estado

B) Zustand — store ligero y minimalista

C) React Query/TanStack Query — enfocado en server state (cache, refetch automático, loading states)

D) React Query para server state + useContext para UI state — separación de concerns

X) Otro (por favor describa después del tag [Answer]: abajo)

[Answer]: A

## Question 4
¿Cómo desea organizar las páginas/vistas del frontend?

A) Por feature — carpeta por funcionalidad (auth/, catalog/, publishing/, adoption/)

B) Por tipo de componente — pages/, components/, hooks/, services/

C) Mixto — pages por feature + shared components y hooks comunes

X) Otro (por favor describa después del tag [Answer]: abajo)

[Answer]: A

### API Design

## Question 5
¿Cómo desea manejar la subida de fotos?

A) Upload directo a S3 con presigned URLs — el frontend sube directamente a S3, el backend solo genera la URL firmada y registra la metadata

B) Upload a través del backend — el frontend envía la foto al backend (API Gateway + Lambda) y el backend la sube a S3

X) Otro (por favor describa después del tag [Answer]: abajo)

[Answer]: X , De manera que se va a manejar la subida de datos por el momento en una base de datos postgres , es necesario cambiar el flujo para poder realizar esto guardadndo la imagen en la base de datos y no en S3, ya que se requiere que la imagen se pueda ver en el frontend sin necesidad de subirla a S3.

## Question 6
¿Cómo desea que el backend valide que el usuario autenticado tiene permiso para realizar una acción sobre un recurso específico (ej: solo el publicador dueño puede editar su mascota)?

A) Middleware de autorización por ruta + validación explícita en el service (verificar ownership en cada operación)

B) Policy-based — un módulo de políticas centralizado que evalúa permisos dinámicamente (user, resource, action)

C) Simple — validación inline en cada endpoint/service (if user.id != pet.publisherId: raise 403)

X) Otro (por favor describa después del tag [Answer]: abajo)

[Answer]: 
X , Se van a manejar estos temmas de validacion y autenticacion y autorización en el backend de forma sencilla , simplemente una tabla en la base de datos que contenga los permisos de cada usuario y se va a validar en el backend si el usuario tiene permiso para realizar la acción sobre el recurso específico. Y para el login se debe usar email y password , y para el registro se debe usar email y password y confirmar el password. La forma de usar esto depende de ti.
---

## Mandatory Artifacts to Generate

Después de recibir las respuestas, se generarán:

1. **`components.md`** — Componentes principales, responsabilidades, interfaces
2. **`component-methods.md`** — Métodos por componente con signatures y propósito
3. **`services.md`** — Servicios, orquestación y patrones de interacción
4. **`component-dependency.md`** — Matriz de dependencias y flujos de datos
5. **`application-design.md`** — Documento consolidado
