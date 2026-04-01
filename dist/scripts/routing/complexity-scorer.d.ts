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
export type DRDepth = 'lite' | 'standard' | 'deep';
/**
 * Determine DR depth based on complexity level.
 */
export declare function getDRDepth(level: ComplexityLevel): DRDepth;
/**
 * Determine if --deliberate mode should be auto-triggered.
 * Triggers on: (hasSecurity OR hasArchChange) AND score > 5
 */
export declare function shouldForceDeliberate(signals: ComplexitySignals, score: number): boolean;
/**
 * Get max consensus iterations based on complexity level.
 */
export declare function getMaxIterations(level: ComplexityLevel): number;
//# sourceMappingURL=complexity-scorer.d.ts.map