import { describe, expect, it } from 'vitest';
import { Shipment } from '../../../src/domain/shipment/shipment.entity.js';
import {
  InvalidShipmentStatusError,
  InvalidShipmentStatusTransitionError,
} from '../../../src/domain/shipment/shipment-errors.js';

const buildShipment = (estado = 'REGISTRADO') => {
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
    const shipment = buildShipment('REGISTRADO');

    shipment.changeStatus('EN_TRANSITO');

    expect(shipment.estado).toBe('EN_TRANSITO');
  });

  it('should reject an unknown status', () => {
    const shipment = buildShipment('REGISTRADO');

    expect(() => shipment.changeStatus('UNKNOWN_STATUS')).toThrow(
      InvalidShipmentStatusError
    );
  });

  it('should reject an invalid transition', () => {
    const shipment = buildShipment('ENTREGADO');

    expect(() => shipment.changeStatus('EN_TRANSITO')).toThrow(
      InvalidShipmentStatusTransitionError
    );
  });
});
