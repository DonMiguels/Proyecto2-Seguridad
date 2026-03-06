import {
  SHIPMENT_ALLOWED_TRANSITIONS,
  SHIPMENT_STATUS,
  SHIPMENT_STATUS_VALUES,
} from '../../shared/config/shipment-status.config.js';

export { SHIPMENT_STATUS };

export const isValidShipmentStatus = (status) => {
  return SHIPMENT_STATUS_VALUES.includes(status);
};

export const canTransitionShipmentStatus = (currentStatus, nextStatus) => {
  if (currentStatus === nextStatus) {
    return true;
  }

  const allowedStatuses = SHIPMENT_ALLOWED_TRANSITIONS[currentStatus] || [];
  return allowedStatuses.includes(nextStatus);
};
