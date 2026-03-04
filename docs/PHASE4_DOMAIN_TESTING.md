# Fase 4 — Desarrollo de Dominio y Testing

## Primer vertical slice implementado

Dominio `Shipment` con reglas de transición de estado:

- `REGISTRADO -> EN_TRANSITO`
- `EN_TRANSITO -> EN_REPARTO`
- `EN_REPARTO -> ENTREGADO`
- transiciones inválidas generan error de dominio.

## Auditoría transaccional implementada

- Se agregó persistencia de eventos de auditoría en `audit_logs`.
- `UpdateShipmentStatusUseCase` ahora ejecuta actualización de estado + auditoría en una misma transacción.
- Se incorporó `PostgresAuditRepository` como adaptador de salida para logging auditable.

## Autenticación y autorización JWT (Presentation)

- Se agregó middleware JWT para validar `Authorization: Bearer <token>`.
- Se agregó middleware de autorización por rol.
- Aplicado en rutas mutables (`POST` y `PATCH/PUT`) para v1 y legacy.
- Roles actuales:
  - creación: `MOSTRADOR`, `ADMIN`
  - actualización de estado: `DESPACHO`, `ADMIN`

## Login y adaptador LDAP (LDAPS)

- Nuevo caso de uso: `AuthenticateUserUseCase`.
- Nuevo controlador/rutas de login:
  - `POST /api/v1/auth/login`
  - `POST /api/auth/login` (legacy)
- Integración de `LdapAuthRepository` con `ldapts` para bind/search en directorio LDAP.
- Emisión de token de acceso con `JwtTokenService`.

## Firma asimétrica y JWKS

- Se incorporó `JwtKeysetService` con soporte para algoritmos `HS256` y `RS256`.
- Cuando se configura `RS256`, el sistema publica `JWKS` en:
  - `GET /api/v1/.well-known/jwks.json`
- Se incluye `kid` en los access tokens para rotación de claves.

## Refresh tokens, rotación y revocación

- Nuevos endpoints de sesión:
  - `POST /api/v1/auth/refresh`
  - `POST /api/v1/auth/logout`
  - `POST /api/auth/refresh` (legacy)
  - `POST /api/auth/logout` (legacy)
- Se incorporó persistencia de refresh tokens en `auth_refresh_tokens` (almacenados como hash SHA-256).
- Se implementó rotación de refresh token en cada operación de refresh.
- Se implementó revocación explícita de sesión en logout.
- El middleware de auth ahora acepta únicamente tokens de tipo `access`.

## Pruebas incorporadas

### Unit Tests

- `tests/unit/domain/shipment.entity.spec.js`
- `tests/unit/application/update-shipment-status.use-case.spec.js`
- `tests/unit/shared/env.config.spec.js`
- `tests/unit/presentation/auth.middleware.spec.js`
- `tests/unit/application/authenticate-user.use-case.spec.js`
- `tests/unit/shared/jwt-keyset.service.spec.js`
- `tests/unit/application/refresh-session.use-case.spec.js`

Cobertura funcional validada:

- estados válidos/inválidos,
- transiciones permitidas/prohibidas,
- manejo de `ShipmentNotFoundError` y payload inválido.

### Integration Tests

- `tests/integration/infrastructure/postgres-shipment.repository.spec.js`
  - integración repositorio PostgreSQL usando `pg-mem`.
- `tests/integration/infrastructure/postgres-audit.repository.spec.js`
  - integración de repositorio de auditoría con `pg-mem`.
- `tests/integration/presentation/shipment.controller.spec.js`
  - integración de controlador HTTP con `supertest`.
- `tests/integration/presentation/auth.controller.spec.js`
  - integración del endpoint de login con `supertest`.
- `tests/integration/presentation/jwks.controller.spec.js`
  - integración del endpoint JWKS con `supertest`.
- `tests/integration/infrastructure/postgres-refresh-token.repository.spec.js`
  - integración del repositorio de refresh tokens con `pg-mem`.

## Tooling de test

- `vitest.config.js`
- scripts:
  - `npm test`
  - `npm run test:unit`
  - `npm run test:integration`

## Resultado de validación

- `npm test` ✅ (37 tests)

## Próxima iteración sugerida

1. ✅ Introducido `Idempotency-Key` middleware en rutas de mutación (`POST`, `PATCH`, `PUT`) con store en memoria para entorno local.
2. ✅ Preparado `docker-compose` con servicio `redis` en red interna para evolución hacia idempotencia distribuida y cache.
3. ✅ Auditoría transaccional (`AuditLog`) agregada en caso de uso.
4. ✅ Integrada autenticación/autorización JWT en capa `presentation`.
5. ✅ Integrado adaptador de identidad LDAP (bind/search en LDAPS) para emisión de tokens.
6. ✅ Soporte de `JWKS/RS256` incorporado.
7. ✅ Implementados refresh tokens, rotación y revocación.
8. Endurecer estrategia de expiración (sliding sessions, blacklist distribuida en Redis).
