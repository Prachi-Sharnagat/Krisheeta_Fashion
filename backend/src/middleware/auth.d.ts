import { Request, Response, NextFunction } from 'express';
export declare const authenticateUser: (req: Request, res: Response, next: NextFunction) => void;
export declare const authorizeRole: (...allowedRoles: string[]) => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map