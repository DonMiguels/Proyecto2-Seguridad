# Fase 2 — Dockerización Máster

## Objetivo

Contenerización robusta para desarrollo y producción con foco en seguridad, tamaño de imagen y reproducibilidad.

## Cambios implementados (estado actualizado)

### 1) Dockerfile multi-stage

Archivo: [Dockerfile](../Dockerfile)

- `base`: prepara entorno base y `dumb-init`.
- `deps-prod`: instala solo dependencias de runtime con lockfile (`npm ci --omit=dev`).
- `deps-dev`: instala dependencias completas de forma reproducible (`npm ci`).
- `production`:
  - imagen Alpine,
  - usuario no root (`appuser`),
  - `ENTRYPOINT` con `dumb-init`,
  - copia mínima de artefactos,
  - build reproducible usando `package-lock.json`.
- `development`:
  - incluye `nodemon` y arranque con `npm run debugging`.

### 2) docker-compose endurecido y segmentado

Archivo: [docker-compose.yml](../docker-compose.yml)

- Redes segmentadas:
  - `edge_net` (pública)
  - `app_net` (`internal: true`)
  - `identity_net` (`internal: true`)
  - `data_net` (`internal: true`)
- Exposición de puertos:
  - solo `frontend` publica `8080:8080`
  - backend/ldap/db/redis/hosts sin puertos publicados
- DB endurecida:
  - `postgres:17-alpine`.
  - volumen persistente `postgres_data`.
  - `healthcheck` activo.
- Backend endurecido (prod):
  - `read_only: true`.
  - `tmpfs: /tmp`.
  - `security_opt: no-new-privileges:true`.
  - `cap_drop: [ALL]`.
  - `init: true`.
  - `healthcheck` por socket local.

- Seguridad adicional:
  - secretos por archivos en `secrets/*.txt` (Docker secrets)
  - validación TLS LDAP estricta (`LDAP_TLS_REJECT_UNAUTHORIZED=true`)
  - cadena de confianza LDAP por `NODE_EXTRA_CA_CERTS`

- Servicios con init process:
  - `db`, `redis`, `backend`, `backend-dev` con `init: true` para mejor manejo de señales y procesos huérfanos.

### 3) Gestión de secretos y material sensible

- Secretos locales fuera de VCS (`secrets/*.txt`).
- `userPassword` LDAP en bootstrap LDIF almacenado como hash `SSHA`.
- Certificados LDAP en `ldap/certs` con CA explícita para validación estricta.

### 4) .dockerignore exhaustivo

Archivo: [.dockerignore](../.dockerignore)

- excluye `node_modules`, logs, VCS, IDE, artefactos temporales/build.
- excluye tests y artefactos de tooling (`tests`, `.cache`, `.next`, `.turbo`, `tmp`, `temp`).
- excluye secretos por patrón (`.env*`) y permite explícitamente `.env.docker`.

### 5) Scripts npm alineados

Archivo: [package.json](../package.json)

- `npm run dev` → `docker-compose --profile dev up --build`
- `npm start` → `docker-compose --profile prod up --build`
- `npm run clean` → `docker-compose down -v --remove-orphans`

## Validación ejecutada

- `docker compose config` ✅

## Notas operativas

- Las credenciales/variables se cargan desde `.env` y `.env.docker`.
- En contenedor, `DB_HOST` queda fijado a `db` para resolver por DNS interno de Docker.
- En producción real, reemplazar secretos por un gestor seguro (Kubernetes Secrets / Vault).
- El uso de `npm ci` garantiza builds determinísticos y mejora trazabilidad de dependencias.
