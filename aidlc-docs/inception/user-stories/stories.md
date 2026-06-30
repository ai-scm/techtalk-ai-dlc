# User Stories — App de Adopción de Mascotas

**Generated**: 2026-06-30
**Organización**: Feature-Based (por funcionalidad MVP)
**Granularidad**: Media (~20-25 historias)
**Priorización**: MoSCoW (Must / Should / Could)
**Criterios de aceptación**: Mixto (Given/When/Then para flujos principales, checklist para validaciones)
**INVEST**: Todas las historias verificadas contra los criterios INVEST

---

## Feature 1: Registro e Inicio de Sesión con Roles

### US-01: Registro de usuario con selección de rol
**Como** usuario nuevo,
**quiero** registrarme en la plataforma eligiendo mi rol (adoptante, persona que publica o fundación),
**para** acceder a las funcionalidades correspondientes a mi perfil.

**Criterios de aceptación:**
- Given que un usuario accede a la pantalla de registro, when completa email, contraseña y selecciona un rol válido, then se crea su cuenta en Cognito con el rol asignado y se redirige al inicio.
- Given que un usuario intenta registrarse con un email ya existente, when envía el formulario, then se muestra un error indicando que el email ya está registrado.
- El rol seleccionado no puede cambiarse después del registro.
- La contraseña debe cumplir requisitos mínimos de seguridad (largo, complejidad definidos por Cognito).

**Prioridad**: Must
**Complejidad**: M

---

### US-02: Inicio de sesión
**Como** usuario registrado,
**quiero** iniciar sesión con mi email y contraseña,
**para** acceder a la plataforma con los permisos de mi rol.

**Criterios de aceptación:**
- Given que un usuario ingresa credenciales válidas, when envía el formulario de login, then obtiene un token de sesión y accede al dashboard de su rol.
- Given que un usuario ingresa credenciales inválidas, when envía el formulario, then se muestra un mensaje de error genérico (sin revelar si el email existe).
- La sesión expira según la configuración de Cognito; el usuario debe re-autenticarse.

**Prioridad**: Must
**Complejidad**: S

---

## Feature 2: Publicar Mascota en Adopción

### US-03: Crear publicación de mascota
**Como** persona que publica o fundación,
**quiero** crear una publicación con la información básica de una mascota,
**para** que aparezca en el catálogo y los adoptantes puedan verla.

**Criterios de aceptación:**
- Given que un publicador completa los campos obligatorios (nombre, especie, edad, tamaño, ubicación, estado de salud, descripción), when guarda la publicación, then la mascota se crea con estado AVAILABLE y aparece en el catálogo.
- Given que un publicador omite algún campo obligatorio, when intenta guardar, then se muestra un error indicando los campos faltantes.
- Los atributos se normalizan: `species`, `size`, `ageGroup`, `location` son valores controlados (enum/lista predefinida).

**Prioridad**: Must
**Complejidad**: M

---

### US-04: Editar publicación de mascota
**Como** persona que publica o fundación,
**quiero** editar la información de una mascota que publiqué,
**para** corregir datos o actualizar su situación.

**Criterios de aceptación:**
- Given que un publicador accede a una mascota propia, when modifica campos y guarda, then los cambios se reflejan inmediatamente en el catálogo y detalle.
- Solo el publicador dueño de la mascota puede editar su información.
- No se puede editar una mascota con estado ADOPTED.

**Prioridad**: Should
**Complejidad**: S

---

## Feature 3: Agregar Fotos de la Mascota

### US-05: Subir fotos a una publicación
**Como** persona que publica o fundación,
**quiero** agregar fotos a la publicación de mi mascota,
**para** que los adoptantes vean cómo es y se interesen.

**Criterios de aceptación:**
- Given que un publicador selecciona archivos JPG o PNG de hasta 5 MB, when los sube (máximo 3 por mascota), then las fotos se almacenan en S3 y se muestran en el detalle de la mascota.
- Given que un publicador intenta subir un archivo mayor a 5 MB, when lo selecciona, then se muestra un error de tamaño antes de subir.
- Given que un publicador intenta subir un formato no soportado (ej: GIF, BMP), when lo selecciona, then se muestra un error de formato.
- Given que una mascota ya tiene 3 fotos, when el publicador intenta agregar otra, then se muestra un error indicando el límite alcanzado.

