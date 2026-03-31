interface Mutation {
    file: string;
    action: 'create' | 'edit' | 'delete';
    agent: string;
    ts: string;
}
/**
 * Record a file mutation for audit.
 */
export declare function recordMutation(filePath: string, action: 'create' | 'edit' | 'delete', agent: string, projectDir?: string): void;
/**
 * Get recent mutations.
 */
export declare function getRecentMutations(limit?: number, projectDir?: string): Mutation[];
/**
 * Format mutation audit for display.
 */
export declare function formatMutationAudit(mutations: Mutation[]): string;
export {};
//# sourceMappingURL=mutation-guard.d.ts.map