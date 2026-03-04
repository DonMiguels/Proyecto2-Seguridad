export class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ShipmentNotFoundError extends DomainError {}

export class InvalidShipmentPayloadError extends DomainError {}

export class InvalidShipmentStatusError extends DomainError {}

export class InvalidShipmentStatusTransitionError extends DomainError {}
