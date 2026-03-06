import express from 'express';

export const createV1AdminRoutes = (adminController, middlewares = {}) => {
  const router = express.Router();
  const noopMiddleware = (_req, _res, next) => next();
  const auth = middlewares.auth || noopMiddleware;
  const adminRole = middlewares.adminRole || noopMiddleware;

  router.get('/admin/metrics', auth, adminRole, adminController.getMetrics);
  router.get('/admin/activity', auth, adminRole, adminController.getActivity);

  return router;
};
