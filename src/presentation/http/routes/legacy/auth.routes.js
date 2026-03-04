import express from 'express';

export const createLegacyAuthRoutes = (authController) => {
  const router = express.Router();

  router.post('/auth/login', authController.login);
  router.post('/auth/refresh', authController.refresh);
  router.post('/auth/logout', authController.logout);

  return router;
};
