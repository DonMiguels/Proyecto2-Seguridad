import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { JwksController } from '../../../src/presentation/http/controllers/jwks.controller.js';

const createTestApp = (controller) => {
  const app = express();
  app.get('/api/v1/.well-known/jwks.json', controller.getJwks);
  return app;
};

describe('JwksController integration', () => {
  it('should return JWKS payload when enabled', async () => {
    const controller = new JwksController({
      jwtKeysetService: {
        hasPublicJwks: vi.fn().mockReturnValue(true),
        getJwks: vi.fn().mockReturnValue({ keys: [{ kid: 'k1', kty: 'RSA' }] }),
      },
    });

    const app = createTestApp(controller);
    const response = await request(app).get('/api/v1/.well-known/jwks.json');

    expect(response.status).toBe(200);
    expect(response.body.keys).toHaveLength(1);
  });

  it('should return 404 when JWKS is disabled', async () => {
    const controller = new JwksController({
      jwtKeysetService: {
        hasPublicJwks: vi.fn().mockReturnValue(false),
        getJwks: vi.fn(),
      },
    });

    const app = createTestApp(controller);
    const response = await request(app).get('/api/v1/.well-known/jwks.json');

    expect(response.status).toBe(404);
  });
});
