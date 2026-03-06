const QUERIES = {
  CREATE: `
    INSERT INTO audit_logs (usuario_id, accion, entidad_tipo, entidad_id, metadata)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `,
  LIST_RECENT: `
    SELECT *
    FROM audit_logs
    ORDER BY fecha_creacion DESC
    LIMIT $1
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

  async listRecent(limit = 20, queryExecutor = this.databasePool) {
    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));
    const result = await queryExecutor.query(QUERIES.LIST_RECENT, [safeLimit]);
    return result.rows;
  }
}
