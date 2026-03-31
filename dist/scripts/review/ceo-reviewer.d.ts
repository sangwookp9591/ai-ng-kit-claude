export interface CEOCheck {
    id: string;
    name: string;
    question: string;
}
export interface CEOReviewContext {
    feature: string;
    planSummary?: string;
    diffSummary?: string;
    branch?: string;
}
export interface CEOReviewResult {
    recommendation: 'APPROVE' | 'DEFER' | 'KILL';
    scores?: Record<string, number>;
    concerns?: string[];
}
/**
 * CEO review focus areas.
 */
export declare const CEO_CHECKS: CEOCheck[];
/**
 * Build CEO review prompt for Simon agent.
 */
export declare function buildCEOReviewPrompt(context: CEOReviewContext): string;
/**
 * Record CEO review result.
 */
export declare function recordCEOReview(result: CEOReviewResult, projectDir?: string): void;
//# sourceMappingURL=ceo-reviewer.d.ts.map