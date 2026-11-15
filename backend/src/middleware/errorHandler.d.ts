import { Request, Response, NextFunction } from 'express';
export interface AppError extends Error {
    statusCode?: number;
    errors?: any[];
}
export declare const errorHandler: (err: AppError, req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=errorHandler.d.ts.map