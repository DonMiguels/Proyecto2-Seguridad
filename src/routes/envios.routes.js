const express = require('express');
const router = express.Router();
const {
  crearEnvio,
  obtenerEnvioPorTracking,
  actualizarEstadoEnvio
} = require('../controllers/envio.controller');

router.post('/envios', crearEnvio);

router.get('/envios/:codigo', obtenerEnvioPorTracking);

router.put('/envios/:codigo/estado', actualizarEstadoEnvio);

module.exports = router;