**Prioridad**: Must
**Complejidad**: M

---

### US-06: Eliminar foto de una publicación
**Como** persona que publica o fundación,
**quiero** eliminar una foto que subí a mi mascota,
**para** reemplazarla o corregir la galería.

**Criterios de aceptación:**
- Given que un publicador selecciona una foto existente de su mascota, when confirma la eliminación, then la foto se elimina de S3 y del detalle de la mascota.
- Solo el publicador dueño puede eliminar las fotos de su mascota.

**Prioridad**: Should
**Complejidad**: S

---

## Feature 4: Consultar Catálogo de Mascotas Disponibles

### US-07: Ver catálogo de mascotas disponibles
**Como** adoptante,
**quiero** ver un listado de todas las mascotas disponibles para adopción,
**para** explorar opciones y encontrar una que me interese.

**Criterios de aceptación:**
- Given que un adoptante accede al catálogo, when se carga la página, then se muestran solo mascotas con estado AVAILABLE, ordenadas por fecha de publicación (más recientes primero).
- El catálogo soporta paginación (cursor-based); no se cargan todas las mascotas a la vez.
- Cada tarjeta del catálogo muestra: foto principal (si tiene), nombre, especie, edad, tamaño y ubicación.

**Prioridad**: Must
**Complejidad**: M

---

## Feature 5: Filtrar Mascotas por Criterios Básicos

### US-08: Filtrar mascotas por especie
**Como** adoptante,
**quiero** filtrar el catálogo por especie (perro, gato, etc.),
**para** ver solo el tipo de mascota que busco.

**Criterios de aceptación:**
- Given que un adoptante selecciona un filtro de especie, when se aplica, then el catálogo muestra solo mascotas AVAILABLE de esa especie.
- El filtro usa el GSI `status + species` (no scan completo).
- El filtro se puede combinar con otros filtros activos.

**Prioridad**: Must
**Complejidad**: S

---

### US-09: Filtrar mascotas por ubicación
**Como** adoptante,
**quiero** filtrar el catálogo por ubicación (ciudad/zona),
**para** encontrar mascotas cercanas a donde vivo.

**Criterios de aceptación:**
- Given que un adoptante selecciona una ubicación, when se aplica el filtro, then se muestran solo mascotas AVAILABLE de esa ubicación.
- El filtro usa el GSI `status + location` (no scan completo).
- El filtro se puede combinar con otros filtros activos.

**Prioridad**: Must
**Complejidad**: S

---

### US-10: Filtrar mascotas por tamaño y edad
**Como** adoptante,
**quiero** filtrar el catálogo por tamaño y/o grupo de edad,
**para** encontrar mascotas compatibles con mi espacio y estilo de vida.

**Criterios de aceptación:**
- Given que un adoptante aplica filtros de tamaño o edad, when se ejecuta la consulta, then los resultados se filtran en backend sobre un conjunto ya acotado por GSI (especie o ubicación).
- No se permite scan completo de tabla como estrategia para estos filtros.
- Los filtros de tamaño y edad pueden combinarse entre sí y con especie/ubicación.

**Prioridad**: Should
**Complejidad**: S

---

## Feature 6: Ver Detalle de una Mascota

### US-11: Ver información completa de una mascota
**Como** adoptante,
**quiero** ver la información completa de una mascota al seleccionarla del catálogo,
**para** decidir si quiero enviar una solicitud de adopción.

**Criterios de aceptación:**
- Given que un adoptante selecciona una mascota del catálogo, when se abre el detalle, then se muestra: nombre, especie, edad, tamaño, ubicación, estado de salud, descripción, todas las fotos y estado de la publicación.
- La consulta es directa por `petId` (no scan).
- Si la mascota no existe o fue eliminada, se muestra un mensaje de "mascota no encontrada".

**Prioridad**: Must
**Complejidad**: S

---

## Feature 7: Enviar Solicitud de Adopción

### US-12: Enviar solicitud de adopción
**Como** adoptante,
**quiero** enviar una solicitud de adopción para una mascota que me interesa,
**para** iniciar el proceso de contacto con quien la publica.

