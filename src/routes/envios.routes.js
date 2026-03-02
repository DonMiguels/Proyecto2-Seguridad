import express from 'express';
const router = express.Router();
import {
  crearEnvio,
  obtenerEnvioPorTracking,
  actualizarEstadoEnvio,
} from '../controllers/envio.controller.js';

router.post('/envios', crearEnvio);

router.get('/envios/:codigo', obtenerEnvioPorTracking);

router.put('/envios/:codigo/estado', actualizarEstadoEnvio);

export default router;
