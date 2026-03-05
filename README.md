# Red de Deliveries - Backend

Backend para el sistema de gestión de deliveries construido con Node.js, Express y PostgreSQL.

## Tecnologías

- Node.js
- Express.js
- PostgreSQL
- Sequelize ORM
- dotenv

## Estructura del Proyecto

```
src/
├── config/
│   └── database.js       # Configuración de Sequelize
├── controllers/
│   └── envio.controller.js # Controladores de envíos
├── models/
│   └── envio.model.js    # Modelo Sequelize de Envio
├── routes/
│   └── envios.routes.js  # Rutas Express
├── services/             # (Para futuros servicios)
└── app.js               # Configuración de Express
server.js                # Punto de entrada del servidor
```

## Instalación

1. Copiar el archivo de variables de entorno:

```bash
cp .env.example .env
```

2. Configurar las variables de entorno en el archivo `.env`:

```
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=red_deliveries
DB_USER=postgres
DB_PASSWORD=tu_contraseña
```

3. Instalar dependencias:

```bash
npm install
```

4. Iniciar el servidor:

```bash
npm start
```

Para desarrollo con auto-reinicio:

```bash
npm run dev
```

## Testing de Simulación CLI

Framework elegido: **Vitest** (alineado al stack Node.js existente), usando mocks de I/O para simular `stdin/stdout` sin bloquear la ejecución.

### Ejecutar pruebas localmente

```bash
npm install
npm run test:simulation
```

### Ejecutar pruebas en Docker (perfil testing)

```bash
docker-compose --profile testing run --rm simulation-tests
```

La suite incluye:

- Unit tests para `Despacho`, `Mostrador`, `Atención` y `Admin`.
- Integration tests para validar flujo de datos entre hosts y visibilidad en `Admin`.

## API Endpoints

## Simulación de Hosts por CLI (Docker Attach)

Se agregó un perfil de simulación con 4 hosts CLI interactivos:

- `host_despacho`
- `host_mostrador`
- `host_atencion`
- `host_admin`

### Levantar entorno de simulación

```bash
docker compose --profile simulation up -d --build
```

### Adjuntarse a un host

```bash
docker attach host_despacho
docker attach host_mostrador
docker attach host_atencion
docker attach host_admin
```

### Salir sin detener el contenedor

Use la secuencia de teclas:

`Ctrl+p`, luego `Ctrl+q`.

El host `admin` consume métricas simuladas compartidas por volumen desde los otros 3 hosts.

### Envíos

- `POST /api/envios` - Crear un nuevo envío

  ```json
  {
    "remitente": "Juan Pérez",
    "destinatario": "María García",
    "direccion_destino": "Calle Principal #123",
    "peso": 2.5
  }
  ```

- `GET /api/envios/:codigo` - Obtener envío por código de tracking

  ```
  GET /api/envios/TRK-ABC12345
  ```

- `PUT /api/envios/:codigo/estado` - Actualizar estado de envío
  ```json
  {
    "estado": "EN_TRANSITO"
  }
  ```

## Estados de Envío

- `REGISTRADO` - Envío registrado en el sistema
- `EN_TRANSITO` - Envío en tránsito
- `EN_REPARTO` - Envío en reparto
- `ENTREGADO` - Envío entregado
- `CANCELADO` - Envío cancelado

## Base de Datos

El modelo `Envio` contiene los siguientes campos:

- `id` (UUID, primary key)
- `codigo_tracking` (string, único)
- `remitente` (string)
- `destinatario` (string)
- `direccion_destino` (string)
- `peso` (float)
- `estado` (enum)
- `fecha_creacion` (date)
- `fecha_actualizacion` (date)
