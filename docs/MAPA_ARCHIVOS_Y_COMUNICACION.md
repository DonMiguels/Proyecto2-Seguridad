# Mapa de archivos y comunicación del sistema

## 1. Alcance

Este documento resume, según la estructura actual del repositorio, la **responsabilidad principal de cada archivo funcional** y cómo se comunica con el resto del sistema.

Incluye:

- Infraestructura (Docker, redes, LDAP, certificados, secretos)
- Backend (capas `domain`, `application`, `infrastructure`, `presentation`, `shared`)
- Frontend público
- CLI de simulación
- SQL de inicialización
- Documentación técnica existente
- Testing (`unit`, `integration`, `helpers`)

No detalla archivos internos de `.git` ni contenido sensible de secretos.

---

## 2. Comunicación global (resumen)

1. Usuario externo entra por `frontend` (`:8080`) y Nginx enruta `/api/*` hacia `backend:3000`.
2. `backend` expone rutas v1 y legacy, valida JWT/roles/idempotencia y ejecuta casos de uso.
3. Casos de uso de auth se apoyan en LDAP (LDAPS) + JWT + repositorio de refresh tokens.
4. Casos de uso de envíos se apoyan en repositorio PostgreSQL y auditoría.
5. Revocación temprana de access tokens usa Redis (o fallback in-memory).
6. Hosts CLI (`host-*`) consumen API interna en `http://backend:3000/api/v1` y operan por rol.

---

## 3. Raíz del proyecto

- `.dockerignore`: evita copiar archivos innecesarios al contexto de build Docker.
- `.env`: variables base de entorno local/runtime.
- `.env.docker`: variables orientadas a ejecución en Docker Compose.
- `.eslintignore`: exclusiones para lint.
- `.eslintrc.cjs`: reglas ESLint para Node ESM.
- `.gitignore`: exclusiones de control de versiones.
- `.prettierignore`: exclusiones de formato.
- `.prettierrc`: reglas de formato Prettier.
- `docker-compose.yml`: orquestación completa (frontend, backend, db, redis, ldap y hosts CLI), redes segmentadas, hardening y secretos.
- `Dockerfile`: imagen backend multi-stage (producción/desarrollo).
- `Dockerfile.frontend`: imagen Nginx para frontend público.
- `Dockerfile.simulation`: imagen para hosts CLI operativos.
- `Dockerfile.test`: imagen para ejecutar pruebas de simulación.
- `package.json`: metadatos, dependencias y scripts operativos/test/lint.
- `package-lock.json`: lockfile para builds reproducibles.
- `README.md`: guía principal de arquitectura, setup y operación.
- `server.js`: bootstrap del servidor, conecta DB e inicia app Express.
- `vitest.config.js`: configuración de Vitest para specs Node.

Comunicación clave:

- `server.js` consume `src/app.js`, `src/config/database.js`, `src/shared/config/env.js` y `src/utils/logger.js`.
- Compose conecta servicios por DNS interno (`backend`, `db`, `redis`, `ldap`, `host-*`).

---

## 4. Base de datos

- `database/init.sql`: crea tablas `envios`, `audit_logs`, `auth_refresh_tokens`, índices e inserta datos demo.

Comunicación:

- Es montado por `docker-compose.yml` en PostgreSQL para inicialización automática.
- Repositorios PostgreSQL en `src/infrastructure/database/postgres/*` consumen este esquema.

---

## 5. Frontend / Edge

- `public/index.html`: UI pública de tracking.
- `frontend/nginx/default.conf`: servidor Nginx; enruta `/api/` al backend y sirve SPA estática.

Comunicación:

- Cliente externo → `frontend:8080`.
- Nginx → `backend:3000/api/*` en red interna `app_net`.

---

## 6. LDAP, TLS y bootstrap de identidad

### `ldap/bootstrap`

- `ldap/bootstrap/README.md`: explica carga automática de LDIF al iniciar LDAP.
- `ldap/bootstrap/ldif/01-base.ldif`: crea OUs y grupos base (`admins`, `despacho`, `mostrador`, `atencion`).
- `ldap/bootstrap/ldif/02-users.ldif`: crea usuarios operativos y cuenta de servicio LDAP.

### `ldap/certs`

