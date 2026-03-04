import { beforeEach, describe, expect, it } from 'vitest';
import { newDb } from 'pg-mem';
import { PostgresShipmentRepository } from '../../../src/infrastructure/database/postgres/shipment.repository.js';

describe('PostgresShipmentRepository integration', () => {
  let repository;

  beforeEach(async () => {
    const db = newDb();
    db.public.none(`
      CREATE TABLE IF NOT EXISTS envios (
        id SERIAL PRIMARY KEY,
        codigo_tracking VARCHAR(50) NOT NULL UNIQUE,
        remitente VARCHAR(150) NOT NULL,
        destinatario VARCHAR(150) NOT NULL,
        direccion_destino VARCHAR(255) NOT NULL,
        peso NUMERIC(10,2) NOT NULL CHECK (peso > 0),
        estado VARCHAR(20) NOT NULL DEFAULT 'REGISTRADO',
        fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const { Pool } = db.adapters.createPg();
    const pool = new Pool();
    repository = new PostgresShipmentRepository(pool);
  });

  it('should create and find a shipment by tracking code', async () => {
    const created = await repository.create({
      codigo_tracking: 'TRK-INT-0001',
      remitente: 'Alice',
      destinatario: 'Bob',
      direccion_destino: 'Street 1',
      peso: 1.5,
    });

    const found = await repository.findByTrackingCode(created.codigo_tracking);

    expect(found).not.toBeNull();
    expect(found.codigo_tracking).toBe('TRK-INT-0001');
    expect(found.estado).toBe('REGISTRADO');
  });

  it('should update shipment status', async () => {
    await repository.create({
      codigo_tracking: 'TRK-INT-0002',
      remitente: 'Alice',
      destinatario: 'Bob',
      direccion_destino: 'Street 1',
      peso: 1.5,
    });

    const updated = await repository.updateStatusByTrackingCode({
      trackingCode: 'TRK-INT-0002',
      status: 'EN_TRANSITO',
    });

    expect(updated).not.toBeNull();
    expect(updated.estado).toBe('EN_TRANSITO');
  });
});
