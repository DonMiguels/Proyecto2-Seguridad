import { v4 as uuidv4 } from 'uuid';
import { InvalidShipmentPayloadError } from '../../domain/shipment/shipment-errors.js';

const buildTrackingCode = () => {
  return `TRK-${uuidv4()
    .substring(0, 18)
    .split('-')
    .join('')
    .toUpperCase()
    .match(/.{1,4}/g)
    .join('-')}`;
};

export class CreateShipmentUseCase {
  constructor(shipmentRepository) {
    this.shipmentRepository = shipmentRepository;
  }

  async execute(input) {
    const { remitente, destinatario, direccion_destino, peso } = input;

    if (!remitente || !destinatario || !direccion_destino || !peso) {
      throw new InvalidShipmentPayloadError(
        'All fields are required: remitente, destinatario, direccion_destino, peso'
      );
    }

    const normalizedWeight = Number.parseFloat(peso);
    if (Number.isNaN(normalizedWeight) || normalizedWeight <= 0) {
      throw new InvalidShipmentPayloadError('peso must be a positive number');
    }

    return this.shipmentRepository.create({
      codigo_tracking: buildTrackingCode(),
      remitente,
      destinatario,
      direccion_destino,
      peso: normalizedWeight,
    });
  }
}
