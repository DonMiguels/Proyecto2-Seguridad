import {
  canTransitionShipmentStatus,
  isValidShipmentStatus,
} from './shipment-status.js';
import {
  InvalidShipmentStatusError,
  InvalidShipmentStatusTransitionError,
} from './shipment-errors.js';

export class Shipment {
  constructor(props) {
    this.id = props.id;
    this.codigoTracking = props.codigo_tracking;
    this.remitente = props.remitente;
    this.destinatario = props.destinatario;
    this.direccionDestino = props.direccion_destino;
    this.peso = props.peso;
    this.estado = props.estado;
    this.fechaCreacion = props.fecha_creacion;
    this.fechaActualizacion = props.fecha_actualizacion;
  }

  changeStatus(nextStatus) {
    if (!isValidShipmentStatus(nextStatus)) {
      throw new InvalidShipmentStatusError(
        `Invalid shipment status: ${nextStatus}`
      );
    }

    if (!canTransitionShipmentStatus(this.estado, nextStatus)) {
      throw new InvalidShipmentStatusTransitionError(
        `Invalid transition from ${this.estado} to ${nextStatus}`
      );
    }

    this.estado = nextStatus;
  }
}
