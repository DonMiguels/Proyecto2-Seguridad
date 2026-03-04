import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createV1ShipmentRoutes } from './presentation/http/routes/v1/shipment.routes.js';
import { createV1AuthRoutes } from './presentation/http/routes/v1/auth.routes.js';
import { createV1SecurityRoutes } from './presentation/http/routes/v1/security.routes.js';
import { createLegacyAuthRoutes } from './presentation/http/routes/legacy/auth.routes.js';
import { createLegacyEnviosRoutes } from './presentation/http/routes/legacy/envios.routes.js';
import { createContainer } from './shared/container.js';
import logger from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const createApp = (containerOverride) => {
  const app = express();
  const container = containerOverride || createContainer();
  const noopMiddleware = (_req, _res, next) => next();

  const middlewares = {
    auth: container.authMiddleware || noopMiddleware,
    createRole: container.createShipmentRoleMiddleware || noopMiddleware,
    updateRole: container.updateShipmentRoleMiddleware || noopMiddleware,
    idempotency: container.idempotencyMiddleware || noopMiddleware,
  };

  app.use(express.json());
  app.use(express.static(path.join(__dirname, '../public')));

  app.use('/api/v1', createV1AuthRoutes(container.authController));
  app.use('/api/v1', createV1SecurityRoutes(container.jwksController));
  app.use(
    '/api/v1',
    createV1ShipmentRoutes(container.shipmentController, middlewares)
  );
  app.use('/api', createLegacyAuthRoutes(container.authController));
  app.use(
    '/api',
    createLegacyEnviosRoutes(container.shipmentController, middlewares)
  );

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    logger.error(err.stack);
    res.status(500).json({
      error: 'Error interno del servidor',
    });
  });

  app.use('*', (req, res) => {
    res.status(404).json({
      error: 'Ruta no encontrada',
    });
  });

  return app;
};

export default createApp;
