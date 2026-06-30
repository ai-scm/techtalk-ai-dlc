# Requirement Verification Questions — App de Adopción de Mascotas

Estas preguntas buscan completar los detalles que el Discovery (Quick pass) no capturó. Los documentos de Product-Definition ya definieron el alcance MVP y las restricciones técnicas — aquí confirmamos detalles de implementación.

Por favor responda cada pregunta escribiendo la letra de la opción elegida después del tag `[Answer]:`. Si ninguna opción aplica, elija la última opción (X/Otro) y describa su preferencia.

---

## Sección 1: Requisitos No Funcionales (NFR)

## Question 1
¿Cuál es la expectativa de disponibilidad para la POC?

A) Best-effort — sin SLA formal; aceptable que haya caídas ocasionales mientras se valida el producto

B) Alta disponibilidad básica — la plataforma debe estar accesible al menos ~99% del tiempo durante horario laboral

C) Alta disponibilidad 24/7 — 99.9%+ de uptime, sin ventanas de mantenimiento

X) Otro (por favor describa después del tag [Answer]: abajo)

[Answer]: 
A

## Question 2
¿Cuál es el volumen de usuarios concurrentes esperado durante la POC?

A) Bajo — menos de 50 usuarios concurrentes

B) Moderado — entre 50 y 200 usuarios concurrentes

C) Alto — más de 200 usuarios concurrentes

X) Otro (por favor describa después del tag [Answer]: abajo)

[Answer]: 
A

## Question 3
¿Cuál es el tiempo máximo aceptable de respuesta para las operaciones principales (consultar catálogo, ver detalle, enviar solicitud)?

A) Relajado — hasta 5 segundos por operación es aceptable para la POC

B) Moderado — máximo 2 segundos para consultas, 3 segundos para escrituras

C) Estricto — máximo 1 segundo para consultas, 2 segundos para escrituras

X) Otro (por favor describa después del tag [Answer]: abajo)

[Answer]: 
A
---

## Sección 2: Detalles Funcionales

## Question 4
¿Cuántas fotos puede subir un publicador por mascota y qué restricciones aplican?

A) Máximo 3 fotos, hasta 5 MB cada una, formatos JPG/PNG únicamente

B) Máximo 5 fotos, hasta 5 MB cada una, formatos JPG/PNG/WebP

C) Máximo 10 fotos, hasta 10 MB cada una, cualquier formato de imagen común

X) Otro (por favor describa después del tag [Answer]: abajo)

[Answer]: 
A
## Question 5
¿Qué información de contacto se comparte entre adoptante y publicador cuando una solicitud es aceptada?

A) Solo el email del adoptante se comparte con el publicador al aceptar

B) Email y teléfono del adoptante se comparten con el publicador al aceptar

C) Ambas partes ven la información de contacto del otro (email + teléfono) al aceptar

D) El publicador define qué canales de contacto expone (email, teléfono, WhatsApp) en su perfil público

X) Otro (por favor describa después del tag [Answer]: abajo)

[Answer]: 
B
## Question 6
¿Puede un adoptante enviar solicitudes a múltiples mascotas simultáneamente?

A) Sí — sin límite de solicitudes activas simultáneas

B) Sí — pero con un máximo de 3 solicitudes activas al mismo tiempo

C) Sí — pero con un máximo de 5 solicitudes activas al mismo tiempo

D) No — solo puede tener una solicitud activa a la vez

X) Otro (por favor describa después del tag [Answer]: abajo)

[Answer]: 
B
## Question 7
Cuando un publicador acepta una solicitud para una mascota, ¿qué sucede con las demás solicitudes pendientes para esa misma mascota?

A) Se rechazan automáticamente (la mascota pasa a "en proceso de adopción")

B) Quedan en espera ("lista de espera") por si la adopción no se concreta

C) Se notifica a los demás interesados que hay un adoptante seleccionado, pero no se rechazan hasta que la adopción se confirme

X) Otro (por favor describa después del tag [Answer]: abajo)

[Answer]: 
B
---

## Sección 3: Autorización y Datos

## Question 8
¿Puede una fundación tener múltiples usuarios que publiquen y gestionen solicitudes bajo la misma organización?

