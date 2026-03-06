import { SHIPMENT_STATUS_SUMMARY_METRICS } from '../../../shared/config/shipment-status.config.js';
import { SHIPMENT_QUERIES } from './queries/shipment.queries.js';

const SUMMARY_METRICS_DEFAULT = SHIPMENT_STATUS_SUMMARY_METRICS.reduce(
  (accumulator, { alias }) => {
    return {
      ...accumulator,
      [alias]: 0,
    };
  },
  {
    total: 0,
  }
);

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

    const result = await queryExecutor.query(SHIPMENT_QUERIES.CREATE, values);
    return result.rows[0];
  }

  async findByTrackingCode(trackingCode, queryExecutor = this.databasePool) {
    const result = await queryExecutor.query(
      SHIPMENT_QUERIES.FIND_BY_TRACKING_CODE,
      [trackingCode]
    );
    return result.rows[0] || null;
  }

  async updateStatusByTrackingCode(data, queryExecutor = this.databasePool) {
    const values = [data.status, data.trackingCode];
    const result = await queryExecutor.query(
      SHIPMENT_QUERIES.UPDATE_STATUS_BY_TRACKING_CODE,
      values
    );
    return result.rows[0] || null;
  }

  async getSummaryMetrics(queryExecutor = this.databasePool) {
    const result = await queryExecutor.query(SHIPMENT_QUERIES.SUMMARY_METRICS);
    return result.rows[0] || SUMMARY_METRICS_DEFAULT;
  }
}
