export declare const VALID_STATUS_TRANSITIONS: Record<string, Record<string, string[]>>;
export declare function isValidStatusTransition(entity: keyof typeof VALID_STATUS_TRANSITIONS, currentStatus: string, newStatus: string): boolean;
//# sourceMappingURL=statusTransitions.d.ts.map