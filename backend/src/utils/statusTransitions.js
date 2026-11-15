"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VALID_STATUS_TRANSITIONS = void 0;
exports.isValidStatusTransition = isValidStatusTransition;
exports.VALID_STATUS_TRANSITIONS = {
    SalesOrder: {
        DRAFT: ['CONFIRMED', 'CANCELLED'],
        CONFIRMED: ['IN_PRODUCTION', 'CANCELLED'],
        IN_PRODUCTION: ['READY_TO_SHIP', 'CANCELLED'],
        READY_TO_SHIP: ['COMPLETED', 'CANCELLED'],
        COMPLETED: [],
        CANCELLED: [],
    },
    ProductionOrder: {
        PLANNED: ['RELEASED', 'CANCELLED'],
        RELEASED: ['IN_PROGRESS', 'CANCELLED'],
        IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
        COMPLETED: [],
        CANCELLED: [],
    },
    PurchaseOrder: {
        DRAFT: ['SENT', 'CANCELLED'],
        SENT: ['PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'],
        PARTIALLY_RECEIVED: ['RECEIVED', 'CANCELLED'],
        RECEIVED: [],
        CANCELLED: [],
    },
    Shipment: {
        DRAFT: ['READY', 'CANCELLED'],
        READY: ['DISPATCHED', 'CANCELLED'],
        DISPATCHED: ['IN_TRANSIT', 'DELIVERED', 'CANCELLED'],
        IN_TRANSIT: ['DELIVERED', 'CANCELLED'],
        DELIVERED: [],
        CANCELLED: [],
    },
    Invoice: {
        DRAFT: ['ISSUED', 'CANCELLED'],
        ISSUED: ['PARTIALLY_PAID', 'PAID', 'CANCELLED'],
        PARTIALLY_PAID: ['PAID', 'CANCELLED'],
        PAID: [],
        CANCELLED: [],
    },
};
function isValidStatusTransition(entity, currentStatus, newStatus) {
    if (currentStatus === newStatus)
        return true;
    const allowed = exports.VALID_STATUS_TRANSITIONS[entity]?.[currentStatus];
    if (!allowed)
        return false;
    return allowed.includes(newStatus);
}
//# sourceMappingURL=statusTransitions.js.map