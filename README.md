# Red de Deliveries - Plataforma Dockerizada con OpenLDAP

Plataforma integral para gestión de envíos con:

- Frontend público de tracking (Nginx)
- API central (Node.js + Express)
- PostgreSQL para datos de negocio y auditoría
- Redis para revocación temprana de access tokens
- OpenLDAP (LDAPS) para autenticación y autorización por roles
- Hosts CLI operativos (Despacho, Mostrador, Atención, Admin) conectados al backend vía red interna Docker

## Arquitectura (contenedores y redes)

```mermaid
flowchart LR
Internet((Usuario)) --> FE[frontend\nNginx :8080]

subgraph edge_net
FE
end

subgraph app_net
FE --> BE[backend\nNode/Express :3000 interno]
HD[host_despacho]
HM[host_mostrador]
HA[host_atencion]
HADM[host_admin]
HD --> BE
HM --> BE
HA --> BE
HADM --> BE
end

subgraph identity_net
BE --> LDAP[ldap\nLDAPS :636 interno]
end

subgraph data_net (internal)
BE --> DB[(PostgreSQL)]
BE --> REDIS[(Redis)]
end
```

## Pre-requisitos

- Docker Engine 24+
- Docker Compose v2

Verificación rápida:

```bash
docker --version
docker compose version
```

## Quickstart (despliegue paso a paso)

1. Clonar el repositorio y ubicarse en la carpeta del proyecto.

1. Verificar variables de entorno:

- Para Docker se usa `.env.docker`.
- Crear secretos locales en `secrets/*.txt` (no versionados):
  - `jwt_secret.txt`
  - `db_password.txt`
  - `ldap_bind_password.txt`
  - `ldap_admin_password.txt`
  - `ldap_config_password.txt`
- Opcionalmente puedes crear/ajustar `.env` para ejecución local no containerizada.

1. Levantar todo el stack:

```bash
docker compose up -d --build
```

1. Confirmar estado de servicios:

```bash
docker compose ps
```

1. Acceder al frontend público:

- <http://localhost:8080>

## Uso crítico de Hosts CLI por `docker attach`

Los hosts CLI corren en modo interactivo permanente con TTY abierto.

Adjuntar sesión:

```bash
docker attach host_despacho
docker attach host_mostrador
docker attach host_atencion
docker attach host_admin
```

### Salida segura sin matar el contenedor

Para desacoplarte y dejar el host activo, usa exactamente:

1. `Ctrl+p`
2. `Ctrl+q`

No uses `Ctrl+c` si deseas mantener el proceso del host en ejecución.

## Credenciales por defecto (entorno Docker)

### LDAP (usuarios operativos)

- `admin` / `admin123` → rol `ADMIN`
- `despacho` / `despacho123` → rol `DESPACHO`
- `mostrador` / `mostrador123` → rol `MOSTRADOR`
- `atencion` / `atencion123` → rol `ATENCION`

### LDAP (administración / bind)

- Admin LDAP: `cn=admin,dc=empresa,dc=local` / valor en `secrets/ldap_admin_password.txt`
- Service account backend: `cn=svc-backend,ou=ServiceAccounts,dc=empresa,dc=local` / valor en `secrets/ldap_bind_password.txt`

### Base de datos PostgreSQL

- Host interno Docker: `db`
- Puerto interno: `5432`
- DB: `deliveries`
- Usuario: `postgres`
- Password: valor en `secrets/db_password.txt`

> Nota: en bootstrap LDAP los `userPassword` se almacenan como hash SSHA y el backend valida TLS LDAP con CA confiable (`LDAP_TLS_REJECT_UNAUTHORIZED=true`).

## Endpoints principales

- API v1 autenticación: `/api/v1/auth/login`, `/api/v1/auth/refresh`, `/api/v1/auth/logout`
- API v1 envíos: `/api/v1/shipments`, `/api/v1/shipments/:codigo`, `/api/v1/shipments/:codigo/status`
- API v1 admin: `/api/v1/admin/metrics`, `/api/v1/admin/activity`
- JWKS: `/api/v1/.well-known/jwks.json`
- Legacy: `/api/envios/*`, `/api/auth/*`

## Operación útil

```bash
# Ver logs en tiempo real
docker compose logs -f

# Reiniciar un host CLI puntual
docker compose restart host-despacho

# Bajar stack sin borrar volúmenes
docker compose down

# Bajar stack y borrar volúmenes (reseteo completo)
docker compose down -v
```

## Pruebas

```bash
npm test
npm run test:unit
npm run test:integration
npm run test:simulation
```

## Documentación técnica detallada

- `docs/arquitectura_y_redes.md`
- `docs/servicios_cli.md`
- `docs/autenticacion_ldap.md`
- `docs/flujo_de_datos.md`
- `docs/TECHNICAL_DOCUMENTATION.md`
