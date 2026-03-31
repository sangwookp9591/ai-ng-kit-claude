/**
 * aing Routing History (Innovation #3 — Adaptive Routing)
 * Tracks routing decisions and outcomes for future optimization.
 * @module scripts/routing/routing-history
 */
interface RoutingEntry {
    agent: string;
    model: string;
    intent: string;
    complexity: object;
    outcome: 'success' | 'fail';
}
interface SuccessRate {
    total: number;
    success: number;
    rate: number;
}
/**
 * Record a routing decision and its outcome.
 */
export declare function recordRouting(entry: RoutingEntry, projectDir?: string): {
    ok: boolean;
    error?: string;
};
/**
 * Get success rate for a model/agent combination.
 */
export declare function getSuccessRate(model: string, agent?: string, projectDir?: string): SuccessRate;
export {};
//# sourceMappingURL=routing-history.d.ts.map