- `ldap/certs/README.md`: guía del material TLS para LDAPS.
- `ldap/certs/ca.crt`: CA de confianza para validar LDAP desde backend.
- `ldap/certs/server.crt`: certificado del servidor LDAP.
- `ldap/certs/server.key`: clave privada del certificado LDAP.
- `ldap/certs/dhparam.pem`: parámetros Diffie-Hellman (fortalecimiento TLS).

Comunicación:

- `backend` usa `NODE_EXTRA_CA_CERTS` + `LDAP_TLS_REJECT_UNAUTHORIZED=true` para validación estricta de LDAPS.
- `src/infrastructure/identity/ldap/ldap-auth.repository.js` hace bind/search/bind y deriva rol por grupos.

---

## 7. Secretos

- `secrets/db_password.txt`: secreto DB.
- `secrets/jwt_secret.txt`: secreto JWT HS.
- `secrets/ldap_admin_password.txt`: secreto admin LDAP.
- `secrets/ldap_bind_password.txt`: secreto de bind para backend.
- `secrets/ldap_config_password.txt`: secreto de configuración LDAP.

Comunicación:

- `docker-compose.yml` monta secretos en `/run/secrets/*`.
- `src/shared/config/env.js` resuelve `*_FILE` para obtener secretos en runtime.

---

## 8. CLI de simulación

### Hosts (`simulation-cli/hosts`)

- `admin.cli.js`: menú de administración (métricas, actividad, tracking, forzar estado, eventos de seguridad legacy).
- `atencion.cli.js`: operaciones de atención (tracking, entregado/cancelado según permisos).
- `consulta.cli.js`: host de consulta de tracking (solo lectura por rol).
- `despacho.cli.js`: operaciones de despacho (transiciones operativas + tracking).
- `mostrador.cli.js`: registro de envíos + consulta tracking.

### Librerías (`simulation-cli/lib`)

- `auth.js`: autenticación CLI, validación de rol y utilidades de menú.
- `cli.js`: interfaz interactiva por `readline` (preguntas, header, ciclo).
- `store.js`: cliente HTTP al backend (`login`, `shipments`, `admin`) y utilidades auxiliares legacy para tests.

Comunicación:

- Hosts → `lib/auth.js` para sesión y autorización.
- Hosts → `lib/store.js` para llamadas HTTP a `/api/v1/*`.
- CLI se ejecuta dentro de contenedores `host-*` conectados a `app_net`.

---

## 9. Backend (`src/`)

## 9.1 Entrada y composición

- `src/app.js`: crea app Express, monta rutas v1/legacy, middlewares y handlers globales.
- `src/shared/container.js`: composition root, crea repositorios, casos de uso, controladores y middlewares.
- `src/config/database.js`: crea `Pool` de PostgreSQL usando configuración centralizada.
- `src/utils/logger.js`: logger con timestamp configurable por offset.

Comunicación:

- `app.js` depende de `container.js`.
- `container.js` conecta capas: infraestructura ↔ aplicación ↔ presentación.

## 9.2 Capa de dominio

- `src/domain/auth/auth-errors.js`: jerarquía de errores de autenticación/sesión.
- `src/domain/shipment/shipment-errors.js`: errores de dominio para envíos.
- `src/domain/shipment/shipment-status.js`: validación de estados y reglas de transición.
- `src/domain/shipment/shipment.entity.js`: entidad `Shipment` y método `changeStatus` con invariantes.

Comunicación:

- Los casos de uso de `application` usan estas reglas y errores para decisiones de negocio.

## 9.3 Capa de aplicación (casos de uso)

- `src/application/auth/authenticate-user.use-case.js`: autentica contra repositorio de identidad, emite access/refresh y persiste refresh token.
- `src/application/auth/refresh-session.use-case.js`: valida refresh token, rota token y emite nuevos tokens.
- `src/application/auth/logout-session.use-case.js`: revoca refresh token y blacklist de access token por `jti`.
- `src/application/shipment/create-shipment.use-case.js`: valida payload y crea envío con tracking generado.
- `src/application/shipment/get-shipment-by-tracking.use-case.js`: consulta envío por tracking y maneja no encontrado.
- `src/application/shipment/update-shipment-status.use-case.js`: transición de estado + auditoría en transacción.

Comunicación:

- Casos de uso no conocen Express ni SQL directo; dependen de puertos/adaptadores inyectados.

## 9.4 Capa de infraestructura

### Cache

