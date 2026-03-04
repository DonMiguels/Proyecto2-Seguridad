import express from 'express';

export const createV1SecurityRoutes = (jwksController) => {
  const router = express.Router();

  router.get('/.well-known/jwks.json', jwksController.getJwks);

  return router;
};
