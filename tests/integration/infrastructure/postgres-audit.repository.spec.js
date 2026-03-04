import { beforeEach, describe, expect, it } from 'vitest';
import { newDb } from 'pg-mem';
import { PostgresAuditRepository } from '../../../src/infrastructure/database/postgres/audit.repository.js';

describe('PostgresAuditRepository integration', () => {
  let repository;

  beforeEach(async () => {
    const db = newDb();
    db.public.none(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        usuario_id VARCHAR(100) NOT NULL,
        accion VARCHAR(100) NOT NULL,
        entidad_tipo VARCHAR(50) NOT NULL,
        entidad_id VARCHAR(100) NOT NULL,
        metadata JSONB,
        fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const { Pool } = db.adapters.createPg();
    const pool = new Pool();
    repository = new PostgresAuditRepository(pool);
  });

  it('should persist audit event', async () => {
    const auditEvent = await repository.logAction({
      userId: 'user-123',
      action: 'UPDATE_SHIPMENT_STATUS',
      entityType: 'SHIPMENT',
      entityId: 'TRK-0001',
      metadata: {
        status: 'EN_TRANSITO',
      },
    });

    expect(auditEvent).toBeDefined();
    expect(auditEvent.usuario_id).toBe('user-123');
    expect(auditEvent.accion).toBe('UPDATE_SHIPMENT_STATUS');
    expect(auditEvent.entidad_tipo).toBe('SHIPMENT');
    expect(auditEvent.entidad_id).toBe('TRK-0001');
  });
});
