# Flujo de Datos End-to-End

## 1. Visión general

La plataforma opera con un patrón de entrada controlada por frontend y API central, con integración a identidad y datos internos.

Componentes del flujo:

- Frontend público (Nginx + página de tracking)
- Backend API (Express)
- PostgreSQL (envíos, auditoría, refresh tokens)
- Redis (blacklist de access tokens por `jti`)
- OpenLDAP (autenticación y rol)
- Hosts CLI (operación interna por departamentos)

Segmentación obligatoria:

- Tráfico público: `edge_net`
- Tráfico interno de aplicación: `app_net` (`internal`)
- Identidad: `identity_net` (`internal`)
- Datos: `data_net` (`internal`)

---

## 2. Flujo: consulta de tracking desde frontend público

```mermaid
sequenceDiagram
  participant U as Usuario
  participant FE as Frontend (Nginx)
  participant BE as Backend API
  participant DB as PostgreSQL

  U->>FE: Abre http://localhost:8080
  U->>FE: Consulta tracking
  FE->>BE: GET /api/envios/:codigo (proxy /api)
  BE->>DB: SELECT envios por codigo_tracking
  DB-->>BE: Datos de envío
  BE-->>FE: JSON envío
  FE-->>U: Resultado en UI
```

Notas:

- Frontend no accede directo a DB.
- Nginx enruta `/api/*` hacia `backend:3000/api/*` en red interna `app_net`.

---

## 3. Flujo: login LDAP + emisión de tokens

```mermaid
sequenceDiagram
  participant C as Cliente/CLI
  participant BE as Backend
  participant LDAP as OpenLDAP
  participant DB as PostgreSQL

  C->>BE: POST /api/v1/auth/login (username,password)
  BE->>LDAP: bind service account
  BE->>LDAP: search user + bind user
  LDAP-->>BE: identidad + memberOf
  BE->>BE: derivar rol + generar JWT access/refresh
  BE->>DB: guardar hash refresh token
  BE-->>C: accessToken + refreshToken + user
```

Notas:

- El rol final proviene del mapeo grupo LDAP ↔ rol de negocio.
- El refresh token se persiste hasheado (`sha256`) en `auth_refresh_tokens`.
- Validación TLS LDAP estricta en backend (`LDAP_TLS_REJECT_UNAUTHORIZED=true` + CA confiable).

---

## 4. Flujo: creación de envío desde Host Mostrador

```mermaid
sequenceDiagram
  participant HM as host_mostrador
  participant BE as Backend
  participant DB as PostgreSQL

  HM->>BE: POST /api/v1/shipments
  Note over HM,BE: Authorization + Idempotency-Key
  BE->>BE: valida JWT, rol (MOSTRADOR/ADMIN), idempotencia
  BE->>DB: INSERT envios
  DB-->>BE: envío creado
  BE-->>HM: 201 + codigo_tracking
```

Reglas relevantes:

- `Idempotency-Key` obligatorio para mutaciones.
- La API aplica autorización por rol en rutas mutables.

---

## 5. Flujo: actualización de estado con auditoría transaccional

```mermaid
sequenceDiagram
  participant OP as Despacho/Atencion/Admin
  participant BE as Backend
  participant DB as PostgreSQL

  OP->>BE: PATCH /api/v1/shipments/:codigo/status
  Note over OP,BE: Authorization + Idempotency-Key
  BE->>BE: valida transición de dominio
  BE->>DB: BEGIN
  BE->>DB: UPDATE envios.estado
  BE->>DB: INSERT audit_logs
  BE->>DB: COMMIT
  DB-->>BE: estado actualizado
  BE-->>OP: 200 + envío actualizado
```

Notas:

- El caso de uso asegura consistencia entre cambio de estado y registro en `audit_logs`.
- Si falla una parte, la transacción revierte.

---

## 6. Flujo: logout y revocación temprana de access token

```mermaid
sequenceDiagram
  participant C as Cliente/CLI
  participant BE as Backend
  participant DB as PostgreSQL
  participant R as Redis

  C->>BE: POST /api/v1/auth/logout
  BE->>DB: revoke refresh token
  BE->>BE: decode access token (jti, exp)
  BE->>R: SET blacklist:access:<jti> EX <ttl>
  BE-->>C: Session closed successfully
```

En requests protegidos posteriores:

1. Middleware valida firma JWT.
2. Consulta Redis para `jti`.
3. Si está en blacklist, responde `401 Token has been revoked`.

---

## 7. Persistencia y tablas principales

- `envios`: entidad principal de negocio.
- `audit_logs`: trazabilidad de acciones críticas.
- `auth_refresh_tokens`: sesión y rotación de refresh tokens (hash + revocación + expiración).

Datos demo iniciales se cargan mediante `database/init.sql`.

---

## 8. Legacy vs v1

La API mantiene compatibilidad:

- v1: `/api/v1/*`
- legacy: `/api/*` (por ejemplo `/api/envios/:codigo`)

El frontend público utiliza endpoints legacy para tracking y estado, mientras que hosts CLI operan contra v1.

## 9. Seguridad de despliegue

- Solo frontend publica puertos al host.
- Backend, LDAP, DB, Redis y hosts CLI permanecen sin `ports` expuestos.
- Secretos de runtime se consumen desde archivos de secretos Docker.
