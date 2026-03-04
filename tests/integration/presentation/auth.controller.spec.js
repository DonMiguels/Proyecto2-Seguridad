import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { AuthController } from '../../../src/presentation/http/controllers/auth.controller.js';
import {
  IdentityProviderError,
  InvalidCredentialsError,
} from '../../../src/domain/auth/auth-errors.js';

const buildTestApp = (controller) => {
  const app = express();
  app.use(express.json());
  app.post('/api/v1/auth/login', controller.login);
  app.post('/api/v1/auth/refresh', controller.refresh);
  app.post('/api/v1/auth/logout', controller.logout);
  return app;
};

describe('AuthController integration', () => {
  it('should return 200 with access token on successful login', async () => {
    const controller = new AuthController({
      authenticateUserUseCase: {
        execute: vi.fn().mockResolvedValue({
          accessToken: 'jwt-token',
          refreshToken: 'refresh-token',
          tokenType: 'Bearer',
          user: { id: 'u1', username: 'john', role: 'MOSTRADOR' },
        }),
      },
      refreshSessionUseCase: { execute: vi.fn() },
      logoutSessionUseCase: { execute: vi.fn() },
    });

    const app = buildTestApp(controller);
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'john', password: 'secret' });

    expect(response.status).toBe(200);
    expect(response.body.accessToken).toBe('jwt-token');
    expect(response.body.refreshToken).toBe('refresh-token');
  });

  it('should return 401 when credentials are invalid', async () => {
    const controller = new AuthController({
      authenticateUserUseCase: {
        execute: vi
          .fn()
          .mockRejectedValue(new InvalidCredentialsError('invalid creds')),
      },
      refreshSessionUseCase: { execute: vi.fn() },
      logoutSessionUseCase: { execute: vi.fn() },
    });

    const app = buildTestApp(controller);
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'john', password: 'bad' });

    expect(response.status).toBe(401);
  });

  it('should return 503 when identity provider is unavailable', async () => {
    const controller = new AuthController({
      authenticateUserUseCase: {
        execute: vi
          .fn()
          .mockRejectedValue(new IdentityProviderError('unavailable')),
      },
      refreshSessionUseCase: { execute: vi.fn() },
      logoutSessionUseCase: { execute: vi.fn() },
    });

    const app = buildTestApp(controller);
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'john', password: 'secret' });

    expect(response.status).toBe(503);
  });

  it('should return 200 when refreshing session', async () => {
    const controller = new AuthController({
      authenticateUserUseCase: { execute: vi.fn() },
      refreshSessionUseCase: {
        execute: vi.fn().mockResolvedValue({
          accessToken: 'new-access',
          refreshToken: 'new-refresh',
          tokenType: 'Bearer',
          user: { id: 'u1', username: 'john', role: 'MOSTRADOR' },
        }),
      },
      logoutSessionUseCase: { execute: vi.fn() },
    });

    const app = buildTestApp(controller);
    const response = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'refresh-token' });

    expect(response.status).toBe(200);
    expect(response.body.accessToken).toBe('new-access');
  });

  it('should return 200 when logging out session', async () => {
    const controller = new AuthController({
      authenticateUserUseCase: { execute: vi.fn() },
      refreshSessionUseCase: { execute: vi.fn() },
      logoutSessionUseCase: {
        execute: vi.fn().mockResolvedValue({
          message: 'Session closed successfully',
        }),
      },
    });

    const app = buildTestApp(controller);
    const response = await request(app)
      .post('/api/v1/auth/logout')
      .send({ refreshToken: 'refresh-token' });

    expect(response.status).toBe(200);
  });
});
