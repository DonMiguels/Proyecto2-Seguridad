import { AUDIT_QUERIES } from './queries/audit.queries.js';

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

    const result = await queryExecutor.query(AUDIT_QUERIES.CREATE, values);
    return result.rows[0];
  }

  async listRecent(limit = 20, queryExecutor = this.databasePool) {
    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));
    const result = await queryExecutor.query(AUDIT_QUERIES.LIST_RECENT, [
      safeLimit,
    ]);
    return result.rows;
  }
}
