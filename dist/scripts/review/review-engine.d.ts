export interface ReviewFinding {
    type: string;
    severity: string;
    description: string;
    file: string;
    line: number;
    classification?: 'auto-fix' | 'ask';
}
export interface ReviewAgentConfig {
    agents: string[];
    focus: string[];
    description: string;
}
export interface ReviewResult {
    status?: string;
    issues_found?: number;
    critical_gaps?: number;
    unresolved?: number;
    mode?: string;
}
export interface ReviewPromptContext {
    feature?: string;
    branch?: string;
    diffSummary?: string;
    planPath?: string;
}
export interface TierOptions {
    hasUI?: boolean;
    hasProductChange?: boolean;
}
/**
 * Review passes (two-pass review system).
 * Pass 1: CRITICAL (blocks ship)
 * Pass 2: INFORMATIONAL (quality improvement)
 */
export declare const REVIEW_PASSES: Record<string, string[]>;
/**
 * Fix-First Heuristic: classify findings as AUTO-FIX or ASK.
 * AUTO-FIX: safe to apply directly (dead code, stale comments, formatting)
 * ASK: needs user judgment (architecture, behavior changes, trade-offs)
 */
export declare function classifyFinding(finding: ReviewFinding): 'auto-fix' | 'ask';
/**
 * Format review results.
 */
export declare function formatReviewResults(findings: ReviewFinding[]): string;
/**
 * Agent assignments per review tier.
 */
export declare const REVIEW_AGENTS: Record<string, ReviewAgentConfig>;
/**
 * Determine which review tiers to run based on complexity.
 */
export declare function selectTiers(complexityLevel: 'low' | 'mid' | 'high', options?: TierOptions): string[];
/**
 * Get the agent prompt context for a specific review tier.
 */
export declare function getReviewPrompt(tier: string, context: ReviewPromptContext): string;
/**
 * Record a completed review.
 */
export declare function recordReview(tier: string, result: ReviewResult, projectDir?: string): void;
//# sourceMappingURL=review-engine.d.ts.map