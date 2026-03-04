# Fase 3 — Refactorización y Configuración Base

## Cambios implementados

1. **Base Clean/Hexagonal**
   - Nuevas capas:
     - `src/domain/shipment/*`
     - `src/application/shipment/*`
     - `src/infrastructure/database/postgres/*`
     - `src/presentation/http/*`
     - `src/shared/container.js`

2. **Inyección de dependencias**
   - Composition Root en `createContainer()`.
   - `ShipmentController` recibe casos de uso por constructor.
   - Casos de uso reciben repositorio por constructor.

3. **Ruteo desacoplado y versionado**
   - Nuevas rutas v1: `/api/v1/shipments`.
   - Compatibilidad legacy mantenida: `/api/envios`.

4. **Calidad de código**
   - ESLint y Prettier configurados.
   - Scripts agregados: `lint`, `lint:fix`, `format`, `format:check`.

5. **Configuración base centralizada**
   - Nuevo módulo de configuración: `src/shared/config/env.js`.
   - Validación temprana de variables críticas (`DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`).
   - Parseo tipado de `PORT` y `DB_PORT`.
   - `server.js` y `src/config/database.js` consumen configuración validada (sin acceso directo disperso a `process.env`).

6. **Testing de configuración**
   - Unit tests agregados para el módulo de entorno:
     - `tests/unit/shared/env.config.spec.js`

## Estado

- `npm run lint` ✅
- `npm test` ✅
- Código preparado para evolución de Fase 4 con TDD.