**Criterios de aceptación:**
- Given que un adoptante tiene menos de 3 solicitudes activas y la mascota está AVAILABLE, when envía la solicitud, then se crea con estado SENT y el publicador puede verla en su lista de solicitudes.
- Given que un adoptante ya tiene 3 solicitudes activas, when intenta enviar otra, then se muestra un error indicando el límite alcanzado.
- Given que la mascota no está en estado AVAILABLE, when el adoptante intenta enviar solicitud, then se muestra un error indicando que la mascota no está disponible.
- Un adoptante no puede enviar más de una solicitud a la misma mascota.

**Prioridad**: Must
**Complejidad**: M

---

### US-13: Ver mis solicitudes enviadas
**Como** adoptante,
**quiero** ver el listado de mis solicitudes enviadas y su estado actual,
**para** hacer seguimiento del proceso de adopción.

**Criterios de aceptación:**
- Given que un adoptante accede a "mis solicitudes", when se carga la vista, then se muestra una lista con: nombre de mascota, fecha de envío, estado actual de la solicitud.
- Los estados posibles son: SENT, IN_REVIEW, ACCEPTED, REJECTED, WAITLISTED, CANCELLED.
- La lista se ordena por fecha (más recientes primero).

**Prioridad**: Must
**Complejidad**: S

---

### US-14: Cancelar solicitud enviada
**Como** adoptante,
**quiero** cancelar una solicitud que envié y que aún no fue aceptada,
**para** liberar mi cupo de solicitudes activas si cambié de opinión.

**Criterios de aceptación:**
- Given que un adoptante tiene una solicitud en estado SENT o IN_REVIEW, when la cancela, then el estado cambia a CANCELLED y se libera un cupo de sus solicitudes activas.
- No se puede cancelar una solicitud ya ACCEPTED, REJECTED o CANCELLED.

**Prioridad**: Should
**Complejidad**: S

---

## Feature 8: Gestionar Solicitudes Recibidas

### US-15: Ver solicitudes recibidas para una mascota
**Como** persona que publica o fundación,
**quiero** ver todas las solicitudes recibidas para una mascota que publiqué,
**para** evaluar a los interesados y decidir a quién aceptar.

**Criterios de aceptación:**
- Given que un publicador accede a las solicitudes de una mascota propia, when se carga la vista, then se muestran todas las solicitudes con su estado, fecha y datos básicos del adoptante.
- Solo el publicador dueño de la mascota puede ver las solicitudes de esa mascota.

**Prioridad**: Must
**Complejidad**: S

---

### US-16: Aceptar una solicitud
**Como** persona que publica o fundación,
**quiero** aceptar una solicitud de adopción,
**para** avanzar el proceso con el adoptante seleccionado.

**Criterios de aceptación:**
- Given que un publicador selecciona una solicitud en estado SENT o IN_REVIEW, when la acepta, then: (1) la solicitud pasa a ACCEPTED, (2) la mascota pasa a estado IN_PROCESS, (3) las demás solicitudes pendientes de esa mascota pasan a WAITLISTED, (4) se comparten email y teléfono del adoptante con el publicador.
- Solo una solicitud puede estar en estado ACCEPTED por mascota a la vez.

**Prioridad**: Must
**Complejidad**: M

---

### US-17: Rechazar una solicitud
**Como** persona que publica o fundación,
**quiero** rechazar una solicitud que no considero adecuada,
**para** gestionar la lista de interesados.

**Criterios de aceptación:**
- Given que un publicador selecciona una solicitud en estado SENT, IN_REVIEW o WAITLISTED, when la rechaza, then la solicitud pasa a estado REJECTED.
- El rechazo es definitivo para esa solicitud (no se puede revertir).
- Se libera el cupo de solicitud activa del adoptante rechazado.

**Prioridad**: Must
**Complejidad**: S

---

### US-18: Poner solicitud en revisión
**Como** persona que publica o fundación,
**quiero** marcar una solicitud como "en revisión",
**para** indicar que estoy evaluando al candidato antes de tomar una decisión.

**Criterios de aceptación:**
- Given que un publicador tiene una solicitud en estado SENT, when la marca como en revisión, then el estado cambia a IN_REVIEW.
- El adoptante puede ver que su solicitud está siendo revisada en su lista de solicitudes.

**Prioridad**: Could
**Complejidad**: S

---

## Feature 9: Cambiar Estado de la Publicación