A) No — en la POC cada cuenta de fundación es un solo usuario

B) Sí — una fundación puede tener hasta 3 usuarios/miembros

C) Sí — sin límite de miembros por fundación

X) Otro (por favor describa después del tag [Answer]: abajo)

[Answer]: 
A
## Question 9
¿Qué sucede con las publicaciones y solicitudes si un usuario elimina su cuenta?

A) Se eliminan todas sus publicaciones y se cancelan solicitudes asociadas

B) Las publicaciones permanecen visibles pero marcadas como "publicador inactivo"; solicitudes se cancelan

C) No se permite eliminar cuenta si hay solicitudes activas o mascotas en proceso

X) Otro (por favor describa después del tag [Answer]: abajo)

[Answer]: 
A
---

## Sección 4: Testing

## Question 10
¿Cuál es el target de cobertura de tests para la POC?

A) Mínimo — cobertura unitaria >60% solo en lógica de negocio crítica (servicios, repositorios)

B) Moderado — cobertura unitaria >70% en backend, >50% en frontend; tests de integración para flujos principales

C) Alto — cobertura unitaria >80% en ambos, integración completa, e2e para los flujos principales

X) Otro (por favor describa después del tag [Answer]: abajo)

[Answer]: 
A
---

## Sección 5: Extensions (Opt-In)

Las siguientes preguntas determinan qué extensiones de calidad se aplican como reglas obligatorias durante el desarrollo.

## Question 11: Security Extensions
¿Deben aplicarse las reglas de la extensión de seguridad (Security Baseline) a este proyecto?

A) Sí — aplicar todas las reglas de SEGURIDAD como restricciones obligatorias (recomendado para aplicaciones production-grade)

B) No — omitir todas las reglas de SEGURIDAD (adecuado para POCs, prototipos y proyectos experimentales)

X) Otro (por favor describa después del tag [Answer]: abajo)

[Answer]: 
B
## Question 12: Resiliency Extensions
¿Debe aplicarse el baseline de resiliencia a este proyecto?

**Qué es esta extensión**: Habilitar aplica un conjunto de buenas prácticas direccionales de diseño para construir sistemas resilientes, derivadas del AWS Well-Architected Framework (Reliability Pillar). Orienta requisitos, diseño y código hacia tolerancia a fallos, alta disponibilidad, observabilidad y recuperabilidad.

**Qué NO es esta extensión**: No certifica ni garantiza ningún target de disponibilidad, RTO o RPO. Es un punto de partida que facilita decisiones tempranas de resiliencia.

A) Sí — aplicar el baseline de resiliencia como buenas prácticas direccionales y guía de diseño (recomendado para cargas de trabajo críticas de negocio)

B) No — omitir el baseline de resiliencia (adecuado para POCs, prototipos y proyectos experimentales donde la iteración rápida importa más que la confiabilidad)

X) Otro (por favor describa después del tag [Answer]: abajo)

[Answer]: 
B
## Question 13: Property-Based Testing Extension
¿Deben aplicarse las reglas de Property-Based Testing (PBT) a este proyecto?

A) Sí — aplicar todas las reglas de PBT como restricciones obligatorias (recomendado para proyectos con lógica de negocio, transformaciones de datos, serialización o componentes con estado)

B) Parcial — aplicar reglas de PBT solo para funciones puras y round-trips de serialización (adecuado para proyectos con complejidad algorítmica limitada)

C) No — omitir todas las reglas de PBT (adecuado para aplicaciones CRUD simples, proyectos solo UI o capas de integración finas sin lógica de negocio significativa)

X) Otro (por favor describa después del tag [Answer]: abajo)

[Answer]: 
B
---

## Notas para el revisor

- El alcance MVP está definido en `Product-Definition/vision-document.md` (Features IN/OUT) y se respeta como frontera.
- Las restricciones técnicas de `Product-Definition/technical-environment.md` son obligatorias (no sugerencias).
- Las 4 Open Questions (3 negocio + 1 técnica) ya están resueltas — no se re-preguntan.
- Estas preguntas cubren los vacíos dejados por el Discovery Quick pass en NFRs, detalles funcionales, autorización y testing.
