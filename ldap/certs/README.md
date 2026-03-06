# LDAP TLS certs

Este directorio contiene el material TLS usado por OpenLDAP en modo estricto:

- `ca.crt`
- `server.crt`
- `server.key`

El backend confía en `ca.crt` a través de `NODE_EXTRA_CA_CERTS` y valida LDAP con `LDAP_TLS_REJECT_UNAUTHORIZED=true`.

## Generación local (desarrollo/lab)

Ejemplo con OpenSSL (PowerShell):

1. Crear CA privada y certificado servidor con SAN para `ldap`.
2. Conservar solo `ca.crt`, `server.crt`, `server.key`.
3. No versionar claves privadas fuera de entorno controlado.

Para producción, usar PKI corporativa y rotación periódica.
