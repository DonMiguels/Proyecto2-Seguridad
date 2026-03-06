# Servicios CLI Operativos

## 1. Resumen

El proyecto incluye cuatro hosts CLI desplegados como contenedores interactivos:

- `host_despacho`
- `host_mostrador`
- `host_atencion`
- `host_admin`

Cada host:

- corre sobre Node.js en modo TTY (`stdin_open: true`, `tty: true`),
- se conecta a la API en `http://backend:3000/api/v1`,
- solicita autenticación al iniciar,
- valida permisos por rol antes de ejecutar operaciones.

Modo estricto aplicado:

- no existe fallback local de operaciones sin sesión,
- toda acción de negocio (consultas/mutaciones) requiere autenticación previa vía API (`/api/v1/auth/login`),
- la sesión CLI se valida por JWT + rol en backend.

Los hosts fueron endurecidos para ejecución persistente: ante errores de autenticación, el proceso no finaliza automáticamente y vuelve a solicitar credenciales.

---

## 2. Operación por `docker attach`

Adjuntar sesión a un host:

```bash
docker attach host_despacho
docker attach host_mostrador
docker attach host_atencion
docker attach host_admin
```

### Muy importante: desacople sin detener el host

Para salir de la sesión conservando el contenedor activo:

1. `Ctrl+p`
2. `Ctrl+q`

No usar `Ctrl+c` si el objetivo es mantener el proceso en ejecución.

Si se interrumpe sesión por red o credenciales inválidas, el host continúa vivo y vuelve al flujo de autenticación.

---

## 3. Modelo de ejecución interactivo

Cada host sigue este patrón:

1. `authenticateCliUser(...)` pide usuario/contraseña.
2. Se obtiene `accessToken` y `refreshToken` vía `/api/v1/auth/login`.
3. Entra a `runLoop(...)` con iteraciones infinitas (`Infinity`).
4. Muestra menú, ejecuta opción, espera Enter y vuelve a iterar.

La opción `0)` en todos los hosts muestra mensaje de espera y permite mantener la sesión viva.

---

## 4. Comandos por departamento

## 4.1 Host Despacho (`host_despacho`)

Roles permitidos: `DESPACHO`, `ADMIN`

Opciones:

- `1) Marcar en tránsito`
- `2) Marcar en reparto`
- `3) Consultar tracking`
- `0) Mantener host activo (no salir)`

Acciones mutables usan `PATCH /api/v1/shipments/:codigo/status` con `Idempotency-Key`.

## 4.2 Host Mostrador (`host_mostrador`)

Roles permitidos: `MOSTRADOR`, `ADMIN`

Opciones:

- `1) Registrar envío`
- `2) Consultar tracking`
- `0) Mantener host activo (no salir)`

Registro de envío usa `POST /api/v1/shipments` con `Idempotency-Key`.

## 4.3 Host Atención (`host_atencion`)

Roles permitidos: `ATENCION`, `ADMIN`

Opciones:

- `1) Consultar tracking`
- `2) Marcar entregado`
- `3) Cancelar envío`
- `0) Mantener host activo (no salir)`

Cambios de estado usan `PATCH /api/v1/shipments/:codigo/status` con estado objetivo `ENTREGADO` o `CANCELADO`.

## 4.4 Host Admin (`host_admin`)

Roles permitidos: `ADMIN`

Opciones:

- `1) Ver métricas globales (DB)`
- `2) Ver actividad reciente (audit)`
- `3) Buscar envío por tracking`
- `4) Forzar estado de envío`
- `0) Mantener host activo (no salir)`

Consume endpoints `/api/v1/admin/metrics`, `/api/v1/admin/activity` y endpoints de tracking/estado.

---

## 5. Seguridad aplicada en CLI

- Autenticación obligatoria por LDAP (a través de la API).
- Sin operaciones de negocio en modo offline/local para empleados.
- Autorización por rol en dos niveles:
  - backend (middleware JWT + role middleware),
  - host CLI (`ensureCliRole(...)`) para feedback inmediato.
- Token Bearer en requests.
- Header `Idempotency-Key` en operaciones mutables para evitar duplicados por reintento.
- Sin puertos publicados al host; operación interna por red `app_net`.

---

## 6. Buenas prácticas operativas

- Mantener una terminal por host para evitar confusión de contexto.
- Ante errores de red o expiración de token, volver a adjuntar y reautenticar.
- Usar `docker compose logs -f backend` para correlacionar errores de API con acciones CLI.
- Si un host queda en estado no esperado:

```bash
docker compose restart host-despacho
```

(adaptar nombre del servicio según corresponda).

---

## 7. Troubleshooting rápido

### El `attach` sale con código 1

Posibles causas:

- El contenedor no está corriendo.
- El proceso principal terminó por error no controlado (no por error de login normal).

Validación:

```bash
docker compose ps
docker compose logs host-despacho
```

### Autenticación rechazada

- Verificar credenciales LDAP.
- Verificar que el usuario pertenezca al grupo/rol requerido para ese host.

### Error de autorización en operación

- El usuario autenticado no tiene rol permitido para la opción elegida.
- Cambiar de usuario o usar `admin` para tareas administrativas.
