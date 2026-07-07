# Infrastructure Design Questions — Unit 4: AWS CDK

**Stage**: CONSTRUCTION — Infrastructure Design
**Unit**: Infrastructure (AWS CDK)

---

Responde las siguientes preguntas para definir la infraestructura cloud del proyecto. Estas decisiones guiarán los stacks de CDK.

**Contexto técnico actualizado** (decisiones previas):
- DB: PostgreSQL (NO DynamoDB)
- Auth: Propio (bcrypt + JWT, NO Cognito)
- Imágenes: Almacenadas como bytea en PostgreSQL (NO S3 para imágenes)
- Backend: FastAPI en Lambda
- BFF: FastAPI en Lambda
- Frontend: React SPA (Vite) en S3+CloudFront

---

## Question 1
¿Qué tipo de instancia de RDS PostgreSQL prefieres para la POC?

A) db.t3.micro (Free Tier eligible, 1 vCPU, 1 GB RAM) — más barato

B) db.t4g.micro (Graviton, 2 vCPU, 1 GB RAM) — mejor performance/costo

C) db.t3.small (1 vCPU, 2 GB RAM) — más margen para bytea de imágenes

D) Other (please describe after [Answer]: tag below)

[Answer]: D - Quiero para este momentno y para el ambiente de test que sera montado en AWS la base de datos este en el mismo cluster, pero esto deberia ser condfigurable despues de manera que para otro ambiente se agregue un RDS PostgreSQL administrado por AWS. Esto es para que la POC sea mas simple y no tener que configurar RDS, pero para ambientes de produccion se deberia usar RDS.

## Question 2
¿Cómo deseas manejar la networking (VPC)?

A) VPC nueva dedicada para la POC (aislada, CDK la crea completa)

B) VPC default de la cuenta AWS (menos código CDK, reutiliza lo existente)

C) Other (please describe after [Answer]: tag below)

[Answer]: C - Quiero que esto sea configurable, es decir que ya exista la VPC y subnets y yo pueda hacer uso de estas.

## Question 3
¿El API Gateway debe ser REST API o HTTP API?

A) HTTP API (más barato, menor latencia, suficiente para la POC)

B) REST API (más features: throttling, caching, usage plans — pero más costoso)

C) Other (please describe after [Answer]: tag below)

[Answer]: C - Tal vez no sea necesario API gateway debido a que se podria usar ALB , se deberia usar la opcioón mas barata y mas facil de configuracion.

## Question 4
¿Necesitas un dominio personalizado o los endpoints por defecto de AWS son suficientes para la POC?

A) Endpoints por defecto de AWS (CloudFront default domain + API Gateway URL) — sin costo adicional de Route53/certificados

B) Dominio personalizado (requiere Route53 hosted zone + ACM certificate)

C) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 5
¿Cómo se deben manejar los secretos (JWT secret, DB password) en cloud?

A) AWS Secrets Manager (rotación automática, más seguro, ~$0.40/mes por secreto)

B) AWS SSM Parameter Store SecureString (gratis para la POC, sin rotación automática)

C) Variables de entorno en Lambda (más simple, menos seguro — solo para POC)

D) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 6
¿Quieres que RDS tenga Multi-AZ habilitado?

A) No — Single-AZ es suficiente para la POC (menor costo, la disponibilidad best-effort lo permite)

B) Sí — Multi-AZ para mayor disponibilidad (duplica el costo de la instancia)

C) Other (please describe after [Answer]: tag below)

[Answer]: C - Sin RDS

## Question 7
¿Deseas habilitar backups automáticos de la base de datos?

A) Sí, retención mínima (1 día) — punto de restauración básico sin costo adicional significativo

B) Sí, retención 7 días — más protección para la POC

C) No — sin backups (la POC puede recrearse desde seed)

D) Other (please describe after [Answer]: tag below)

[Answer]: D - No habra RDS pues no se usara en la POC.

## Question 8
¿Cuántos entornos (environments/stages) quieres en CDK?

A) Solo uno: `dev` (ambiente único para la POC, despliegue directo)

B) Dos: `dev` + `prod` (separación mínima, parámetros distintos)

C) Other (please describe after [Answer]: tag below)

[Answer]: C - Quiero entorno de test, ya que dev seria el entorno local. 

## Question 9
Para el frontend en CloudFront + S3, ¿necesitas WAF (Web Application Firewall)?

A) No — sin WAF para la POC (menor complejidad y costo)

B) Sí — WAF básico con reglas managed (protección básica contra bots y ataques comunes)

C) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 10
¿Cómo quieres manejar el empaquetado de las Lambdas (Backend y BFF)?

A) Docker container images (reutiliza los Dockerfiles existentes del dev local, consistent con Garden)

B) Zip bundles (packaging con pip + zip, más rápido en cold start pero setup diferente al dev local)

C) Other (please describe after [Answer]: tag below)

[Answer]: C - Desde mi punto de vista no es necesario usar lambdas ya que solo sera el cluster de EKS en Fargate, no es neceario nada mas adicional. 

## Question 11
¿Deseas monitoreo/observabilidad para la POC?

A) Mínimo — solo CloudWatch Logs de Lambda + métricas por defecto (gratis dentro de free tier)

B) Básico — CloudWatch Logs + Alarms para errores 5xx y latencia alta

C) Sin monitoreo — solo desplegar, revisar logs manualmente si hay problemas

D) Other (please describe after [Answer]: tag below)

[Answer]: A
