import {
  DomainError,
  InvalidShipmentPayloadError,
  InvalidShipmentStatusError,
  InvalidShipmentStatusTransitionError,
  ShipmentNotFoundError,
} from '../../../domain/shipment/shipment-errors.js';
import logger from '../../../utils/logger.js';

const mapErrorToHttpResponse = (error) => {
  if (error instanceof ShipmentNotFoundError) {
    return { statusCode: 404, payload: { error: error.message } };
  }

  if (
    error instanceof InvalidShipmentPayloadError ||
    error instanceof InvalidShipmentStatusError
  ) {
    return { statusCode: 400, payload: { error: error.message } };
  }

  if (error instanceof InvalidShipmentStatusTransitionError) {
    return { statusCode: 422, payload: { error: error.message } };
  }

  if (error instanceof DomainError) {
    return { statusCode: 400, payload: { error: error.message } };
  }

  return {
    statusCode: 500,
    payload: { error: 'Internal server error' },
  };
};

export class ShipmentController {
  constructor({
    createShipmentUseCase,
    getShipmentByTrackingUseCase,
    updateShipmentStatusUseCase,
  }) {
    this.createShipmentUseCase = createShipmentUseCase;
    this.getShipmentByTrackingUseCase = getShipmentByTrackingUseCase;
    this.updateShipmentStatusUseCase = updateShipmentStatusUseCase;
  }

  createShipment = async (req, res) => {
    try {
      const shipment = await this.createShipmentUseCase.execute(req.body);
      return res.status(201).json({
        mensaje: 'Envío creado exitosamente',
        envio: shipment,
      });
    } catch (error) {
      logger.error('Error creating shipment:', error);
      const mappedError = mapErrorToHttpResponse(error);
      return res.status(mappedError.statusCode).json(mappedError.payload);
    }
  };

  getShipmentByTracking = async (req, res) => {
    try {
      const shipment = await this.getShipmentByTrackingUseCase.execute(
        req.params.codigo
      );

      return res.status(200).json({
        mensaje: 'Envío encontrado',
        envio: shipment,
      });
    } catch (error) {
      logger.error('Error getting shipment by tracking:', error);
      const mappedError = mapErrorToHttpResponse(error);
      return res.status(mappedError.statusCode).json(mappedError.payload);
    }
  };

  updateShipmentStatus = async (req, res) => {
    try {
      const shipment = await this.updateShipmentStatusUseCase.execute({
        trackingCode: req.params.codigo,
        status: req.body.estado,
        userId: req.user?.id || 'system',
      });

      return res.status(200).json({
        mensaje: 'Estado del envío actualizado exitosamente',
        envio: shipment,
      });
    } catch (error) {
      logger.error('Error updating shipment status:', error);
      const mappedError = mapErrorToHttpResponse(error);
      return res.status(mappedError.statusCode).json(mappedError.payload);
    }
  };
}