- `src/infrastructure/cache/in-memory/access-token-blacklist.store.js`: blacklist de JWT en memoria (fallback).
- `src/infrastructure/cache/in-memory/idempotency-key.store.js`: almacenamiento in-memory de idempotencia con TTL.
- `src/infrastructure/cache/redis/access-token-blacklist.store.js`: blacklist de JWT en Redis.

### PostgreSQL

- `src/infrastructure/database/postgres/audit.repository.js`: persistencia/lectura de auditoría.
- `src/infrastructure/database/postgres/refresh-token.repository.js`: hash, persistencia, consulta y revocación de refresh tokens.
- `src/infrastructure/database/postgres/shipment.repository.js`: CRUD/consultas de envíos y transacciones.
- `src/infrastructure/database/postgres/queries/audit.queries.js`: SQL para auditoría.
- `src/infrastructure/database/postgres/queries/envios.queries.js`: SQL base de envíos (legacy/shared).
- `src/infrastructure/database/postgres/queries/refresh-token.queries.js`: SQL refresh tokens.
- `src/infrastructure/database/postgres/queries/shipment.queries.js`: SQL de envíos + métricas por estado.

### LDAP

- `src/infrastructure/identity/ldap/ldap-auth.repository.js`: autenticación LDAP estricta (bind/search/bind), extracción de `memberOf` y mapeo grupo→rol.

Comunicación:

- Repositorios son usados por casos de uso en `application`.
- `LdapAuthRepository` es consumido por `AuthenticateUserUseCase`.

## 9.5 Capa de presentación HTTP

### Controladores

- `src/presentation/http/controllers/admin.controller.js`: endpoints admin (métricas y actividad).
- `src/presentation/http/controllers/auth.controller.js`: login/refresh/logout y mapeo de errores a HTTP.
- `src/presentation/http/controllers/jwks.controller.js`: endpoint JWKS para validación pública cuando aplica.
- `src/presentation/http/controllers/shipment.controller.js`: endpoints de envíos + traducción de errores de dominio a HTTP.

### Middlewares

- `src/presentation/http/middlewares/auth.middleware.js`: validación JWT, tipo de token y blacklist.
- `src/presentation/http/middlewares/idempotency.middleware.js`: exige `Idempotency-Key` y evita duplicados.
- `src/presentation/http/middlewares/role.middleware.js`: autorización por rol.

### Rutas

- `src/presentation/http/routes/v1/auth.routes.js`: `/auth/login|refresh|logout` (v1).
- `src/presentation/http/routes/v1/security.routes.js`: `/.well-known/jwks.json` (v1).
- `src/presentation/http/routes/v1/admin.routes.js`: `/admin/metrics|activity` (v1, admin).
- `src/presentation/http/routes/v1/shipment.routes.js`: `/shipments/*` (v1).
- `src/presentation/http/routes/legacy/auth.routes.js`: rutas auth legacy bajo `/api`.
- `src/presentation/http/routes/legacy/envios.routes.js`: rutas envíos legacy bajo `/api`.

Comunicación:

- Rutas llaman a controladores.
- Controladores invocan casos de uso o repositorios según su responsabilidad.
- Middlewares se aplican antes de mutaciones/consultas protegidas.

## 9.6 Compatibilidad legacy (fuera de hexagonal principal)

- `src/controllers/envio.controller.js`: controlador legacy original con SQL directo.
- `src/routes/envios.routes.js`: ruteo legacy original asociado al controlador anterior.
- `src/queries/envios.queries.js`: export legacy hacia queries de infraestructura.

Comunicación:

- Mantiene compatibilidad histórica; la ruta principal actual está en `presentation/http`.

## 9.7 Configuración compartida y seguridad JWT

- `src/shared/config/env.js`: carga/valida variables de entorno y secretos `*_FILE`.
- `src/shared/config/shipment-status.config.js`: catálogo de estados, transiciones y mapeo de métricas.
- `src/shared/security/jwt-keyset.service.js`: gestión de claves JWT (HS/RS) y JWKS.
- `src/shared/security/jwt-token.service.js`: firma/verificación/decode de tokens de acceso y refresh.

Comunicación:

- `container.js` crea servicios JWT y los inyecta en casos de uso y middlewares.

---

## 10. Pruebas

### Helpers

- `tests/helpers/simulation-cli-test.utils.js`: utilidades compartidas para pruebas de CLI/simulación.

### Integration

