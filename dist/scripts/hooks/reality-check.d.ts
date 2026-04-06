/**
 * aing Reality Check — Judgment layer for feedback violation and autonomy risk detection.
 * Detects when agents repeatedly violate past feedback or exceed autonomy boundaries.
 * Called from post-tool-use on Agent/Task completion. Pre-tool-use only reads the flag.
 * @module scripts/hooks/reality-check
 */
export declare const REALITY_CHECK_TYPES: {
    readonly FEEDBACK_VIOLATION: "feedback-violation";
    readonly AUTONOMY_RISK: "autonomy-risk";
    readonly DESTRUCTIVE_UNCONFIRMED: "destructive-unconfirmed";
    readonly RECURRENT_DENIAL: "recurrent-denial";
};
export type RealityCheckType = (typeof REALITY_CHECK_TYPES)[keyof typeof REALITY_CHECK_TYPES];
export interface RealityCheckContext {
    toolInput?: Record<string, unknown>;
    agentResponse?: string;
    sessionId?: string;
    projectDir: string;
}
export interface RealityCheckRule {
    id: string;
    scenario: RealityCheckType;
    check: (ctx: RealityCheckContext) => boolean;
    triggerThreshold: number;
    escalationType: 'block' | 'warn';
}
export interface RealityCheckResult {
    scenario: RealityCheckType;
    verdict: 'block' | 'warn' | 'pass';
    escalationType: 'block' | 'warn';
    evidence: string;
}
export interface FeedbackEntry {
    timestamp: string;
    keyword: string;
    toolInput: string;
    overlapScore: number;
    isFalsePositive?: boolean;
}
export interface RealityCheckFlag {
    active: boolean;
    scenario: string;
    createdAt: string;
    sessionId: string;
}
/**
 * Record a feedback entry to JSONL with MAX_FEEDBACK_ENTRIES cap.
 */
export declare function recordFeedback(entry: FeedbackEntry, projectDir: string): void;
/**
 * Check if the current tool input repeats a past feedback violation.
 * Level 1: exact keyword match.
 * Level 2: normalized keyword overlap >= 0.7.
 */
export declare function checkFeedbackViolation(toolInput: Record<string, unknown>, projectDir: string): {
    violated: boolean;
    evidence: string;
    overlapScore: number;
};
export declare const REALITY_CHECK_RULES: RealityCheckRule[];
/**
 * Check for autonomy risk based on 3 criteria.
 * Returns the first matching rule result or null if all pass.
 */
export declare function checkAutonomyRisk(agentResponse: string, projectDir: string): {
    riskDetected: boolean;
    ruleId: string;
    evidence: string;
    escalationType: 'block' | 'warn';
} | null;
/**
 * Write reality-check block flag for indirect pre-tool-use blocking.
 */
export declare function writeRealityCheckFlag(scenario: string, sessionId: string, projectDir: string): void;
/**
 * Clear the reality-check flag (called on session stop).
 */
export declare function clearRealityCheckFlag(projectDir: string): void;
/**
 * Read the current reality-check flag. Returns null if not active.
 */
export declare function readRealityCheckFlag(projectDir: string): RealityCheckFlag | null;
/**
 * Run all reality checks. Returns results with verdict for each triggered check.
 * Called from post-tool-use on Agent/Task completion.
 */
export declare function runRealityCheck(context: RealityCheckContext): RealityCheckResult[];
//# sourceMappingURL=reality-check.d.ts.map