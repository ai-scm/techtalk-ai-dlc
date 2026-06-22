# Vision Interview — Answers History (append-only)

## Section 1: Executive Summary — validated 2026-06-21T00:20:00Z

**Q1 — Project name and type**: B (Un producto nuevo de cara al cliente). Nombre de trabajo: app de adopción de mascotas.

**Q2 — Target users (one-liner)**: Personas que quieren adoptar una mascota y refugios que necesitan dar en adopción a sus animales.

**Q3 — Core capability**: Conecta a adoptantes con mascotas disponibles en refugios, permitiendo buscar, filtrar y solicitar adopciones en línea, con un correcto seguimiento de principio a fin para la mascota, asegurando que las mascotas recaigan en los dueños más apropiados; permite descripciones específicas que conectan la identidad de la persona que adopta con la de la mascota que espera un hogar.

**Q4 — Business problem**: A (Fragmentación de herramientas / proceso manual — hoy se hace a mano o por redes sociales).

**Q5 — Measurable outcome**:
- Aumentar las adopciones completadas en un 35%.
- Reducir el tiempo de gestión de una solicitud de adopción de 7 días a 3.
- Lograr 200 mascotas publicadas en los primeros 3 meses.

### Section 1 Complete — 2026-06-21T00:20:00Z

## Section 2: Business Context — validated 2026-06-21T00:30:00Z

**Q8 — Target users and stakeholders**:

| Rol | Descripción | Necesidad Principal |
| --- | --- | --- |
| Adoptante | Persona interesada en encontrar y adoptar una mascota | Buscar mascotas disponibles, revisar su información y contactar o enviar una solicitud de adopción |
| Persona que publica | Usuario particular que tiene una mascota disponible para adopción | Publicar la información de la mascota y recibir solicitudes de personas interesadas |
| Fundación | Organización que rescata, cuida y gestiona mascotas en adopción | Publicar mascotas, administrar solicitudes y facilitar el proceso de adopción responsable |

**Q10 — Success metrics**:

| Métrica | Estado Actual | Estado Objetivo | Método de Medición |
| --- | --- | --- | --- |
| Mascotas publicadas en la plataforma | 0 | 50 mascotas publicadas durante la POC | Conteo de publicaciones registradas en la plataforma |
| Adoptantes registrados | 0 | 100 adoptantes registrados durante la POC | Conteo de cuentas creadas con rol de adoptante |
| Personas o fundaciones publicadoras registradas | 0 | 20 publicadores registrados durante la POC | Conteo de usuarios registrados como persona que publica o fundación |
| Solicitudes de adopción enviadas | 0 | 80 solicitudes enviadas durante la POC | Registro automático de solicitudes realizadas por los adoptantes |
| Contactos exitosos entre adoptantes y publicadores | 0 | 40 contactos exitosos durante la POC | Seguimiento de solicitudes aceptadas o conversaciones iniciadas |
| Adopciones concretadas | 0 | 10 adopciones concretadas durante la POC | Confirmación manual o registro de adopción finalizada en la plataforma |
| Tiempo promedio para encontrar un posible adoptante | No medido | 15 días o menos | Comparación entre fecha de publicación y primera solicitud recibida |

**Nota / ambigüedad detectada**: Las métricas de éxito están definidas en términos de POC (estado base 0). Q5 mencionó "+35% adopciones completadas", que implica una línea base previa. Se registrará en open-questions para alinear el horizonte (POC vs. métricas relativas).

### Section 2 Complete — 2026-06-21T00:30:00Z

## Section 4: MVP Scope — IN — validated 2026-06-21T00:40:00Z

**Q14 — MVP features**:

| Funcionalidad | Justificación | Tipo de Usuario Principal |
| --- | --- | --- |
| Registro e inicio de sesión con roles básicos | Diferencia acciones de adoptantes, personas que publican y fundaciones en la POC | Adoptante / Persona que publica / Fundación |
| Publicar mascota en adopción | Sin publicaciones no existe catálogo; funcionalidad base de la propuesta de valor | Persona que publica / Fundación |
| Agregar información básica de la mascota | Datos mínimos: nombre, especie, edad, tamaño, ubicación, estado de salud, descripción | Persona que publica / Fundación |
| Agregar fotos de la mascota | Las fotos generan confianza e interés en los adoptantes | Persona que publica / Fundación |
| Consultar catálogo de mascotas disponibles | Permite a adoptantes explorar las mascotas publicadas | Adoptante |
| Filtrar mascotas por criterios básicos | Encontrar mascotas compatibles por especie, tamaño, ubicación, etc. | Adoptante |
| Ver detalle de una mascota | Revisar la información completa antes de contactar o solicitar | Adoptante |
| Enviar solicitud o intención de adopción | Acción principal que conecta al adoptante con quien publica | Adoptante |
| Gestionar solicitudes recibidas | Permite a publicadores/fundaciones revisar interesados y avanzar el proceso | Persona que publica / Fundación |
| Cambiar estado de la publicación | Marcar mascota como disponible, en proceso o adoptada | Persona que publica / Fundación |

### Section 4 Complete — 2026-06-21T00:40:00Z

## Business Interview — ALL CORE QUESTIONS COMPLETE — 2026-06-21T00:40:00Z

## Open Questions Resolved (decisiones de negocio) — 2026-06-21T00:50:00Z

**OQ-B-1 (Horizonte de métricas)** — DECISIÓN: La primera entrega se mide como POC con metas absolutas, partiendo de línea base 0 (no existe solución digital propia previa). Las métricas relativas ("+35% adopciones", "7→3 días") son objetivos de negocio de mediano plazo, aplicables cuando exista línea base real desde la operación actual o canales previos (redes, WhatsApp, procesos manuales). Métricas POC: mascotas publicadas, adoptantes registrados, solicitudes enviadas, contactos exitosos, adopciones concretadas, tiempo promedio publicación→primera solicitud.

**OQ-B-2 (Seguimiento de principio a fin y matching)** — DECISIÓN: En el MVP el "seguimiento" se limita al estado de la publicación y de la solicitud. Estados mínimos: Mascota disponible · Solicitud enviada · Solicitud en revisión · Solicitud aceptada/rechazada · Mascota en proceso de adopción · Mascota adoptada. No incluye verificación avanzada del adoptante, visitas domiciliarias, validación documental, entrevistas ni seguimiento post-adopción. La compatibilidad se maneja con filtros básicos e información visible (especie, tamaño, edad, ubicación, descripción, estado de salud). Matching por afinidad, recomendaciones, cuestionarios del adoptante y seguimiento post-adopción = futuro.

**OQ-B-3 (Canal de contacto)** — DECISIÓN: El MVP NO incluye mensajería interna ni chat en tiempo real. El contacto se realiza por medios externos (email, teléfono, WhatsApp) tras enviar la solicitud. La plataforma registra la intención y permite gestionar solicitudes. "Contactos exitosos" = solicitudes aceptadas/respondidas o casos donde el publicador confirma contacto externo. Mensajería interna = futuro.
