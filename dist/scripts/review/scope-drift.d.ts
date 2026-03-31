export interface DriftPlan {
    goals?: string[];
    scope?: string[];
}
export interface DriftDiff {
    files?: string[];
    summary?: string;
}
export interface DriftAnalysis {
    driftScore: number;
    inScope: string[];
    outOfScope: string[];
    missed: string[];
}
export interface ThreeWayContext {
    todosContent?: string;
    prDescription?: string;
    planContent?: string;
    changedFiles: string[];
    commitMessages: string[];
}
export interface ThreeWayResult {
    intent: string[];
    delivered: string[];
    scopeCreep: string[];
    missing: string[];
    verdict: string;
}
/**
 * Analyze scope drift between plan and actual changes.
 */
export declare function analyzeDrift(plan: DriftPlan | null, diff: DriftDiff | null): DriftAnalysis;
/**
 * Format drift analysis for display.
 */
export declare function formatDrift(analysis: DriftAnalysis): string;
/**
 * Three-way scope comparison.
 * Compares: stated intent (TODOS/PR) vs plan file vs actual diff.
 */
export declare function threeWayComparison(context: ThreeWayContext): ThreeWayResult;
/**
 * Format three-way comparison for display.
 */
export declare function formatThreeWay(result: ThreeWayResult): string;
//# sourceMappingURL=scope-drift.d.ts.map