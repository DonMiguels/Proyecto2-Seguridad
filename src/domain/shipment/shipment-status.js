export const SHIPMENT_STATUS = Object.freeze({
  REGISTERED: 'REGISTRADO',
  IN_TRANSIT: 'EN_TRANSITO',
  OUT_FOR_DELIVERY: 'EN_REPARTO',
  DELIVERED: 'ENTREGADO',
  CANCELED: 'CANCELADO',
});

const ALLOWED_TRANSITIONS = Object.freeze({
  [SHIPMENT_STATUS.REGISTERED]: [
    SHIPMENT_STATUS.IN_TRANSIT,
    SHIPMENT_STATUS.CANCELED,
  ],
  [SHIPMENT_STATUS.IN_TRANSIT]: [
    SHIPMENT_STATUS.OUT_FOR_DELIVERY,
    SHIPMENT_STATUS.CANCELED,
  ],
  [SHIPMENT_STATUS.OUT_FOR_DELIVERY]: [
    SHIPMENT_STATUS.DELIVERED,
    SHIPMENT_STATUS.CANCELED,
  ],
  [SHIPMENT_STATUS.DELIVERED]: [],
  [SHIPMENT_STATUS.CANCELED]: [],
});

export const isValidShipmentStatus = (status) => {
  return Object.values(SHIPMENT_STATUS).includes(status);
};

export const canTransitionShipmentStatus = (currentStatus, nextStatus) => {
  if (currentStatus === nextStatus) {
    return true;
  }

  const allowedStatuses = ALLOWED_TRANSITIONS[currentStatus] || [];
  return allowedStatuses.includes(nextStatus);
};