### US-19: Confirmar adopción completada
**Como** persona que publica o fundación,
**quiero** marcar una mascota como adoptada cuando el proceso se concreta,
**para** reflejar que la mascota ya tiene hogar y no recibir más solicitudes.

**Criterios de aceptación:**
- Given que una mascota está en estado IN_PROCESS con una solicitud ACCEPTED, when el publicador confirma la adopción, then la mascota pasa a estado ADOPTED y desaparece del catálogo público.
- Las solicitudes en WAITLISTED pasan a CANCELLED al confirmarse la adopción.
- No se puede marcar como adoptada una mascota que no está en IN_PROCESS.

**Prioridad**: Must
**Complejidad**: M

---

### US-20: Reactivar mascota cuando la adopción no se concreta
**Como** persona que publica o fundación,
**quiero** reactivar una mascota cuando el proceso con el adoptante seleccionado no se concreta,
**para** que vuelva a aparecer en el catálogo y las solicitudes en espera se reactiven.

**Criterios de aceptación:**
- Given que una mascota está en estado IN_PROCESS, when el publicador la reactiva, then: (1) la mascota vuelve a AVAILABLE, (2) la solicitud previamente ACCEPTED pasa a CANCELLED, (3) las solicitudes en WAITLISTED vuelven a su estado anterior (SENT o IN_REVIEW).
- La mascota reaparece en el catálogo público.

**Prioridad**: Should
**Complejidad**: M

---

## Feature 10: Eliminación de Cuenta

### US-21: Eliminar cuenta de adoptante
**Como** adoptante,
**quiero** eliminar mi cuenta de la plataforma,
**para** que mis datos sean removidos si ya no deseo usar el servicio.

**Criterios de aceptación:**
- Given que un adoptante solicita eliminar su cuenta, when confirma la acción, then: (1) se eliminan sus datos de usuario, (2) todas sus solicitudes activas (SENT, IN_REVIEW, WAITLISTED) pasan a CANCELLED, (3) las solicitudes ya ACCEPTED/REJECTED/CANCELLED no se modifican (solo se anonimiza el adoptante).
- La eliminación requiere confirmación explícita (doble clic o ingreso de contraseña).

**Prioridad**: Should
**Complejidad**: M

---

### US-22: Eliminar cuenta de publicador/fundación
**Como** persona que publica o fundación,
**quiero** eliminar mi cuenta de la plataforma,
**para** que mis datos y publicaciones sean removidos.

**Criterios de aceptación:**
- Given que un publicador solicita eliminar su cuenta, when confirma la acción, then: (1) se eliminan sus datos de usuario, (2) se eliminan todas sus publicaciones de mascotas del catálogo, (3) todas las solicitudes asociadas a sus mascotas pasan a CANCELLED (independiente de su estado actual), (4) las fotos se eliminan de S3.
- La eliminación requiere confirmación explícita.
- Los adoptantes con solicitudes a las mascotas de ese publicador ven sus solicitudes como CANCELLED y se liberan sus cupos.

**Prioridad**: Should
**Complejidad**: L

---

## Resumen

| Prioridad | Cantidad | IDs |
|---|---|---|
| **Must** | 13 | US-01, US-02, US-03, US-05, US-07, US-08, US-09, US-11, US-12, US-13, US-15, US-16, US-17, US-19 |
| **Should** | 8 | US-04, US-06, US-10, US-14, US-20, US-21, US-22 |
| **Could** | 1 | US-18 |
| **Total** | 22 | |

### Distribución por Feature

| Feature | Historias | IDs |
|---|---|---|
| Registro e inicio de sesión | 2 | US-01, US-02 |
| Publicar mascota | 2 | US-03, US-04 |
| Agregar fotos | 2 | US-05, US-06 |
| Consultar catálogo | 1 | US-07 |
| Filtrar mascotas | 3 | US-08, US-09, US-10 |
| Ver detalle | 1 | US-11 |
| Enviar solicitud | 3 | US-12, US-13, US-14 |
| Gestionar solicitudes | 4 | US-15, US-16, US-17, US-18 |
| Cambiar estado publicación | 2 | US-19, US-20 |
| Eliminación de cuenta | 2 | US-21, US-22 |

### Complejidad

| Complejidad | Cantidad |
|---|---|
| S (Small) | 12 |
| M (Medium) | 9 |
| L (Large) | 1 |
