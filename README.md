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

## API Endpoints

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