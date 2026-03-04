import { describe, expect, it, vi } from 'vitest';
import { UpdateShipmentStatusUseCase } from '../../../src/application/shipment/update-shipment-status.use-case.js';
import {
  InvalidShipmentPayloadError,
  ShipmentNotFoundError,
} from '../../../src/domain/shipment/shipment-errors.js';

describe('UpdateShipmentStatusUseCase', () => {
  it('should throw when status is missing', async () => {
    const repository = {
      findByTrackingCode: vi.fn(),
      updateStatusByTrackingCode: vi.fn(),
      withTransaction: vi.fn((handler) => handler({ query: vi.fn() })),
    };
    const auditRepository = {
      logAction: vi.fn(),
    };
    const useCase = new UpdateShipmentStatusUseCase(
      repository,
      auditRepository
    );

    await expect(
      useCase.execute({ trackingCode: 'TRK-1', status: '' })
    ).rejects.toThrow(InvalidShipmentPayloadError);
  });

  it('should throw when shipment does not exist', async () => {
    const repository = {
      findByTrackingCode: vi.fn().mockResolvedValue(null),
      updateStatusByTrackingCode: vi.fn(),
      withTransaction: vi.fn((handler) => handler({ query: vi.fn() })),
    };
    const auditRepository = {
      logAction: vi.fn(),
    };
    const useCase = new UpdateShipmentStatusUseCase(
      repository,
      auditRepository
    );

    await expect(
      useCase.execute({ trackingCode: 'TRK-1', status: 'EN_TRANSITO' })
    ).rejects.toThrow(ShipmentNotFoundError);
  });

  it('should update status when transition is valid', async () => {
    const queryExecutor = { query: vi.fn() };
    const repository = {
      findByTrackingCode: vi.fn().mockResolvedValue({
        id: 1,
        codigo_tracking: 'TRK-1',
        remitente: 'Alice',
        destinatario: 'Bob',
        direccion_destino: 'Street 1',
        peso: 1,
        estado: 'REGISTRADO',
        fecha_creacion: new Date(),
        fecha_actualizacion: new Date(),
      }),
      updateStatusByTrackingCode: vi.fn().mockResolvedValue({
        codigo_tracking: 'TRK-1',
        estado: 'EN_TRANSITO',
      }),
      withTransaction: vi.fn((handler) => handler(queryExecutor)),
    };
    const auditRepository = {
      logAction: vi.fn().mockResolvedValue({ id: 1 }),
    };

    const useCase = new UpdateShipmentStatusUseCase(
      repository,
      auditRepository
    );
    const result = await useCase.execute({
      trackingCode: 'TRK-1',
      status: 'EN_TRANSITO',
      userId: 'user-123',
    });

    expect(repository.updateStatusByTrackingCode).toHaveBeenCalledWith(
      {
        trackingCode: 'TRK-1',
        status: 'EN_TRANSITO',
      },
      queryExecutor
    );
    expect(auditRepository.logAction).toHaveBeenCalledWith(
      {
        userId: 'user-123',
        action: 'UPDATE_SHIPMENT_STATUS',
        entityType: 'SHIPMENT',
        entityId: 'TRK-1',
        metadata: {
          status: 'EN_TRANSITO',
        },
      },
      queryExecutor
    );
    expect(result.estado).toBe('EN_TRANSITO');
  });
});
