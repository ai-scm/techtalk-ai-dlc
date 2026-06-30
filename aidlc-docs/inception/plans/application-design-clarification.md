# Application Design — Clarification Questions

Se detectaron contradicciones entre sus respuestas (Q5, Q6) y las restricciones técnicas definidas en `Product-Definition/technical-environment.md`. Necesito clarificación antes de proceder.

---

## Contradiction 1: Base de datos principal

El `technical-environment.md` define **Amazon DynamoDB** como almacenamiento principal (NoSQL, access patterns con GSIs). Sin embargo, sus respuestas a Q5 y Q6 mencionan **PostgreSQL** como base de datos tanto para imágenes como para permisos/usuarios.

### Clarification Question 1
¿Desea cambiar la base de datos principal del proyecto de DynamoDB a PostgreSQL?

A) Sí — cambiar a PostgreSQL como base de datos principal para todo (usuarios, mascotas, solicitudes, permisos). Esto reemplaza DynamoDB y elimina la necesidad de GSIs. Se usaría un ORM como SQLAlchemy.

B) No — mantener DynamoDB como base principal según el technical-environment.md, pero agregar PostgreSQL solo para autenticación/permisos (base de datos auxiliar).

C) Sí — cambiar completamente a PostgreSQL y además usar AWS RDS/Aurora Serverless como servicio de hosting.

X) Otro (por favor describa después del tag [Answer]: abajo)

[Answer]: A

---

## Contradiction 2: Almacenamiento de imágenes

El `technical-environment.md` define **Amazon S3** para almacenamiento de fotos. Usted indicó guardar las imágenes directamente en la base de datos PostgreSQL.

**Nota técnica**: Guardar imágenes en la base de datos (como bytea/base64) funciona para la POC pero tiene implicaciones: aumenta el tamaño de la base de datos significativamente, hace los backups más pesados, y las consultas son más lentas al recuperar listados con imágenes. Para una POC con máximo 50 mascotas × 3 fotos × 5MB = ~750MB es manejable.

### Clarification Question 2
¿Confirma guardar las imágenes en PostgreSQL en lugar de S3?

A) Sí — guardar imágenes como bytea (binario) en PostgreSQL para simplificar la POC (sin S3)

B) Sí — guardar imágenes como base64 (texto) en PostgreSQL para simplificar

C) No — mantener S3 como indica el technical-environment.md (presigned URLs)

D) Alternativa — guardar en el filesystem del servidor/Lambda con ruta en la DB (sin S3 ni bytea)

X) Otro (por favor describa después del tag [Answer]: abajo)

[Answer]: A

---

## Contradiction 3: Autenticación

El `technical-environment.md` define **Amazon Cognito (OAuth2/OIDC)** para autenticación. Usted indicó un sistema propio con email+password y tabla de permisos en la base de datos.

### Clarification Question 3
¿Desea reemplazar Cognito con autenticación propia?

A) Sí — auth completamente propio: tabla de usuarios con password hasheado (bcrypt), JWT generados por el backend, tabla de permisos. Sin Cognito.

B) No — mantener Cognito como indica el technical-environment.md para registro/login, pero agregar una tabla de permisos adicional en la DB para autorización granular.

C) Sí — auth propio pero usando una librería estándar de FastAPI (como fastapi-users) que maneje registro, login, JWT, y verificación de email.

X) Otro (por favor describa después del tag [Answer]: abajo)

[Answer]: A

---

## Importante

Sus respuestas a estas preguntas **actualizarán las restricciones técnicas** del proyecto. El technical-environment.md se tratará como baseline, pero las decisiones que tome aquí lo sobreescriben para el diseño y la implementación.
