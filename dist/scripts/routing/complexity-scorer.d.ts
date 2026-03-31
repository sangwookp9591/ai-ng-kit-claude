/**
 * aing Complexity Scorer (Innovation #3 — Adaptive Routing)
 * Estimates task complexity to route to optimal model tier.
 * @module scripts/routing/complexity-scorer
 */
export interface ComplexitySignals {
    fileCount?: number;
    lineCount?: number;
    domainCount?: number;
    hasTests?: boolean;
    hasArchChange?: boolean;
    hasSecurity?: boolean;
}
export type ComplexityLevel = 'low' | 'mid' | 'high';
export interface ComplexityResult {
    score: number;
    level: ComplexityLevel;
    breakdown: Record<string, number>;
}
/**
 * Score task complexity based on observable signals.
 */
export declare function scoreComplexity(signals?: ComplexitySignals): ComplexityResult;
//# sourceMappingURL=complexity-scorer.d.ts.map