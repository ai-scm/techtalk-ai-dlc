# Open Questions for AI-DLC

Pre-declared ambiguities and unresolved decisions surfaced during definition.
AI-DLC should address these early in Requirements Analysis.

Last generated: 2026-06-21T01:40:00Z

## Business (Vision) open questions

> Las 3 preguntas abiertas de negocio fueron RESUELTAS por el usuario durante el gate de aprobación. Se conservan aquí con su resolución para trazabilidad.

### OQ-B-1: Horizonte de métricas — POC vs. mejora relativa — ✅ RESUELTA
- **Source section**: Success Metrics
- **Question**: ¿Las métricas objetivo son absolutas (POC desde 0) o de mejora relativa (línea base de Q5)?
- **Resolution**: La primera entrega se mide como POC con metas absolutas, partiendo de línea base 0 (no hay solución digital propia previa). Las métricas relativas ("+35% adopciones", "7→3 días") pasan a ser objetivos de mediano plazo, aplicables cuando exista línea base real desde la operación actual o canales previos.
- **Status**: Resuelta — 2026-06-21.

### OQ-B-2: Alcance del "seguimiento de principio a fin" y emparejamiento por compatibilidad — ✅ RESUELTA
- **Source section**: Core Capability
- **Question**: ¿Qué incluye el seguimiento y existe matching por compatibilidad en el MVP?
- **Resolution**: En el MVP el seguimiento se limita a estados de publicación y solicitud (Disponible · Solicitud enviada · En revisión · Aceptada/Rechazada · En proceso de adopción · Adoptada). Sin verificación avanzada, visitas, validación documental, entrevistas ni post-adopción. Compatibilidad solo vía filtros básicos e información visible. Matching avanzado, recomendaciones, cuestionarios y seguimiento post-adopción = futuro.
- **Status**: Resuelta — 2026-06-21.

### OQ-B-3: Canal de contacto entre adoptante y publicador — ✅ RESUELTA
- **Source section**: Target Users / MVP
- **Question**: ¿Mensajería interna en el MVP o contacto externo?
- **Resolution**: El MVP no incluye mensajería interna ni chat. El contacto es por medios externos (email, teléfono, WhatsApp) tras enviar la solicitud. La plataforma registra la intención y gestiona solicitudes. "Contactos exitosos" = solicitudes aceptadas/respondidas o contacto externo confirmado por el publicador. Mensajería interna = futuro.
- **Status**: Resuelta — 2026-06-21.

## Technical (Technical Environment) open questions

### OQ-T-1: Estrategia de consulta/filtrado del catálogo sobre DynamoDB — ✅ RESUELTA
- **Source section**: Data Patterns (T14)
- **Question**: ¿Cómo resolver los filtros del catálogo (especie, tamaño, edad, ubicación) sobre DynamoDB?
- **Resolution**: Mantener DynamoDB con diseño basado en access patterns y GSIs simples. No se incorpora OpenSearch ni Aurora Serverless en el MVP. Atributos normalizados (species, size, ageGroup, location, status, createdAt) y estados controlados (AVAILABLE, IN_PROCESS, ADOPTED). GSIs: status+species, status+location, y compuesto especie+ubicación. Filtros secundarios (tamaño, edad) en backend sobre resultados ya acotados; prohibido scan completo como estrategia principal. Evolución futura: OpenSearch para búsqueda por texto/filtros dinámicos/geobúsqueda; Aurora Serverless/RDS para reportes relacionales complejos o transaccionalidad fuerte.
- **Status**: Resuelta — 2026-06-21.

## Summary

Total open questions: 0 abiertas (Business: 0 abiertas / 3 resueltas, Technical: 0 abiertas / 1 resuelta).

## Cross-role reconciliation (Join)

Se revisaron contradicciones entre la Visión (Negocio) y las Restricciones (Técnico) en el join barrier:
- MVP sin mensajería interna (decisión OQ-B-3) ↔ API REST + contacto externo: **coherente**.
- Catálogo con filtros básicos (decisión OQ-B-2) ↔ DynamoDB + GSIs simples (decisión OQ-T-1): **coherente**.
- Carácter POC / bajo costo (Negocio) ↔ arquitectura serverless AWS (Técnico): **coherente**.
- 3 roles de usuario (adoptante/publicador/fundación) ↔ Amazon Cognito con roles: **coherente**.

No se detectaron contradicciones cruzadas. Discovery completado.

AI-DLC should load this file during Requirements Analysis. Todas las preguntas abiertas (negocio y técnicas) han sido resueltas durante Discovery.
