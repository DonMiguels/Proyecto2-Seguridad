export const AUDIT_QUERIES = {
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
