const ENVIO_QUERIES = {
  // CREATE
  CREAR_ENVIO: `
    INSERT INTO envios (codigo_tracking, remitente, destinatario, direccion_destino, peso)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `,
  
  // READ
  OBTENER_POR_TRACKING: `
    SELECT * FROM envios WHERE codigo_tracking = $1
  `,
  
  // UPDATE
  ACTUALIZAR_ESTADO: `
    UPDATE envios 
    SET estado = $1, fecha_actualizacion = CURRENT_TIMESTAMP 
    WHERE codigo_tracking = $2 
    RETURNING *
  `,
};

module.exports = ENVIO_QUERIES;
