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

## Arranque desde cero (pasos validados en esta conversación)

Si vienes de intentos fallidos o de una máquina nueva, sigue esta secuencia completa.

1. Limpiar stack previo (incluyendo volúmenes):

```bash
docker compose down -v --remove-orphans
```

2. Crear secretos como **archivos** dentro de `secrets/` (no carpetas).  
   En Windows, si por error creaste carpetas con nombre `*.txt`, elimínalas y recrea los archivos.

PowerShell (ejemplo local):

```powershell
Remove-Item -Recurse -Force .\secrets\db_password.txt, .\secrets\jwt_secret.txt, .\secrets\ldap_admin_password.txt, .\secrets\ldap_config_password.txt, .\secrets\ldap_bind_password.txt -ErrorAction SilentlyContinue

Set-Content -Path .\secrets\db_password.txt -NoNewline -Value 'PgP@ssw0rd!2026'
Set-Content -Path .\secrets\jwt_secret.txt -NoNewline -Value 'jwt-secret-local-2026-change-me'
Set-Content -Path .\secrets\ldap_admin_password.txt -NoNewline -Value 'LdapAdminP@ss!2026'
Set-Content -Path .\secrets\ldap_config_password.txt -NoNewline -Value 'LdapConfigP@ss!2026'
Set-Content -Path .\secrets\ldap_bind_password.txt -NoNewline -Value 'LdapBindP@ss!2026'
```

3. Verificar material TLS de LDAP en `ldap/certs/`:

- Requeridos: `ca.crt`, `server.crt`, `server.key`.
- Si falta `server.key` (o certificados inválidos), regenera con OpenSSL en contenedor:

```powershell
$certDir = (Resolve-Path .\ldap\certs).Path
docker run --rm --entrypoint /bin/sh -v "${certDir}:/out" alpine/openssl -c "openssl genrsa -out /out/ca.key 2048; openssl req -x509 -new -nodes -key /out/ca.key -sha256 -days 3650 -subj '/CN=deliveries-ldap-ca' -out /out/ca.crt; openssl genrsa -out /out/server.key 2048; openssl req -new -key /out/server.key -subj '/CN=ldap' -out /out/server.csr; printf 'subjectAltName=DNS:ldap,DNS:localhost,IP:127.0.0.1\nextendedKeyUsage=serverAuth\n' > /tmp/ext.cnf; openssl x509 -req -in /out/server.csr -CA /out/ca.crt -CAkey /out/ca.key -CAcreateserial -out /out/server.crt -days 825 -sha256 -extfile /tmp/ext.cnf; rm -f /out/server.csr /out/ca.key /out/ca.srl"
```

4. Levantar servicios:

```bash
docker compose up -d --build
```

5. Confirmar salud del stack:

```bash
docker compose ps
```

Estado esperado: `db`, `ldap`, `redis`, `backend` y `frontend` en `Up`/`healthy`.

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
- `cliente` / `cliente123` → rol `CONSULTA` (solo tracking en frontend)

### LDAP (administración / bind)

- Admin LDAP: `cn=admin,dc=empresa,dc=local` / valor en `secrets/ldap_admin_password.txt`
- Cuenta de bind backend: `cn=admin,dc=empresa,dc=local` / valor en `secrets/ldap_bind_password.txt`

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
