import createApp from './src/app.js';
import pool from './src/config/database.js';
import { getEnvironmentConfig } from './src/shared/config/env.js';
import logger from './src/utils/logger.js';

const env = getEnvironmentConfig();
const PORT = env.port;

const startServer = async () => {
  try {
    await pool.connect();
    logger.info('Conexión a la base de datos establecida exitosamente.');

    const app = createApp();

    app.listen(PORT, () => {
      logger.info(`Servidor corriendo en el puerto ${PORT}`);
      logger.info(`API disponible en http://localhost:${PORT}/api`);
    });
  } catch (error) {
    logger.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

startServer();
