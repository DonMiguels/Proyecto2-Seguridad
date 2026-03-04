import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { createJwtAuthMiddleware } from '../../../src/presentation/http/middlewares/auth.middleware.js';
import { createRoleMiddleware } from '../../../src/presentation/http/middlewares/role.middleware.js';

const JWT_CONFIG = {
  secret: 'test-secret',
  issuer: 'test-issuer',
  audience: 'test-audience',
};

const buildToken = (payload = {}) => {
  return jwt.sign(
    {
      tokenType: payload.tokenType || 'access',
      role: payload.role,
      username: payload.username || 'user',
    },
    JWT_CONFIG.secret,
    {
      expiresIn: '1h',
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience,
      subject: payload.sub || 'user-1',
    }
  );
};

const buildApp = () => {
  const app = express();
  const auth = createJwtAuthMiddleware({
    key: JWT_CONFIG.secret,
    algorithms: ['HS256'],
    issuer: JWT_CONFIG.issuer,
    audience: JWT_CONFIG.audience,
  });
  const onlyAdmin = createRoleMiddleware(['ADMIN']);

  app.get('/protected', auth, (_req, res) => {
    return res.status(200).json({ ok: true });
  });

  app.get('/admin', auth, onlyAdmin, (_req, res) => {
    return res.status(200).json({ ok: true });
  });

  return app;
};

describe('Auth middlewares', () => {
  it('should return 401 when Authorization header is missing', async () => {
    const app = buildApp();

    const response = await request(app).get('/protected');

    expect(response.status).toBe(401);
  });

  it('should return 200 with a valid token', async () => {
    const app = buildApp();
    const token = buildToken({ role: 'MOSTRADOR' });

    const response = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
  });

  it('should return 403 when role is not allowed', async () => {
    const app = buildApp();
    const token = buildToken({ role: 'DESPACHO' });

    const response = await request(app)
      .get('/admin')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
  });

  it('should return 401 when using refresh token on protected endpoint', async () => {
    const app = buildApp();
    const token = buildToken({ role: 'MOSTRADOR', tokenType: 'refresh' });

    const response = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
  });
});
