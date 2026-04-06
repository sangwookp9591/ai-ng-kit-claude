/**
 * aing Quality Gate — Automated quality standards enforcement for AING-DR plans.
 * Measures evidence coverage, criteria testability, constraint compliance.
 * Called before persist to ensure hard gates are met.
 * @module scripts/hooks/quality-gate
 */
export interface QualityMetrics {
    evidenceCoverage: number;
    criteriaTestability: number;
    constraintCompliance: number;
    fragileUnaddressed: number;
    ignoredSteelman: number;
}
export interface QualityResult {
    pass: boolean;
    metrics: QualityMetrics;
    failures: string[];
}
/**
 * Measure evidence coverage: % of technical claims that cite file:line.
 */
export declare function measureEvidenceCoverage(planText: string): number;
/**
 * Measure criteria testability: % of acceptance criteria that are objectively verifiable.
 */
export declare function measureCriteriaTestability(planText: string): number;
/**
 * Measure constraint compliance from FINAL_PLAN JSON.
 */
export declare function measureConstraintCompliance(planJson: Record<string, unknown>): number;
/**
 * Count FRAGILE assumptions not addressed in plan.
 */
export declare function countFragileUnaddressed(criticOutput: string): number;
/**
 * Count IGNORED steelman points from Noa's output.
 */
export declare function countIgnoredSteelman(noaOutput: string): number;
/**
 * Run all quality checks against a plan.
 * Returns pass/fail with detailed metrics and failure reasons.
 */
export declare function checkQualityGate(planText: string, planJson: Record<string, unknown>, criticOutput: string, noaOutput: string): QualityResult;
//# sourceMappingURL=quality-gate.d.ts.map