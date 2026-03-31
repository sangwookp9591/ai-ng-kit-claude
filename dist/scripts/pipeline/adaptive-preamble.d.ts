/**
 * aing Adaptive Preamble Selector (Phase 4 — 200% Differentiator)
 *
 * Automatically selects preamble tier based on complexity score.
 * Adaptive context sizing per agent based on complexity scoring.
 *
 * @module scripts/pipeline/adaptive-preamble
 */
type TaskType = 'explore' | 'implement' | 'plan' | 'review' | 'verify';
interface TokenSavings {
    actual: number;
    max: number;
    saved: number;
    savingsPercent: number;
}
interface AgentTierEntry {
    tier: number;
}
/**
 * Select preamble tier based on task complexity.
 */
export declare function selectPreambleTier(complexityScore: number, taskType: TaskType): number;
/**
 * Get estimated token savings from adaptive tiering vs always-T4.
 */
export declare function estimateTokenSavings(agents: AgentTierEntry[]): TokenSavings;
/**
 * Format token savings report for display.
 */
export declare function formatSavingsReport(savings: TokenSavings): string;
export {};
//# sourceMappingURL=adaptive-preamble.d.ts.map