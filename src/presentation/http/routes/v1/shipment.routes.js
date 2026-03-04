import express from 'express';

export const createV1ShipmentRoutes = (
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
    '/shipments',
    auth,
    createRole,
    idempotency,
    shipmentController.createShipment
  );
  router.get('/shipments/:codigo', shipmentController.getShipmentByTracking);
  router.patch(
    '/shipments/:codigo/status',
    auth,
    updateRole,
    idempotency,
    shipmentController.updateShipmentStatus
  );

  return router;
};
