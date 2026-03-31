/**
 * aing Cost Ceiling v0.5.0
 * Token usage limits, session time limits, API call limits.
 * Harness Engineering: Constrain axis — budget enforcement.
 * @module scripts/guardrail/cost-ceiling
 */
interface CostLimits {
    maxTokensPerSession: number;
    maxTokensPerTask: number;
    maxApiCallsPerSession: number;
    maxSessionMinutes: number;
    warningThreshold: number;
}
interface UsageResult {
    ok: boolean;
    usage: {
        tokens: string;
        apiCalls: number;
        sessionMinutes: number;
        taskTokens?: string;
    };
    warnings: string[];
}
/**
 * Load cost limits from config.
 */
export declare function loadLimits(_projectDir?: string): CostLimits;
/**
 * Initialize cost tracking for a session.
 */
export declare function initCostTracker(projectDir?: string): void;
/**
 * Record token usage and check against ceiling.
 */
export declare function recordUsage(tokens: number, taskName?: string, projectDir?: string): UsageResult;
/**
 * Get current cost status for display.
 */
export declare function formatCostStatus(projectDir?: string): string;
export {};
//# sourceMappingURL=cost-ceiling.d.ts.map