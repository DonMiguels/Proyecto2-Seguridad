const QUERIES = {
  CREATE: `
    INSERT INTO envios (codigo_tracking, remitente, destinatario, direccion_destino, peso)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `,
  FIND_BY_TRACKING_CODE: `
    SELECT * FROM envios WHERE codigo_tracking = $1
  `,
  UPDATE_STATUS_BY_TRACKING_CODE: `
    UPDATE envios
    SET estado = $1, fecha_actualizacion = CURRENT_TIMESTAMP
    WHERE codigo_tracking = $2
    RETURNING *
  `,
  SUMMARY_METRICS: `
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE estado = 'REGISTRADO')::int AS registrado,
      COUNT(*) FILTER (WHERE estado = 'EN_TRANSITO')::int AS en_transito,
      COUNT(*) FILTER (WHERE estado = 'EN_REPARTO')::int AS en_reparto,
      COUNT(*) FILTER (WHERE estado = 'ENTREGADO')::int AS entregado,
      COUNT(*) FILTER (WHERE estado = 'CANCELADO')::int AS cancelado
    FROM envios
  `,
};

export class PostgresShipmentRepository {
  constructor(databasePool) {
    this.databasePool = databasePool;
  }

  async withTransaction(callback) {
    const client = await this.databasePool.connect();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async create(data, queryExecutor = this.databasePool) {
    const values = [
      data.codigo_tracking,
      data.remitente,
      data.destinatario,
      data.direccion_destino,
      data.peso,
    ];

    const result = await queryExecutor.query(QUERIES.CREATE, values);
    return result.rows[0];
  }

  async findByTrackingCode(trackingCode, queryExecutor = this.databasePool) {
    const result = await queryExecutor.query(QUERIES.FIND_BY_TRACKING_CODE, [
      trackingCode,
    ]);
    return result.rows[0] || null;
  }

  async updateStatusByTrackingCode(data, queryExecutor = this.databasePool) {
    const values = [data.status, data.trackingCode];
    const result = await queryExecutor.query(
      QUERIES.UPDATE_STATUS_BY_TRACKING_CODE,
      values
    );
    return result.rows[0] || null;
  }

  async getSummaryMetrics(queryExecutor = this.databasePool) {
    const result = await queryExecutor.query(QUERIES.SUMMARY_METRICS);
    return result.rows[0] || {
      total: 0,
      registrado: 0,
      en_transito: 0,
      en_reparto: 0,
      entregado: 0,
      cancelado: 0,
    };
  }
}
