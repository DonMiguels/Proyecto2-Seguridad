import { ShipmentNotFoundError } from '../../domain/shipment/shipment-errors.js';

export class GetShipmentByTrackingUseCase {
  constructor(shipmentRepository) {
    this.shipmentRepository = shipmentRepository;
  }

  async execute(trackingCode) {
    const shipment =
      await this.shipmentRepository.findByTrackingCode(trackingCode);

    if (!shipment) {
      throw new ShipmentNotFoundError('Shipment not found');
    }

    return shipment;
  }
}
