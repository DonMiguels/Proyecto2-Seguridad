const QUERIES = {
  CREATE: `
    INSERT INTO audit_logs (usuario_id, accion, entidad_tipo, entidad_id, metadata)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `,
};

export class PostgresAuditRepository {
  constructor(databasePool) {
    this.databasePool = databasePool;
  }

  async logAction(data, queryExecutor = this.databasePool) {
    const values = [
      data.userId,
      data.action,
      data.entityType,
      data.entityId,
      data.metadata ? JSON.stringify(data.metadata) : null,
    ];

    const result = await queryExecutor.query(QUERIES.CREATE, values);
    return result.rows[0];
  }
}
