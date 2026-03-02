import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import enviosRoutes from './routes/envios.routes.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.use('/api', enviosRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Error interno del servidor',
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
  });
});

export default app;
