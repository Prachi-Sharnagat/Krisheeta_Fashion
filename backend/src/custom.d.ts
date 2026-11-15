export {};

declare global {
  namespace Express {
    export interface Request {
      user?: {
        userId: string;
        companyId: string;
        role: string;
      };
      rawBody?: Buffer;
    }
  }
}
