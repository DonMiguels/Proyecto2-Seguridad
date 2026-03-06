# Autenticación LDAP (OpenLDAP / LDAPS) — Modo estricto

## 1. Resumen

La autenticación de empleados se delega exclusivamente a OpenLDAP por `ldaps://ldap:636`.

El backend:

- valida credenciales LDAP,
- deriva rol por grupos LDAP,
- recién después emite JWT de sesión.

No existe fallback de usuarios locales para login de empleados.

## 2. Topología de identidad

- Servicio `ldap` en red interna `identity_net`.
- Servicio `backend` en `identity_net`.
- Sin puertos LDAP publicados al host.

## 3. TLS y cadena de confianza

- LDAPS habilitado en OpenLDAP.
- Backend con `LDAP_TLS_REJECT_UNAUTHORIZED=true`.
- Backend confía en la CA montada en `/etc/ssl/certs/ldap-ca.crt` mediante `NODE_EXTRA_CA_CERTS`.

Archivos TLS requeridos en [ldap/certs](../ldap/certs):

- `ca.crt`
- `server.crt`
- `server.key`

## 4. DIT y autorización por grupos

Base DN:

- `dc=empresa,dc=local`

OUs:

- `ou=People`
- `ou=Groups`
- `ou=ServiceAccounts`

Mapeo de grupos a rol (por `LDAP_ROLE_MAPPING`):

- `cn=admins,...` → `ADMIN`
- `cn=despacho,...` → `DESPACHO`
- `cn=mostrador,...` → `MOSTRADOR`
- `cn=atencion,...` → `ATENCION`

## 5. Flujo de autenticación backend

Implementación: [src/infrastructure/identity/ldap/ldap-auth.repository.js](../src/infrastructure/identity/ldap/ldap-auth.repository.js)

1. Bind con cuenta técnica (`LDAP_BIND_DN` + secreto).
2. Search de usuario con filtro escapado.
3. Bind con DN del usuario y contraseña provista.
4. Lectura de `memberOf`.
5. Resolución de rol por mapping.
6. Emisión de tokens JWT (capa aplicación).

## 6. Gestión de secretos

- Secretos de runtime se leen desde `secrets/*.txt` (montados como Docker secrets).
- El backend usa cuenta técnica dedicada de bind (`cn=svc-backend,ou=ServiceAccounts,dc=empresa,dc=local`) con secreto `ldap_bind_password`.
- La cuenta `cn=admin,...` queda reservada para administración LDAP y no se usa para autenticación de aplicación.
- No se versionan secretos en VCS.
- `userPassword` en LDIF está almacenado en hash SSHA (no texto plano).

## 7. Diagnóstico operativo

Validación de estado:

- `docker compose ps ldap`
- `docker compose logs ldap`

Validación de bind/search desde contenedor LDAP:

- `ldapsearch -x -H ldaps://127.0.0.1:636 -D 'cn=admin,dc=empresa,dc=local' -y /run/secrets/ldap_admin_password -b 'dc=empresa,dc=local' '(objectClass=*)'`
