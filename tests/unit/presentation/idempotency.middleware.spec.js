import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { InMemoryIdempotencyKeyStore } from '../../../src/infrastructure/cache/in-memory/idempotency-key.store.js';
import { createIdempotencyMiddleware } from '../../../src/presentation/http/middlewares/idempotency.middleware.js';

const buildTestApp = () => {
  const app = express();
  const store = new InMemoryIdempotencyKeyStore();
  const idempotencyMiddleware = createIdempotencyMiddleware(store, {
    ttlSeconds: 30,
  });

  app.use(express.json());
  app.post('/shipments', idempotencyMiddleware, (_req, res) => {
    return res.status(201).json({ ok: true });
  });
  app.patch('/shipments/TRK-123/status', idempotencyMiddleware, (_req, res) => {
    return res.status(200).json({ ok: true });
  });

  return app;
};

describe('Idempotency middleware', () => {
  it('should return 400 when idempotency header is missing', async () => {
    const app = buildTestApp();

    const response = await request(app).post('/shipments').send({});

    expect(response.status).toBe(400);
  });

  it('should return 409 for duplicate POST request', async () => {
    const app = buildTestApp();

    const firstResponse = await request(app)
      .post('/shipments')
      .set('Idempotency-Key', 'same-key')
      .send({});

    const secondResponse = await request(app)
      .post('/shipments')
      .set('Idempotency-Key', 'same-key')
      .send({});

    expect(firstResponse.status).toBe(201);
    expect(secondResponse.status).toBe(409);
  });

  it('should return 200 for duplicate PATCH request', async () => {
    const app = buildTestApp();

    const firstResponse = await request(app)
      .patch('/shipments/TRK-123/status')
      .set('Idempotency-Key', 'same-key')
      .send({ estado: 'EN_TRANSITO' });

    const secondResponse = await request(app)
      .patch('/shipments/TRK-123/status')
      .set('Idempotency-Key', 'same-key')
      .send({ estado: 'EN_TRANSITO' });

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(secondResponse.body.mensaje).toBe('Solicitud duplicada ignorada');
  });
});
