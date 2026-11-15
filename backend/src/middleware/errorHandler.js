"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    // Log server errors for diagnostics (excluding sensitive fields)
    if (statusCode === 500) {
        console.error(`[SERVER ERROR] ${req.method} ${req.url}:`, err);
    }
    res.status(statusCode).json({
        success: false,
        message,
        errors: err.errors || [message],
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map