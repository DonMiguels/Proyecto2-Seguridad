const { v4: uuidv4 } = require('uuid');
const pool = require('../config/database');
const ENVIO_QUERIES = require('../queries/envios.queries');

const crearEnvio = async (req, res) => {
  try {
    const { remitente, destinatario, direccion_destino, peso } = req.body;

    if (!remitente || !destinatario || !direccion_destino || !peso) {
      return res.status(400).json({
        error: 'Todos los campos son obligatorios: remitente, destinatario, direccion_destino, peso'
      });
    }

    const codigo_tracking = `TRK-${uuidv4().substring(0, 8).toUpperCase()}`;

    const query = ENVIO_QUERIES.CREAR_ENVIO;
    const values = [codigo_tracking, remitente, destinatario, direccion_destino, parseFloat(peso)];
    
    const result = await pool.query(query, values);
    const nuevoEnvio = result.rows[0];

    res.status(201).json({
      mensaje: 'Envío creado exitosamente',
      envio: nuevoEnvio
    });
  } catch (error) {
    console.error('Error al crear envío:', error);
    res.status(500).json({
      error: 'Error interno del servidor al crear el envío'
    });
  }
};

const obtenerEnvioPorTracking = async (req, res) => {
  try {
    const { codigo } = req.params;

    const query = ENVIO_QUERIES.OBTENER_POR_TRACKING;
    const result = await pool.query(query, [codigo]);
    const envio = result.rows[0];

    if (!envio) {
      return res.status(404).json({
        error: 'Envío no encontrado con el código de tracking proporcionado'
      });
    }

    res.json({
      mensaje: 'Envío encontrado',
      envio
    });
  } catch (error) {
    console.error('Error al obtener envío:', error);
    res.status(500).json({
      error: 'Error interno del servidor al obtener el envío'
    });
  }
};

const actualizarEstadoEnvio = async (req, res) => {
  try {
    const { codigo } = req.params;
    const { estado } = req.body;

    if (!estado) {
      return res.status(400).json({
        error: 'El campo estado es obligatorio'
      });
    }

    const estadosValidos = ['REGISTRADO', 'EN_TRANSITO', 'EN_REPARTO', 'ENTREGADO', 'CANCELADO'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({
        error: 'Estado no válido. Estados permitidos: ' + estadosValidos.join(', ')
      });
    }

    const query = ENVIO_QUERIES.ACTUALIZAR_ESTADO;
    const values = [estado, codigo];
    
    const result = await pool.query(query, values);
    const envio = result.rows[0];

    if (!envio) {
      return res.status(404).json({
        error: 'Envío no encontrado con el código de tracking proporcionado'
      });
    }

    res.json({
      mensaje: 'Estado del envío actualizado exitosamente',
      envio
    });
  } catch (error) {
    console.error('Error al actualizar estado del envío:', error);
    res.status(500).json({
      error: 'Error interno del servidor al actualizar el estado del envío'
    });
  }
};

module.exports = {
  crearEnvio,
  obtenerEnvioPorTracking,
  actualizarEstadoEnvio
};
