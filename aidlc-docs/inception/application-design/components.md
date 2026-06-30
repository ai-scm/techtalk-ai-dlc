# Components — App de Adopción de Mascotas

**Generated**: 2026-06-30 (rev. 2 — BFF introduced)
**Stage**: INCEPTION — Application Design

---

## Component Overview

```
+-------------------+       +-------------------+       +-------------------+       +-------------------+
|    Frontend       |       |       BFF         |       |    Backend API    |       |   PostgreSQL      |
|   (React SPA)     | ----> | (Backend For FE)  | ----> |   (FastAPI)       | ----> |   (Data Store)    |
+-------------------+       +-------------------+       +-------------------+       +-------------------+
                                                                                            
                            +-------------------+
                            |  Infrastructure   |
                            |     (CDK)         |
                            +-------------------+
```

---

## Component 1: Frontend (React SPA)

| Campo | Detalle |
|---|---|
| **Nombre** | frontend |
| **Tecnología** | TypeScript + React + Tailwind CSS |
| **Propósito** | Interfaz de usuario para adoptantes, publicadores y fundaciones |
| **Deployment** | Hosting estático (S3 + CloudFront o similar) |

### Responsabilidades
- Renderizar vistas por feature: auth, catalog, publishing, adoption
- Gestionar estado local con React hooks nativos (useState + useContext)
- **Llamar ÚNICAMENTE al BFF** (nunca directamente al Backend API)
- Manejar autenticación del lado del cliente (almacenar JWT recibido del BFF, enviar en headers al BFF)
- Validar formularios del lado del cliente antes de enviar
- Mostrar estados de carga, error y éxito

### Interfaces
- **Entrada**: Interacciones del usuario (clicks, formularios, navegación)
- **Salida**: HTTP requests al **BFF** (REST/JSON)
- **Dependencia**: BFF (única dependencia de red)

---

## Component 2: BFF (Backend For Frontend)

| Campo | Detalle |
|---|---|
| **Nombre** | bff |
| **Tecnología** | Python 3.12 + FastAPI |
| **Propósito** | Intermediario entre Frontend y Backend API. Gestiona autenticación, redirección y adaptación de responses para el frontend |
| **Deployment** | AWS Lambda + API Gateway (o container) |
| **Puerto (dev)** | 8001 |

### Responsabilidades
- **Gestionar login/registro**: Recibir credenciales del frontend, llamar al Backend API, retornar JWT al frontend
- **Proxy de requests**: Reenviar requests del frontend al Backend API, agregando headers/tokens internos si es necesario
- **Adaptación de responses**: Transformar/simplificar responses del Backend para el consumo del frontend (si es necesario)
- **Redirección y routing**: Manejar lógica de redirección post-login según rol
- **Validación de sesión**: Verificar JWT del frontend antes de proxy-ar al Backend
- **Agregación**: Si el frontend necesita datos de múltiples endpoints del Backend, el BFF los combina en un solo call

### Interfaces
- **Entrada**: HTTP requests del Frontend (REST/JSON)
- **Salida**: HTTP requests al Backend API (REST/JSON, servicio interno)
- **Dependencias**: Backend API

---

## Component 3: Backend API (FastAPI)

| Campo | Detalle |
|---|---|
| **Nombre** | backend |
| **Tecnología** | Python 3.12 + FastAPI + SQLAlchemy + Pydantic |
| **Propósito** | API REST interna que contiene toda la lógica de negocio y acceso a datos |
| **Deployment** | AWS Lambda + API Gateway (o container) |
| **Puerto (dev)** | 8000 |
| **Estructura interna** | 3 capas: Routers → Services → Repositories |

### Responsabilidades
- Exponer endpoints REST internos (no accesibles directamente desde el frontend)
- Autenticar y generar JWT (login/registro con bcrypt)
- Autorizar acciones (validar ownership y permisos por rol)
- Ejecutar lógica de negocio (state machine de adopción, límites, waitlist, cascada)
- Persistir datos en PostgreSQL via SQLAlchemy
- Almacenar y servir imágenes (bytea en PostgreSQL)
- Validar entrada con Pydantic schemas

### Interfaces
- **Entrada**: HTTP requests del BFF (REST/JSON + multipart para fotos)
- **Salida**: HTTP responses (JSON), queries a PostgreSQL
- **Dependencias**: PostgreSQL

### Capas Internas

| Capa | Responsabilidad | Ejemplo |
|---|---|---|
| **Routers** | Definir endpoints, parsear request, retornar response | `routers/pets.py` |
| **Services** | Lógica de negocio, orquestación, validaciones de dominio | `services/pet_service.py` |
| **Repositories** | Acceso a datos (SQLAlchemy queries), CRUD operations | `repositories/pet_repository.py` |

---

## Component 4: PostgreSQL Database

| Campo | Detalle |
|---|---|
| **Nombre** | database |
| **Tecnología** | PostgreSQL (RDS en AWS, local para desarrollo) |
| **Propósito** | Almacenamiento único de todos los datos: usuarios, mascotas, solicitudes, permisos, fotos |
| **Deployment** | AWS RDS PostgreSQL (o Aurora Serverless) via CDK |

### Responsabilidades
- Almacenar todas las entidades del dominio (Users, Pets, AdoptionRequests)
- Almacenar imágenes como bytea (binario)
- Enforcar integridad referencial (foreign keys)
- Soportar queries SQL con índices para filtros del catálogo
- Gestionar transacciones (cascading deletes, cambios de estado atómicos)

### Interfaces
- **Entrada**: SQL queries desde el Backend (via SQLAlchemy)
- **Salida**: Result sets, confirmaciones de transacción

---

## Component 5: Infrastructure (CDK)

| Campo | Detalle |
|---|---|
| **Nombre** | infrastructure |
| **Tecnología** | TypeScript + AWS CDK |
| **Propósito** | Definir y desplegar todos los recursos AWS de forma reproducible |
| **Deployment** | CloudFormation stacks via `cdk deploy` |

### Responsabilidades
- Definir Lambda functions para Backend API y BFF
- Configurar API Gateway (routes, CORS, stages)
- Provisionar RDS PostgreSQL (VPC, security groups, subnet groups)
- Configurar networking (VPC para RDS + Lambda)
- Gestionar variables de entorno y secretos
- Definir hosting del frontend (S3 + CloudFront)
- Configurar routing: `/api/*` → BFF, frontend estático para todo lo demás

### Interfaces
- **Entrada**: Código CDK (TypeScript)
- **Salida**: CloudFormation stacks desplegados en AWS

---

## Summary Table

| Component | Tipo | Tecnología | Puerto (dev) | Dependencias |
|---|---|---|---|---|
| Frontend | Aplicación | React + TS + Tailwind | 3000 | BFF |
| BFF | Servicio | FastAPI (Python) | 8001 | Backend API |
| Backend API | Servicio | FastAPI + SQLAlchemy + Pydantic | 8000 | PostgreSQL |
| PostgreSQL | Data Store | PostgreSQL | 5432 | — |
| Infrastructure | IaC | CDK (TypeScript) | — | AWS Services |
