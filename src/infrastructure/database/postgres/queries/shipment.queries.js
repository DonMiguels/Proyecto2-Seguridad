import { SHIPMENT_STATUS_SUMMARY_METRICS } from '../../../../shared/config/shipment-status.config.js';

const SUMMARY_METRICS_SELECT = SHIPMENT_STATUS_SUMMARY_METRICS.map(
  ({ status, alias }) => {
    return `COUNT(*) FILTER (WHERE estado = '${status}')::int AS ${alias}`;
  }
).join(',\n      ');

export const SHIPMENT_QUERIES = {
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
      ${SUMMARY_METRICS_SELECT}
    FROM envios
  `,
};
