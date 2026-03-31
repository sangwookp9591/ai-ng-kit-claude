/**
 * aing Evidence-Based Completeness Scorer (Phase 4 — 200% Differentiator)
 *
 * Automatically calculates Completeness score from evidence artifacts.
 * Combines gstack's X/10 scoring with aing's evidence chain.
 *
 * @module scripts/evidence/completeness-scorer
 */
export interface GoalCondition {
    name: string;
    met: boolean;
}
export interface CompletenessEvidence {
    tests?: {
        passed: number;
        total: number;
    };
    build?: {
        success: boolean;
    };
    lint?: {
        errors: number;
    };
    goals?: {
        conditions: GoalCondition[];
    };
    edgeCases?: {
        handled: number;
    };
}
export type CompletenessVerdict = 'ACHIEVED' | 'COMPLETED BUT INCOMPLETE' | 'FAILED';
export interface CompletenessEvaluation {
    score: number;
    verdict: CompletenessVerdict;
    report: string;
}
/**
 * Calculate Completeness score (0-10) from evidence artifacts.
 *
 * Scoring breakdown:
 *   Tests:      0-3 points (pass ratio)
 *   Build:      0-2 points (success/fail)
 *   Lint:       0-1 point  (zero errors)
 *   Goals:      0-3 points (condition met ratio)
 *   Edge cases: 0-1 bonus  (any handled)
 */
export declare function calculateCompleteness(evidence: CompletenessEvidence): number;
/**
 * Get verdict from completeness score.
 */
export declare function getVerdict(score: number): CompletenessVerdict;
/**
 * Format completeness report section.
 */
export declare function formatCompletenessReport(score: number, evidence: CompletenessEvidence): string;
/**
 * Generate a full completeness evaluation from raw evidence.
 * Convenience wrapper combining calculation + formatting.
 */
export declare function evaluateCompleteness(evidence: CompletenessEvidence): CompletenessEvaluation;
//# sourceMappingURL=completeness-scorer.d.ts.map