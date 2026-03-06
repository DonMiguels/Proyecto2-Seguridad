import logger from '../../../utils/logger.js';

export class AdminController {
  constructor({ shipmentRepository, auditRepository }) {
    this.shipmentRepository = shipmentRepository;
    this.auditRepository = auditRepository;
  }

  getMetrics = async (_req, res) => {
    try {
      const metrics = await this.shipmentRepository.getSummaryMetrics();

      return res.status(200).json({
        metricas: {
          total: metrics.total,
          registrado: metrics.registrado,
          enTransito: metrics.en_transito,
          enReparto: metrics.en_reparto,
          entregado: metrics.entregado,
          cancelado: metrics.cancelado,
        },
      });
    } catch (error) {
      logger.error('Error getting admin metrics:', error);
      return res.status(500).json({
        error: 'Internal server error',
      });
    }
  };

  getActivity = async (req, res) => {
    try {
      const limit = Number.parseInt(req.query.limit || '20', 10);
      const actividad = await this.auditRepository.listRecent(limit);

      return res.status(200).json({ actividad });
    } catch (error) {
      logger.error('Error getting admin activity:', error);
      return res.status(500).json({
        error: 'Internal server error',
      });
    }
  };
}
