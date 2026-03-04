# Fase 1 — Propuesta Arquitectónica (Aprobada)

## 1) Decisión arquitectónica

Se formaliza **Microservicios + Arquitectura Hexagonal (Ports & Adapters)**, con lineamientos de **Clean Architecture** y **DDD táctico**.

### Justificación principal

- **Aislamiento y seguridad:** separación estricta de capas `edge`, `app` y `storage`.
- **Escalabilidad independiente:** el tráfico público de tracking escala sin replicar innecesariamente el backend transaccional.
- **Evolución tecnológica segura:** el núcleo de negocio queda desacoplado de DB/framework/infraestructura.

## 2) Servicios iniciales

1. **central-api** (privado)
   - Casos de uso transaccionales: creación de envíos, actualización de estado, auditoría.
   - Integraciones: PostgreSQL, Redis, OpenLDAP.
2. **tracking-api** (público / edge)
   - Consultas de tracking de solo lectura y baja latencia.
   - Preparado para cache en CDN/Redis.

## 3) Stack definido para ejecución incremental

Estado actual del repo:
- Node.js + Express (ESM)
- PostgreSQL

Ruta aprobada:
- Mantener Node.js de forma incremental.
- Endurecer diseño con Clean/Hexagonal sobre estructura existente.
- Mantener migración progresiva a TypeScript para dominio/aplicación cuando se cierre Fase 4.
- Redis para idempotencia y cache.
- OpenLDAP (LDAPS 636) para autenticación corporativa.

## 4) Reglas de dependencia (obligatorias)

- `core/domain`: entidades, reglas e invariantes puras.
- `application`: casos de uso que orquestan dominio + puertos.
- `infrastructure`: implementaciones técnicas de puertos.
- `presentation`: HTTP/CLI y adaptación de entrada.

Regla: **las dependencias solo apuntan hacia adentro**.

## 5) Estructura objetivo (servidor central)

```text
src/
  core/
    domain/
      entities/
      exceptions/
      repositories/
    application/
      use-cases/
      dtos/
  infrastructure/
    database/postgres/
    cache/redis/
    identity/ldap/
    external/
  presentation/
    http/
      controllers/
      routes/
      middlewares/
    cli/
  shared/
    config/
    container/
    logger/
```

## 6) Patrones de diseño

- `Repository` para acceso a datos.
- `Use Case` para lógica de aplicación.
- `Dependency Injection` con composition root.
- `Strategy` para reglas variables (p. ej. ruteo/SLA).
- `Middleware Pipeline` para auth, idempotencia y trazabilidad.

## 7) Modelo de dominio inicial

Entidades/agregados iniciales:
- `Shipment`
- `TrackingEvent`
- `Route`
- `AuditLog`

Invariantes:
- transiciones de estado válidas;
- idempotencia en mutaciones críticas;
- auditoría inmutable por actor y operación.

## 8) API v1 acordada

- `POST /api/v1/shipments`
- `PATCH /api/v1/shipments/{trackingId}/status`
- `GET /api/v1/tracking/{trackingId}`

Contratos:
- `Authorization: Bearer <JWT>` para endpoints privados.
- `Idempotency-Key` obligatorio en endpoints mutables.

## 9) Seguridad y operación

- LDAP sobre LDAPS (`636`).
- JWT firmado (objetivo: `RS256`).
- segmentación de redes `edge`/`app`/`storage`.
- contenedores no root y mínimo privilegio.
- configuración por variables de entorno / secretos del orquestador.

## 10) Métrica de negocio prioritaria

$$
OTIF(\%) = \left( \frac{\text{Pedidos entregados a tiempo} \cap \text{Pedidos con contenido exacto}}{\text{Total de pedidos procesados}} \right) \times 100
$$

## 11) Criterios de aceptación Fase 1

- arquitectura objetivo documentada y aprobada;
- límites de contexto y reglas de dependencia definidos;
- estructura de carpetas objetivo establecida;
- contratos API y lineamientos de seguridad definidos.

## 12) Próximo paso

Continuar con **Fase 2 (Dockerización Máster)** reforzando:
- multi-stage builds;
- ejecución non-root;
- optimización de capas y caché;
- `.dockerignore` estricto;
- separación dev/prod con perfiles y healthchecks.