- `tests/integration/infrastructure/postgres-audit.repository.spec.js`: verifica repositorio de auditoría.
- `tests/integration/infrastructure/postgres-refresh-token.repository.spec.js`: verifica persistencia/revocación de refresh tokens.
- `tests/integration/infrastructure/postgres-shipment.repository.spec.js`: verifica repositorio de envíos y transacciones.
- `tests/integration/presentation/auth.controller.spec.js`: endpoints de autenticación y sesiones.
- `tests/integration/presentation/jwks.controller.spec.js`: endpoint JWKS.
- `tests/integration/presentation/shipment.controller.spec.js`: endpoints de envíos y estados.
- `tests/integration/simulation-cli/host-flow.spec.js`: flujo integrado de hosts CLI con API.

### Unit

- `tests/unit/application/authenticate-user.use-case.spec.js`: reglas del caso de uso de login.
- `tests/unit/application/refresh-session.use-case.spec.js`: reglas de rotación de sesión.
- `tests/unit/application/update-shipment-status.use-case.spec.js`: transición de estado + auditoría.
- `tests/unit/domain/shipment.entity.spec.js`: invariantes de la entidad de envío.
- `tests/unit/presentation/auth.middleware.spec.js`: validación de JWT y respuestas HTTP.
- `tests/unit/presentation/idempotency.middleware.spec.js`: comportamiento de idempotencia.
- `tests/unit/shared/env.config.spec.js`: validación de configuración de entorno.
- `tests/unit/shared/jwt-keyset.service.spec.js`: comportamiento de llaves/JWKS.
- `tests/unit/simulation-cli/admin.cli.spec.js`: lógica del host admin.
- `tests/unit/simulation-cli/atencion.cli.spec.js`: lógica del host atención.
- `tests/unit/simulation-cli/despacho.cli.spec.js`: lógica del host despacho.
- `tests/unit/simulation-cli/mostrador.cli.spec.js`: lógica del host mostrador.

Comunicación:

- Unit aísla funciones/componentes.
- Integration verifica contratos entre capas adaptadoras, controladores y repositorios.

---

## 11. Documentación existente (`docs/`)

- `docs/arquitectura_y_redes.md`: segmentación de redes y hardening Docker.
- `docs/autenticacion_ldap.md`: autenticación LDAP/LDAPS estricta.
- `docs/flujo_de_datos.md`: flujos E2E (tracking, login, operaciones).
- `docs/PHASE1_ARCHITECTURE.md`: decisión arquitectónica (hexagonal/clean).
- `docs/PHASE2_DOCKERIZATION.md`: dockerización, hardening y secretos.
- `docs/PHASE3_REFACTOR_BASE.md`: refactor de base y configuración centralizada.
- `docs/PHASE4_DOMAIN_TESTING.md`: dominio, testing, JWT/JWKS, refresh/logout.
- `docs/REDIS_USAGE_AND_TOKEN_REVOCATION.md`: diseño de revocación temprana con Redis.
- `docs/servicios_cli.md`: operación de hosts CLI.
- `docs/TECHNICAL_DOCUMENTATION.md`: documentación técnica general consolidada.

Comunicación:

- Estos documentos trazan decisiones y contratos que implementan los archivos de `docker-compose`, `src/`, `simulation-cli/` y `ldap/`.

---

## 12. Mapa rápido de dependencias internas

- Entrada HTTP: `server.js` → `src/app.js`.
- Composición: `src/app.js` → `src/shared/container.js`.
- Auth: `AuthController` → `Authenticate/Refresh/LogoutUseCase` → `LdapAuthRepository` + `PostgresRefreshTokenRepository` + `JwtTokenService` + blacklist.
- Shipments: `ShipmentController` → `Create/Get/UpdateUseCase` → `PostgresShipmentRepository` (+ `PostgresAuditRepository` en update).
- Seguridad HTTP: rutas mutables → `auth.middleware` + `role.middleware` + `idempotency.middleware`.
- CLI: `simulation-cli/hosts/*.cli.js` → `simulation-cli/lib/auth.js` + `simulation-cli/lib/store.js` → API backend.

---

## 13. Conclusión breve

La estructura implementa una base **hexagonal/clean** con separación razonable entre dominio, casos de uso, adaptadores de infraestructura y capa HTTP, más una capa operativa de simulación CLI y un frente Nginx. La comunicación principal está desacoplada por interfaces y orquestada en `src/shared/container.js`, mientras que Docker Compose impone aislamiento de red, secretos y endurecimiento de runtime.
