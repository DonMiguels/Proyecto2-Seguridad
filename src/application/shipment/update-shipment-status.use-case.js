import { Shipment } from '../../domain/shipment/shipment.entity.js';
import {
  InvalidShipmentPayloadError,
  ShipmentNotFoundError,
} from '../../domain/shipment/shipment-errors.js';

export class UpdateShipmentStatusUseCase {
  constructor(shipmentRepository, auditRepository) {
    this.shipmentRepository = shipmentRepository;
    this.auditRepository = auditRepository;
  }

  async execute(input) {
    const { trackingCode, status, userId = 'system' } = input;

    if (!status) {
      throw new InvalidShipmentPayloadError('status is required');
    }

    return this.shipmentRepository.withTransaction(async (queryExecutor) => {
      const shipmentData = await this.shipmentRepository.findByTrackingCode(
        trackingCode,
        queryExecutor
      );

      if (!shipmentData) {
        throw new ShipmentNotFoundError('Shipment not found');
      }

      const shipment = new Shipment(shipmentData);
      shipment.changeStatus(status);

      const updatedShipment =
        await this.shipmentRepository.updateStatusByTrackingCode(
          {
            trackingCode,
            status: shipment.estado,
          },
          queryExecutor
        );

      await this.auditRepository.logAction(
        {
          userId,
          action: 'UPDATE_SHIPMENT_STATUS',
          entityType: 'SHIPMENT',
          entityId: trackingCode,
          metadata: {
            status: shipment.estado,
          },
        },
        queryExecutor
      );

      return updatedShipment;
    });
  }
}
