import express from 'express';

export const createLegacyEnviosRoutes = (
  shipmentController,
  middlewares = {}
) => {
  const router = express.Router();
  const noopMiddleware = (_req, _res, next) => next();
  const idempotency = middlewares.idempotency || noopMiddleware;
  const auth = middlewares.auth || noopMiddleware;
  const createRole = middlewares.createRole || noopMiddleware;
  const updateRole = middlewares.updateRole || noopMiddleware;

  router.post(
    '/envios',
    auth,
    createRole,
    idempotency,
    shipmentController.createShipment
  );
  router.get('/envios/:codigo', shipmentController.getShipmentByTracking);
  router.put(
    '/envios/:codigo/estado',
    auth,
    updateRole,
    idempotency,
    shipmentController.updateShipmentStatus
  );

  return router;
};
