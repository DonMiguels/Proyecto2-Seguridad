import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { ShipmentController } from '../../../src/presentation/http/controllers/shipment.controller.js';
import {
  InvalidShipmentStatusTransitionError,
  ShipmentNotFoundError,
} from '../../../src/domain/shipment/shipment-errors.js';

const createTestApp = (controller) => {
  const app = express();
  app.use(express.json());

  app.post('/api/v1/shipments', controller.createShipment);
  app.get('/api/v1/shipments/:codigo', controller.getShipmentByTracking);
  app.patch(
    '/api/v1/shipments/:codigo/status',
    controller.updateShipmentStatus
  );

  return app;
};

describe('ShipmentController integration', () => {
  it('should return 201 when creating shipment', async () => {
    const controller = new ShipmentController({
      createShipmentUseCase: {
        execute: vi.fn().mockResolvedValue({ codigo_tracking: 'TRK-1234' }),
      },
      getShipmentByTrackingUseCase: { execute: vi.fn() },
      updateShipmentStatusUseCase: { execute: vi.fn() },
    });

    const app = createTestApp(controller);

    const response = await request(app).post('/api/v1/shipments').send({
      remitente: 'Alice',
      destinatario: 'Bob',
      direccion_destino: 'Street 1',
      peso: 2,
    });

    expect(response.status).toBe(201);
    expect(response.body.envio.codigo_tracking).toBe('TRK-1234');
  });

  it('should return 404 when shipment is not found', async () => {
    const controller = new ShipmentController({
      createShipmentUseCase: { execute: vi.fn() },
      getShipmentByTrackingUseCase: {
        execute: vi
          .fn()
          .mockRejectedValue(new ShipmentNotFoundError('Not found')),
      },
      updateShipmentStatusUseCase: { execute: vi.fn() },
    });

    const app = createTestApp(controller);
    const response = await request(app).get('/api/v1/shipments/TRK-MISSING');

    expect(response.status).toBe(404);
  });

  it('should return 422 when status transition is invalid', async () => {
    const controller = new ShipmentController({
      createShipmentUseCase: { execute: vi.fn() },
      getShipmentByTrackingUseCase: { execute: vi.fn() },
      updateShipmentStatusUseCase: {
        execute: vi
          .fn()
          .mockRejectedValue(
            new InvalidShipmentStatusTransitionError('Invalid transition')
          ),
      },
    });

    const app = createTestApp(controller);

    const response = await request(app)
      .patch('/api/v1/shipments/TRK-1/status')
      .send({ estado: 'EN_TRANSITO' });

    expect(response.status).toBe(422);
  });
});
