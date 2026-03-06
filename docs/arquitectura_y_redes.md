# Arquitectura y Redes Docker (Hardening DevSecOps)

## 1. Objetivo

Simular un local de empresa de envíos con separación estricta de dominios:

- Capa pública (`edge_net`)
- Capa operativa de aplicación (`app_net`)
- Capa de identidad (`identity_net`)
- Capa de datos (`data_net`)

## 2. Redes y aislamiento

En [docker-compose.yml](../docker-compose.yml):

- `edge_net`: red pública para entrada HTTP (frontend).
- `app_net`: `internal: true`.
- `identity_net`: `internal: true`.
- `data_net`: `internal: true`.

Esto evita rutas directas desde/hacia exterior para backend, LDAP, DB, Redis y hosts CLI.

## 3. Exposición de puertos

- Expuesto al host: solo `frontend` en `8080:8080`.
- No expuesto al host: `backend`, `ldap`, `db`, `redis`, `host-*`.

## 4. Conectividad por DNS Docker (sin IPs fijas)

- Frontend → Backend: `http://backend:3000`
- Backend → DB: `db:5432`
- Backend → Redis: `redis:6379`
- Backend → LDAP: `ldaps://ldap:636`

No se usan IPs hardcodeadas.

## 5. Seguridad de contenedores

Controles aplicados por servicio (donde corresponde):

- `security_opt: no-new-privileges:true`
- `cap_drop: [ALL]`
- `read_only: true`
- `tmpfs` para escritura efímera
- `init: true`
- `healthcheck`

## 6. Segmentación funcional

- `frontend`: redes `edge_net` + `app_net`.
- `backend`: redes `app_net` + `identity_net` + `data_net`.
- `host-*`: solo `app_net`.
- `ldap`: solo `identity_net`.
- `db` y `redis`: solo `data_net`.

## 7. Flujo de tráfico controlado

1. Usuario externo entra por `frontend:8080`.
2. Nginx enruta `/api/*` a `backend` interno.
3. Backend autentica por LDAP y persiste en DB.
4. Revocación temprana de tokens en Redis.

## 8. Notas de operación segura

- No abrir puertos de `backend`, `ldap`, `db` ni `redis` en host.
- Mantener secretos fuera de VCS (directorio local `secrets/`).
- Mantener `LDAP_TLS_REJECT_UNAUTHORIZED=true`.
- Renovar certificados y secretos periódicamente.
