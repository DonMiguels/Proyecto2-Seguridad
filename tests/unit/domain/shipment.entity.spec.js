import { describe, expect, it } from 'vitest';
import { Shipment } from '../../../src/domain/shipment/shipment.entity.js';
import { SHIPMENT_STATUS } from '../../../src/shared/config/shipment-status.config.js';
import {
  InvalidShipmentStatusError,
  InvalidShipmentStatusTransitionError,
} from '../../../src/domain/shipment/shipment-errors.js';

const buildShipment = (estado = SHIPMENT_STATUS.REGISTERED) => {
  return new Shipment({
    id: 1,
    codigo_tracking: 'TRK-TEST-0001',
    remitente: 'Alice',
    destinatario: 'Bob',
    direccion_destino: 'Street 1',
    peso: 1.2,
    estado,
    fecha_creacion: new Date(),
    fecha_actualizacion: new Date(),
  });
};

describe('Shipment entity', () => {
  it('should allow a valid status transition', () => {
    const shipment = buildShipment(SHIPMENT_STATUS.REGISTERED);

    shipment.changeStatus(SHIPMENT_STATUS.IN_TRANSIT);

    expect(shipment.estado).toBe(SHIPMENT_STATUS.IN_TRANSIT);
  });

  it('should reject an unknown status', () => {
    const shipment = buildShipment(SHIPMENT_STATUS.REGISTERED);

    expect(() => shipment.changeStatus('UNKNOWN_STATUS')).toThrow(
      InvalidShipmentStatusError
    );
  });

  it('should reject an invalid transition', () => {
    const shipment = buildShipment(SHIPMENT_STATUS.DELIVERED);

    expect(() => shipment.changeStatus(SHIPMENT_STATUS.IN_TRANSIT)).toThrow(
      InvalidShipmentStatusTransitionError
    );
  });
});
