# Entrevista Técnica — Sección 3 de 3: Seguridad y Testing

Progreso: [█████████░░░] 9/12 preguntas  ·  ~3 min restantes

Tandas anteriores (T1–T14): ✅ guardadas en `tech-env-answers-history.md` — no se pierde nada. Este archivo muestra solo la tanda activa.

Última tanda (Quick pass): cubre T17, T20 y T22. Rellena las [Answer]: y responde **"ready"**.

---

## Pregunta T17: ¿Cómo se autenticarán usuarios y servicios?

A) OAuth2 / OIDC con un IdP externo (nómbralo en X si aplica)

B) JWT emitido por nuestro propio servicio de auth

C) TLS mutuo entre servicios

D) Autenticación basada en IAM (AWS SigV4)

E) Mixta — describe en X

X) Otro

**Recomendación:** A) — Amazon Cognito (OAuth2/OIDC) gestiona registro, login y roles (adoptante/publicador/fundación) sin construir auth propio. Indícalo en X o como "A (Cognito)".

[Answer]: A

## Pregunta T20: ¿Cómo se almacenan y acceden los secretos?

A) AWS Secrets Manager / Parameter Store

B) HashiCorp Vault

C) Variables de entorno inyectadas por el sistema de despliegue

D) Almacén de secretos nativo del proveedor

X) Otro (no se acepta "secretos en git")

**Recomendación:** A) AWS Secrets Manager / Parameter Store.

[Answer]: A

## Pregunta T22: ¿Qué tipos de prueba son requeridos?

Combina letras según necesites (ej. `A, B`).

A) Unitarias

B) Integración

C) Contrato (consumer-driven, ej. Pact)

D) End-to-end

E) Rendimiento / carga

F) Seguridad (SAST / DAST)

X) Otro

**Recomendación:** A, B — unitarias + integración como base para una POC. Añade D (e2e) si quieres validar flujos completos.

[Answer]: A, B, D

---

When you're done, reply with a single word: **ready**

(Releeré este archivo desde disco y validaré tus respuestas.)
