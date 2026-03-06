# Bootstrap LDAP

Los archivos LDIF en `ldap/bootstrap/ldif/` se cargan automáticamente al iniciar el contenedor `ldap`.

Incluye:

- Estructura base (`ou=People`, `ou=Groups`, `ou=ServiceAccounts`)
- Grupos de rol: `admins`, `despacho`, `mostrador`, `atencion`
- Usuarios operativos y cuenta de servicio `svc-backend`

Seguridad:

- Las contraseñas de usuarios en LDIF se almacenan hasheadas (`SSHA`), no en texto plano.
- Las credenciales de runtime (admin/config LDAP, bind backend, JWT, DB) se gestionan por archivos de secretos Docker (`secrets/*.txt`) fuera de VCS.
